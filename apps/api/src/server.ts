/**
 * AiRefCheck - Fastify API Server
 * Ana sunucu dosyası. CORS, Helmet, Rate Limit, Socket.io, Prisma, Redis entegrasyonları.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { Server as SocketIOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes";
import { env } from "./lib/env";

const prisma = new PrismaClient();
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

async function start() {
  const fastify = Fastify({
    logger: false,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
  });

  // Plugins
  await fastify.register(helmet, { global: true });
  await fastify.register(cors, {
    origin: [env.APP_URL, "http://localhost:3000", "tauri://localhost"],
    credentials: true,
  });
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });
  await fastify.register(multipart, {
    limits: { fileSize: env.MAX_FILE_SIZE },
  });

  // Decorate
  fastify.decorate("prisma", prisma);
  fastify.decorate("redis", redis);

  // Routes
  await registerRoutes(fastify);

  // Socket.io - use Fastify's underlying server
  const io = new SocketIOServer(fastify.server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on("join:analysis", (analysisId: string) => {
      socket.join(`analysis:${analysisId}`);
    });
    socket.on("leave:analysis", (analysisId: string) => {
      socket.leave(`analysis:${analysisId}`);
    });
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  fastify.decorate("io", io);

  // Start
  try {
    await fastify.ready();
    await fastify.listen({ port: env.APP_PORT, host: "0.0.0.0" });
    logger.info(`🚀 AiRefCheck API running on port ${env.APP_PORT}`);
    logger.info(`📡 Socket.io ready`);
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    io.close();
    await fastify.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start();

// Type augmentation for Fastify
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    io: SocketIOServer;
  }
}
