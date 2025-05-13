export class ServerError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ServerError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class ForbiddenError extends ServerError {
  constructor(message: string = "Access forbidden") {
    super(message, 403);
  }
}

export class BusinessRuleError extends ServerError { // Could be a 400 Bad Request or 409 Conflict
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode);
  }
}

export class ValidationError extends ServerError { // Specifically for input validation issues
    public readonly errors?: Record<string, string[]>; // Optional: for field-specific errors

    constructor(message: string = "Validation failed", errors?: Record<string, string[]>) {
        super(message, 422); // Unprocessable Entity
        this.errors = errors;
    }
}