/**
 * AiRefCheck - Custom Error Classes
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, "NOT_FOUND", `${resource}${id ? ` (${id})` : ""} bulunamadı`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Yetkilendirme gerekli") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Bu işlem için yetkiniz yok") {
    super(403, "FORBIDDEN", message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Çok fazla istek. Lütfen bekleyin.") {
    super(429, "RATE_LIMITED", message);
  }
}
