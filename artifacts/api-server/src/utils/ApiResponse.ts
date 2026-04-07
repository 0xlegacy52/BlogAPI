export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function successResponse<T>(
  data: T,
  message: string,
  meta?: PaginationMeta,
) {
  return {
    success: true as const,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function errorResponse(
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
) {
  return {
    success: false as const,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}
