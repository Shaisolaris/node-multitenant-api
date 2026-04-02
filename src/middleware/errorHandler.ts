import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';
import { ApiError } from '../utils/ApiError';
import { sendError } from '../utils/response';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue: ZodIssue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', details);
    return;
  }

  if (err.message?.includes('Unique constraint')) {
    sendError(res, 409, 'Resource already exists', 'CONFLICT');
    return;
  }

  console.error('[Unhandled Error]', err);
  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND');
}
