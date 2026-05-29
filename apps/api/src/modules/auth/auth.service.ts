/**
 * AiRefCheck - Auth Service
 * User registration, login, token management.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateTokenPair, verifyToken, TokenPayload } from "../../lib/jwt";
import { ConflictError, UnauthorizedError, NotFoundError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
  firstName: z.string().min(1, "Ad gerekli"),
  lastName: z.string().min(1, "Soyad gerekli"),
});

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre gerekli"),
});

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: z.infer<typeof registerSchema>) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError("Bu e-posta adresi zaten kayıtlı");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    const tokens = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    await this.prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    logger.info(`User registered: ${user.email}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(data: z.infer<typeof loginSchema>) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedError("Geçersiz e-posta veya şifre");

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Geçersiz e-posta veya şifre");

    const tokens = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    logger.info(`User logged in: ${user.email}`);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Geçersiz veya süresi dolmuş refresh token");
    }

    // Revoke old
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new NotFoundError("Kullanıcı");

    const tokens = await generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return tokens;
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("Kullanıcı");
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

export { registerSchema, loginSchema };
