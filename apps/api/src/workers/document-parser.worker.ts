/**
 * AiRefCheck - Document Parse Worker
 * Processes uploaded documents: extract text, send to NLP, save results.
 */

import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { readFile } from "fs/promises";
import path from "path";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

const prisma = new PrismaClient();

interface ParseJobData {
  analysisId: string;
  documentId: string;
}

export function startParseWorker() {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const worker = new Worker<ParseJobData>(
    "document-parse",
    async (job: Job<ParseJobData>) => {
      const { analysisId, documentId } = job.data;
      logger.info(`Parse job started: analysis=${analysisId}`);

      try {
        // Update status
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "EXTRACTING_REFERENCES", progress: 10, startedAt: new Date() } });

        // Read file
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) throw new Error(`Document not found: ${documentId}`);

        const filePath = path.join(env.UPLOAD_DIR, doc.storedName);
        const fileBuffer = await readFile(filePath);
        const rawText = fileBuffer.toString("utf-8");

        // Save raw text
        await prisma.document.update({ where: { id: documentId }, data: { rawText, status: "PARSED" } });
        await job.updateProgress(30);

        // Send to NLP service for parsing
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "DETECTING_STYLE", progress: 40 } });

        // Split raw text into reference-like chunks
        const refLines = rawText
          .split(/\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 20);

        // Call NLP service
        const nlpResponse = await axios.post(`${env.NLP_SERVICE_URL}/api/v1/parse`, {
          references: refLines.slice(0, 500),
        }, { timeout: 60000 });

        const { parsed_references, detected_style, style_confidence } = nlpResponse.data;
        await job.updateProgress(70);

        // Save parsed references to DB
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { detectedStyle: detected_style, styleConfidence: style_confidence, status: "VALIDATING", progress: 75, totalReferences: parsed_references.length },
        });

        for (let i = 0; i < parsed_references.length; i++) {
          const ref = parsed_references[i];
          await prisma.reference.create({
            data: {
              analysisId,
              orderIndex: i + 1,
              rawText: ref.raw_text,
              authors: ref.authors,
              year: ref.year,
              title: ref.title,
              journal: ref.journal,
              publisher: ref.publisher,
              volume: ref.volume,
              issue: ref.issue,
              pages: ref.pages,
              doi: ref.doi,
              url: ref.url,
              isbn: ref.isbn,
              refType: ref.type || "JOURNAL_ARTICLE",
              parseConfidence: ref.parse_confidence,
              status: "PENDING",
            },
          });
        }

        await job.updateProgress(90);
        logger.info(`Parse job completed: ${parsed_references.length} references extracted`);
      } catch (error: any) {
        logger.error(`Parse job failed: ${error.message}`);
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "FAILED", errorMessage: error.message },
        });
        throw error;
      }
    },
    { connection, concurrency: 5 }
  );

  worker.on("completed", (job) => logger.info(`Parse job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`Parse job ${job?.id} failed: ${err.message}`));

  logger.info("Document parse worker started");
  return worker;
}
