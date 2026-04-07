export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    return new ApiError(400, "BAD_REQUEST", message, details);
  }

  static validationError(details: Array<{ field: string; message: string }>) {
    return new ApiError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      details,
    );
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, "FORBIDDEN", message);
  }

  static notFound(resource: string) {
    return new ApiError(404, "NOT_FOUND", `${resource} not found`);
  }

  static conflict(message: string) {
    return new ApiError(409, "CONFLICT", message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, "INTERNAL_SERVER_ERROR", message);
  }
}
