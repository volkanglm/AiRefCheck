/**
 * AiRefCheck - Auth Middleware
 * JWT token verification for protected routes.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "../lib/errors";
import { logger } from "../lib/logger";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Token bulunamadı");
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    // Attach user info to request
    (request as any).user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    logger.warn(`Auth failed: ${error}`);
    throw new UnauthorizedError("Geçersiz veya süresi dolmuş token");
  }
}
