/**
 * AiRefCheck - Analysis Routes
 */

import { FastifyInstance } from "fastify";
import { AnalysisService } from "./analysis.service";
import { authMiddleware } from "../../middleware/auth";
import { z } from "zod";

const createSchema = z.object({ documentId: z.string().uuid() });

export async function analysisRoutes(fastify: FastifyInstance) {
  const service = new AnalysisService(fastify.prisma, fastify.redis);

  fastify.post("/", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const { documentId } = createSchema.parse(request.body);
      const userId = (request as any).user.userId;
      const analysis = await service.create(documentId, userId);
      return reply.status(201).send({ success: true, data: analysis });
    },
  });

  fastify.get("/", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const userId = (request as any).user.userId;
      const page = Number((request.query as any).page) || 1;
      const limit = Number((request.query as any).limit) || 20;
      const result = await service.listByUser(userId, page, limit);
      return reply.send({ success: true, data: result.analyses, meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
    },
  });

  fastify.get("/:id", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const analysis = await service.getById((request.params as any).id);
      return reply.send({ success: true, data: analysis });
    },
  });

  fastify.get("/:id/summary", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const summary = await service.getSummary((request.params as any).id);
      return reply.send({ success: true, data: summary });
    },
  });

  fastify.get("/:id/references", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const id = (request.params as any).id;
      const page = Number((request.query as any).page) || 1;
      const limit = Number((request.query as any).limit) || 50;
      const status = (request.query as any).status;
      const result = await service.getReferences(id, page, limit, status);
      return reply.send({ success: true, data: result.references, meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
    },
  });
}
