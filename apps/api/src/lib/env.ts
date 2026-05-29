/**
 * AiRefCheck - Environment Configuration
 * Validates and exports environment variables with defaults.
 */

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_PORT: z.coerce.number().default(3001),
  APP_URL: z.string().default("http://localhost:3001"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE: z.coerce.number().default(104857600),
  FILE_RETENTION_DAYS: z.coerce.number().default(30),

  CROSSREF_API_URL: z.string().default("https://api.crossref.org"),
  CROSSREF_MAILTO: z.string().default(""),
  SEMANTIC_SCHOLAR_API_URL: z.string().default("https://api.semanticscholar.org"),
  OPENALEX_API_URL: z.string().default("https://api.openalex.org"),
  NLP_SERVICE_URL: z.string().default("http://localhost:8000"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  API_CACHE_TTL: z.coerce.number().default(604800),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
