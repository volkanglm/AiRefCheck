/**
 * AiRefCheck - Report Service
 * Report generation and management.
 */

import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";
import { NotFoundError } from "../../lib/errors";
import { logger } from "../../lib/logger";

export class ReportService {
  constructor(private prisma: PrismaClient) {}

  async create(analysisId: string, format: string, sections: string[], includeLogo = false, logoUrl?: string) {
    const existing = await this.prisma.report.findUnique({ where: { analysisId } });
    if (existing && existing.status === "COMPLETED") return existing;

    const report = await this.prisma.report.create({
      data: {
        analysisId,
        format: format as any,
        status: "PENDING",
        sections,
        includeLogo,
        logoUrl,
      },
    });

    logger.info(`Report created: ${report.id} for analysis ${analysisId}`);
    return report;
  }

  async getById(reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundError("Rapor", reportId);
    return report;
  }

  async getByAnalysis(analysisId: string) {
    const report = await this.prisma.report.findUnique({ where: { analysisId } });
    if (!report) throw new NotFoundError("Rapor", analysisId);
    return report;
  }

  async getShared(shareToken: string) {
    const report = await this.prisma.report.findUnique({ where: { shareToken } });
    if (!report) throw new NotFoundError("Rapor");
    if (report.shareExpiresAt && report.shareExpiresAt < new Date()) {
      throw new NotFoundError("Rapor (süresi dolmuş)");
    }
    return report;
  }

  async shareReport(reportId: string, expiresInDays = 30) {
    const token = uuid();
    return this.prisma.report.update({
      where: { id: reportId },
      data: { shareToken: token, shareExpiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) },
    });
  }
}
