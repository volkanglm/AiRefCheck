/**
 * AiRefCheck - Auth Middleware
 * JWT token verification for protected routes.
 * If no token is provided, auto-assigns the default admin user (no-login mode).
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "../lib/errors";
import { logger } from "../lib/logger";

const DEFAULT_USER_EMAIL = "admin@airefcheck.com";

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No-login mode: auto-assign default admin user
      const prisma = (request.server as any).prisma;
      const defaultUser = await prisma.user.findUnique({ where: { email: DEFAULT_USER_EMAIL } });

      if (defaultUser) {
        (request as any).user = {
          userId: defaultUser.id,
          email: defaultUser.email,
          role: defaultUser.role,
        };
        return;
      }

      // Fallback: use first user in the database
      const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (firstUser) {
        (request as any).user = {
          userId: firstUser.id,
          email: firstUser.email,
          role: firstUser.role,
        };
        return;
      }

      logger.warn("No users in database — cannot auto-assign default user");
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
