/**
 * AiRefCheck - Document Routes
 */

import { FastifyInstance } from "Fastify";
import { DocumentService } from "./document.service";
import { authMiddleware } from "../../middleware/auth";
import { z } from "zod";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export async function documentRoutes(fastify: FastifyInstance) {
  const service = new DocumentService(fastify.prisma);

  fastify.post("/upload", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const data = await request.file();
      if (!data) return reply.status(400).send({ success: false, error: { code: "NO_FILE", message: "Dosya bulunamadı" } });

      const buffer = await data.toBuffer();
      const userId = (request as any).user.userId;
      const doc = await service.upload(userId, {
        filename: data.filename,
        mimetype: data.mimetype,
        data: buffer,
      });
      return reply.status(201).send({ success: true, data: doc });
    },
  });

  fastify.get("/", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const query = listSchema.parse(request.query);
      const userId = (request as any).user.userId;
      const result = await service.list(userId, query.page, query.limit);
      return reply.send({ success: true, data: result.documents, meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
    },
  });

  fastify.get("/:id", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const userId = (request as any).user.userId;
      const doc = await service.getById(userId, (request.params as any).id);
      return reply.send({ success: true, data: doc });
    },
  });

  fastify.delete("/:id", {
    preHandler: [authMiddleware],
    handler: async (request, reply) => {
      const userId = (request as any).user.userId;
      await service.delete(userId, (request.params as any).id);
      return reply.send({ success: true });
    },
  });
}
