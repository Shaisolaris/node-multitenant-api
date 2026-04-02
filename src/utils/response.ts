import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: Record<string, unknown> = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown
): Response {
  const error: Record<string, unknown> = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(statusCode).json({ success: false, error });
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
