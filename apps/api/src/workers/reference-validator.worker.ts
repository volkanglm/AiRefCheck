/**
 * AiRefCheck - Reference Validation Worker
 * Validates each reference against external APIs.
 */

import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { ValidatorPipeline } from "../integrations/validator-pipeline";
import { env } from "../lib/env";
import { logger } from "../lib/logger";

const prisma = new PrismaClient();

interface ValidateJobData {
  analysisId: string;
}

export function startValidationWorker() {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const pipeline = new ValidatorPipeline(connection as any);

  const worker = new Worker<ValidateJobData>(
    "reference-validate",
    async (job: Job<ValidateJobData>) => {
      const { analysisId } = job.data;
      logger.info(`Validation job started: analysis=${analysisId}`);

      try {
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "VALIDATING" } });

        // Get all pending references
        const references = await prisma.reference.findMany({
          where: { analysisId, status: "PENDING" },
          orderBy: { orderIndex: "asc" },
        });

        let verified = 0, suspicious = 0, notFound = 0, partial = 0;

        for (let i = 0; i < references.length; i++) {
          const ref = references[i];
          const progress = Math.round(((i + 1) / references.length) * 100);

          try {
            const result = await pipeline.validate({
              doi: ref.doi,
              title: ref.title,
              year: ref.year,
              authors: ref.authors as any[],
              journal: ref.journal,
              rawText: ref.rawText,
            });

            // Save validations
            for (const src of result.sources) {
              await prisma.validation.create({
                data: {
                  referenceId: ref.id,
                  source: src.source,
                  status: src.status === "found" ? "FOUND" : src.status === "partial_match" ? "PARTIAL_MATCH" : src.status === "error" ? "ERROR" : "NOT_FOUND",
                  confidenceScore: src.confidenceScore,
                  sourceUrl: src.sourceUrl,
                  sourceId: src.sourceId,
                  matchedTitle: src.matchedTitle,
                  matchedAuthors: src.matchedAuthors as any,
                  matchedYear: src.matchedYear,
                  matchedDoi: src.matchedDoi,
                  metadata: src.metadata as any,
                  responseTimeMs: src.responseTimeMs,
                  fromCache: src.fromCache,
                },
              });
            }

            // Update reference status
            const refStatus = result.status === "verified" ? "VERIFIED" : result.status === "suspicious" ? "SUSPICIOUS" : result.status === "not_found" ? "NOT_FOUND" : "PARTIAL_MATCH";
            if (result.status === "verified") verified++;
            else if (result.status === "suspicious") suspicious++;
            else if (result.status === "not_found") notFound++;
            else partial++;

            await prisma.reference.update({
              where: { id: ref.id },
              data: {
                status: refStatus,
                confidenceScore: result.confidenceScore,
                bestMatchUrl: result.bestMatchUrl,
                bestMatchSource: result.bestMatchSource,
              },
            });
          } catch (err: any) {
            logger.error(`Failed to validate ref ${ref.id}: ${err.message}`);
          }

          await prisma.analysis.update({ where: { id: analysisId }, data: { progress } });
        }

        // Calculate overall score
        const total = references.length;
        const overallScore = total > 0 ? Math.round((verified * 100 + partial * 50) / total) : 0;

        await prisma.analysis.update({
          where: { id: analysisId },
          data: {
            status: "COMPLETED",
            progress: 100,
            completedAt: new Date(),
            verifiedCount: verified,
            suspiciousCount: suspicious,
            notFoundCount: notFound,
            partialMatchCount: partial,
            overallScore,
          },
        });

        logger.info(`Validation complete: ${verified}v/${suspicious}s/${notFound}nf/${partial}p, score=${overallScore}`);
      } catch (error: any) {
        logger.error(`Validation job failed: ${error.message}`);
        await prisma.analysis.update({ where: { id: analysisId }, data: { status: "FAILED", errorMessage: error.message } });
        throw error;
      }
    },
    { connection, concurrency: 3 }
  );

  worker.on("completed", (job) => logger.info(`Validation job ${job.id} completed`));
  worker.on("failed", (job, err) => logger.error(`Validation job ${job?.id} failed: ${err.message}`));

  logger.info("Reference validation worker started");
  return worker;
}
