/**
 * AiRefCheck - Report Routes
 */

import { FastifyInstance } from "fastify";
import { ReportService } from "./report.service";
import { authMiddleware } from "../../middleware/auth";
import { z } from "zod";

const createSchema = z.object({
  analysisId: z.string().uuid(),
  format: z.enum(["pdf", "excel", "csv", "json"]),
  sections: z.array(z.string()).default(["summary", "details", "charts", "recommendations"]),
  includeLogo: z.boolean().default(false),
  logoUrl: z.string().url().optional(),
});

export async function reportRoutes(fastify: FastifyInstance) {
  const service = new ReportService(fastify.prisma);

  fastify.post("/", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const data = createSchema.parse(request.body);
      const report = await service.create(data.analysisId, data.format, data.sections, data.includeLogo, data.logoUrl);
      return reply.status(201).send({ success: true, data: report });
    },
  });

  fastify.get("/:id", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const report = await service.getById((request.params as any).id);
      return reply.send({ success: true, data: report });
    },
  });

  fastify.get("/:id/download", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const report = await service.getById((request.params as any).id);
      if (!report.fileUrl) return reply.status(404).send({ success: false, error: { code: "NOT_READY", message: "Rapor henüz hazır değil" } });
      return reply.send({ success: true, data: { downloadUrl: report.fileUrl } });
    },
  });

  fastify.post("/:id/share", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const report = await service.shareReport((request.params as any).id);
      return reply.send({ success: true, data: { shareToken: report.shareToken, shareUrl: `/api/v1/reports/shared/${report.shareToken}` } });
    },
  });

  fastify.get("/shared/:token", {
    handler: async (request, reply) => {
      const report = await service.getShared((request.params as any).token);
      return reply.send({ success: true, data: report });
    },
  });
}
