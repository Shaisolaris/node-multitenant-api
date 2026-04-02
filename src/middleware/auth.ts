import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
  tenantId?: string;
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Bearer token required'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    req.tenantId = payload.tenantId;
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role as Role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

export async function authenticateApiKey(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) return next(ApiError.unauthorized('API key required'));

  const prefix = apiKey.slice(0, 8);
  const crypto = await import('crypto');
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const key = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      keyPrefix: prefix,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: { tenant: true },
  });

  if (!key) return next(ApiError.unauthorized('Invalid API key'));

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  req.tenantId = key.tenantId;
  next();
}
