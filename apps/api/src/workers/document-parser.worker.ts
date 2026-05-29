/**
 * AiRefCheck - Document Parse Worker
 * Processes uploaded documents: extract text, send to NLP, save results.
 * Supports PDF, DOCX, TXT, LaTeX, BibTeX formats.
 */

import { Worker, Job, Queue } from "bullmq";
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

/**
 * Map NLP type strings to Prisma ReferenceType enum values.
 */
const TYPE_MAP: Record<string, string> = {
  "journal_article": "JOURNAL_ARTICLE",
  "journal": "JOURNAL_ARTICLE",
  "article": "JOURNAL_ARTICLE",
  "book_chapter": "BOOK_CHAPTER",
  "chapter": "BOOK_CHAPTER",
  "book": "BOOK",
  "conference_paper": "CONFERENCE_PAPER",
  "conference": "CONFERENCE_PAPER",
  "proceedings": "CONFERENCE_PAPER",
  "thesis": "THESIS",
  "master_thesis": "THESIS",
  "phd_thesis": "DISSERTATION",
  "dissertation": "DISSERTATION",
  "technical_report": "TECHNICAL_REPORT",
  "report": "TECHNICAL_REPORT",
  "web_page": "WEB_PAGE",
  "web": "WEB_PAGE",
  "online_resource": "ONLINE_RESOURCE",
  "website": "ONLINE_RESOURCE",
  "newspaper_article": "NEWSPAPER_ARTICLE",
  "newspaper": "NEWSPAPER_ARTICLE",
  "preprint": "PREPRINT",
  "dataset": "DATASET",
  "software": "SOFTWARE",
  "legal_document": "LEGAL_DOCUMENT",
  "other": "OTHER",
  "unknown": "OTHER",
};

function mapRefType(nlpType: string | null | undefined): string {
  if (!nlpType) return "JOURNAL_ARTICLE";
  const mapped = TYPE_MAP[nlpType.toLowerCase().trim()];
  return mapped || "OTHER";
}

/**
 * Extract text from various document formats.
 */
async function extractText(filePath: string, format: string): Promise<string> {
  const buffer = await readFile(filePath);

  switch (format) {
    case "PDF": {
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    }
    case "DOCX": {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case "TXT":
    case "LATEX":
    case "BIBTEX":
    case "RIS":
      return buffer.toString("utf-8");
    default:
      // Fallback: try as text
      return buffer.toString("utf-8");
  }
}

/**
 * Find the bibliography/references section in extracted text.
 * Looks for common section headers in Turkish and English.
 */
function extractBibliographySection(fullText: string): string[] {
  const patterns = [
    /(?:^|\n)\s*(?:kaynakça|kaynaklar|referanslar|kullanılan kaynaklar|bibliyografya)\s*\n/i,
    /(?:^|\n)\s*(?:references|bibliography|works cited|literatur(?:e|verzeichnis))\s*\n/i,
    /(?:^|\n)\s*(?:kaynak(?:ça|lar))\s*(?:\n|$)/i,
    /(?:^|\n)\s*\d*\.?\s*(?:references|bibliography)\s*(?:\n|$)/i,
  ];

  let startIndex = -1;
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match && match.index !== undefined) {
      startIndex = match.index + match[0].length;
      break;
    }
  }

  // If no bibliography section found, use the last 40% of the document
  if (startIndex === -1) {
    const lines = fullText.split("\n");
    const cutPoint = Math.floor(lines.length * 0.6);
    const tailLines = lines.slice(cutPoint);
    return tailLines
      .map((l) => l.trim())
      .filter((l) => l.length > 20);
  }

  const bibText = fullText.substring(startIndex);
  return bibText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 15);
}

export function startParseWorker() {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const worker = new Worker<ParseJobData>(
    "document-parse",
    async (job: Job<ParseJobData>) => {
      const { analysisId, documentId } = job.data;
      logger.info(`Parse job started: analysis=${analysisId}, document=${documentId}`);

      try {
        // Update status
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "EXTRACTING_REFERENCES", progress: 10, startedAt: new Date() },
        });
        await job.updateProgress(10);

        // Get document metadata
        const doc = await prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) throw new Error(`Document not found: ${documentId}`);

        // Extract text from file
        const filePath = path.join(env.UPLOAD_DIR, doc.storedName);
        logger.info(`Extracting text from: ${filePath} (format: ${doc.format})`);

        const fullText = await extractText(filePath, doc.format);
        logger.info(`Text extracted: ${fullText.length} chars`);

        // Save raw text
        await prisma.document.update({
          where: { id: documentId },
          data: { rawText: fullText, status: "PARSED" },
        });
        await job.updateProgress(30);

        // Find bibliography section
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "DETECTING_STYLE", progress: 35 },
        });

        const refLines = extractBibliographySection(fullText);
        logger.info(`Found ${refLines.length} candidate reference lines`);

        if (refLines.length === 0) {
          throw new Error("Dokümanda referans/kaynakça bölümü bulunamadı");
        }

        await job.updateProgress(40);

        // Call NLP service for parsing
        const nlpResponse = await axios.post(
          `${env.NLP_SERVICE_URL}/api/v1/parse`,
          { references: refLines.slice(0, 500) },
          { timeout: 120000 },
        );

        const { parsed_references, detected_style, style_confidence } = nlpResponse.data;
        logger.info(`NLP parsed: ${parsed_references?.length || 0} refs, style=${detected_style}, conf=${style_confidence}`);
        await job.updateProgress(70);

        if (!parsed_references || parsed_references.length === 0) {
          throw new Error("Referans ayrıştırma başarısız — hiçbir referans bulunamadı");
        }

        // Save parsed references to DB
        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            detectedStyle: detected_style,
            styleConfidence: style_confidence,
            status: "VALIDATING",
            progress: 75,
            totalReferences: parsed_references.length,
          },
        });

        for (let i = 0; i < parsed_references.length; i++) {
          const ref = parsed_references[i];
          await prisma.reference.create({
            data: {
              analysisId,
              orderIndex: i + 1,
              rawText: ref.raw_text || "",
              authors: ref.authors || [],
              year: ref.year || null,
              title: ref.title || null,
              journal: ref.journal || null,
              publisher: ref.publisher || null,
              volume: ref.volume || null,
              issue: ref.issue || null,
              pages: ref.pages || null,
              doi: ref.doi || null,
              url: ref.url || null,
              isbn: ref.isbn || null,
              refType: mapRefType(ref.type),
              parseConfidence: ref.parse_confidence || null,
              status: "PENDING",
            },
          });
        }

        await job.updateProgress(90);

        // Queue validation job
        const validateQueue = new Queue("reference-validate", { connection: { connection: redis.duplicate() } });
        await validateQueue.add("validate", { analysisId }, {
          attempts: 2,
          backoff: { type: "exponential", delay: 5000 },
          timeout: 300000,
        });

        logger.info(`Parse job completed: ${parsed_references.length} references extracted, validation queued`);
      } catch (error: any) {
        logger.error(`Parse job failed: ${error.message}`, { stack: error.stack });
        await prisma.analysis.update({
          where: { id: analysisId },
          data: { status: "FAILED", errorMessage: error.message.substring(0, 500) },
        });
        throw error;
      }
    },
    { connection, concurrency: 3 },
  );

  const redis = connection;

  worker.on("completed", (job) => logger.info(`Parse job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`Parse job ${job?.id} failed: ${err.message}`));

  logger.info("Document parse worker started");
  return worker;
}
