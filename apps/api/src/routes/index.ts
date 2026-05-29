/**
 * AiRefCheck - Route Registration
 * Combines all module routes under /api/v1 prefix.
 */

import { FastifyInstance } from "fastify";
import { authRoutes } from "../modules/auth/auth.routes";
import { documentRoutes } from "../modules/documents/document.routes";
import { analysisRoutes } from "../modules/analyses/analysis.routes";
import { reportRoutes } from "../modules/reports/report.routes";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export async function registerRoutes(fastify: FastifyInstance) {
  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message, details: error.details },
      });
    }

    // Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: error.message },
      });
    }

    logger.error(`Unhandled error: ${error.message}`, { stack: error.stack });
    return reply.status(500).send({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Sunucu hatası" },
    });
  });

  // Health check
  fastify.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
  }));

  // API v1 routes
  fastify.register(authRoutes, { prefix: "/api/v1/auth" });
  fastify.register(documentRoutes, { prefix: "/api/v1/documents" });
  fastify.register(analysisRoutes, { prefix: "/api/v1/analyses" });
  fastify.register(reportRoutes, { prefix: "/api/v1/reports" });
}
