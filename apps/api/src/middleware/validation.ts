/**
 * AiRefCheck - Zod Validation Middleware
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";
import { ValidationError } from "../lib/errors";

export function validateBody(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      throw new ValidationError("Geçersiz veri", errors);
    }
    request.body = result.data;
  };
}

export function validateParams(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError("Geçersiz parametre", result.error.flatten().fieldErrors);
    }
    request.params = result.data as any;
  };
}
