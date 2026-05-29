/**
 * AiRefCheck - Auth Routes
 */

import { FastifyInstance } from "fastify";
import { AuthService, registerSchema, loginSchema } from "./auth.service";
import { validateBody } from "../../middleware/validation";
import { authMiddleware } from "../../middleware/auth";
import { z } from "zod";

export async function authRoutes(fastify: FastifyInstance) {
  const service = new AuthService(fastify.prisma);

  fastify.post("/register", {
    preHandler: validateBody(registerSchema),
    handler: async (request, reply) => {
      const result = await service.register(request.body as any);
      return reply.status(201).send({ success: true, data: result });
    },
  });

  fastify.post("/login", {
    preHandler: validateBody(loginSchema),
    handler: async (request, reply) => {
      const result = await service.login(request.body as any);
      return reply.status(200).send({ success: true, data: result });
    },
  });

  fastify.post("/refresh", {
    handler: async (request, reply) => {
      const { refreshToken } = request.body as any;
      if (!refreshToken) return reply.status(400).send({ success: false, error: { code: "MISSING_TOKEN", message: "Refresh token gerekli" } });
      const tokens = await service.refreshToken(refreshToken);
      return reply.send({ success: true, data: tokens });
    },
  });

  fastify.get("/me", {
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const user = await service.getMe((request as any).user.userId);
      return reply.send({ success: true, data: user });
    },
  });
}
