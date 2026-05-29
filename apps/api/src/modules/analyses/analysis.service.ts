/**
 * AiRefCheck - Analysis Service
 * Orchestrates reference analysis pipeline.
 */

import { PrismaClient } from "@prisma/client";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { logger } from "../../lib/logger";

export class AnalysisService {
  private parseQueue: Queue;
  private validateQueue: Queue;

  constructor(private prisma: PrismaClient, redis: Redis) {
    const connection = { connection: redis.duplicate() };
    this.parseQueue = new Queue("document-parse", connection);
    this.validateQueue = new Queue("reference-validate", connection);
  }

  async create(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc || doc.deletedAt) throw new NotFoundError("Doküman", documentId);
    if (doc.userId !== userId) throw new NotFoundError("Doküman", documentId);

    // Check if analysis already exists
    const existing = await this.prisma.analysis.findUnique({ where: { documentId } });
    if (existing && existing.status !== "FAILED") {
      // Return existing analysis instead of throwing error
      logger.info(`Returning existing analysis ${existing.id} for document ${documentId}`);
      return existing;
    }

    // If previous analysis failed, delete it and retry
    if (existing && existing.status === "FAILED") {
      logger.info(`Deleting failed analysis ${existing.id}, retrying...`);
      await this.prisma.reference.deleteMany({ where: { analysisId: existing.id } });
      await this.prisma.analysis.delete({ where: { id: existing.id } });
    }

    const analysis = await this.prisma.analysis.create({
      data: { documentId, status: "PENDING", progress: 0 },
    });

    // Queue parse job
    await this.parseQueue.add("parse", { analysisId: analysis.id, documentId }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      timeout: 120000,
    });

    logger.info(`Analysis created: ${analysis.id} for document ${documentId}`);
    return analysis;
  }

  async getById(analysisId: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      include: { references: { orderBy: { orderIndex: "asc" } }, summary: true },
    });
    if (!analysis) throw new NotFoundError("Analiz", analysisId);
    return analysis;
  }

  async getReferences(analysisId: string, page = 1, limit = 50, status?: string) {
    const where: any = { analysisId };
    if (status) where.status = status.toUpperCase();

    const [references, total] = await Promise.all([
      this.prisma.reference.findMany({ where, orderBy: { orderIndex: "asc" }, skip: (page - 1) * limit, take: limit, include: { validations: true } }),
      this.prisma.reference.count({ where }),
    ]);
    return { references, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getSummary(analysisId: string) {
    const summary = await this.prisma.analysisSummary.findUnique({ where: { analysisId } });
    if (!summary) throw new NotFoundError("Analiz özeti", analysisId);
    return summary;
  }

  async listByUser(userId: string, page = 1, limit = 20) {
    const [analyses, total] = await Promise.all([
      this.prisma.analysis.findMany({
        where: { document: { userId } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { document: { select: { originalName: true, format: true } } },
      }),
      this.prisma.analysis.count({ where: { document: { userId } } }),
    ]);
    return { analyses, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateProgress(analysisId: string, status: string, progress: number, extra?: any) {
    return this.prisma.analysis.update({
      where: { id: analysisId },
      data: { status: status as any, progress, ...extra },
    });
  }

  async completeAnalysis(analysisId: string, results: {
    totalReferences: number; verifiedCount: number; suspiciousCount: number;
    notFoundCount: number; partialMatchCount: number; missingCount: number;
    orphanCount: number; overallScore: number; detectedStyle?: string;
    styleConfidence?: number;
  }) {
    return this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
        ...results,
      },
    });
  }
}
