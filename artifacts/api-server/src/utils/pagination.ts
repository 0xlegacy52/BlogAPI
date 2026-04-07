export interface PaginationOptions {
  page?: number | string;
  limit?: number | string;
  maxLimit?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function getPagination(opts: PaginationOptions): PaginationResult {
  const maxLimit = opts.maxLimit ?? 100;
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(opts.limit) || 10));
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

export function getTotalPages(total: number, limit: number): number {
  return Math.ceil(total / limit);
}
