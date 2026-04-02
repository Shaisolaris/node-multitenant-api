import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { createApiKeySchema } from '../validators/schemas';

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}

export async function listApiKeys(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId: req.tenantId as string, isActive: true },
      select: { id: true, name: true, keyPrefix: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, keys);
  } catch (err) { next(err); }
}

export async function createApiKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createApiKeySchema.parse(req.body);
    const { raw, hash, prefix } = generateApiKey();
    const key = await prisma.apiKey.create({
      data: {
        name: body.name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: body.permissions,
        tenantId: req.tenantId as string,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
      select: { id: true, name: true, keyPrefix: true, permissions: true, expiresAt: true, createdAt: true },
    });
    sendSuccess(res, { ...key, key: raw }, 201);
  } catch (err) { next(err); }
}

export async function revokeApiKey(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const keyId = req.params['keyId'] as string;
    const tenantId = req.tenantId as string;
    const existing = await prisma.apiKey.findFirst({ where: { id: keyId, tenantId } });
    if (!existing) throw ApiError.notFound('API key');
    await prisma.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
    sendSuccess(res, { message: 'API key revoked' });
  } catch (err) { next(err); }
}

export async function verifyApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { key } = req.body as { key?: string };
    if (!key) throw ApiError.badRequest('Key required');
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.slice(0, 8);
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash: hash, keyPrefix: prefix, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, name: true, permissions: true, tenantId: true, expiresAt: true },
    });
    if (!apiKey) throw ApiError.unauthorized('Invalid or expired API key');
    sendSuccess(res, { valid: true, tenantId: apiKey.tenantId, permissions: apiKey.permissions, expiresAt: apiKey.expiresAt });
  } catch (err) { next(err); }
}
