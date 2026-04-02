import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/response';
import {
  registerTenantSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/schemas';

export async function registerTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = registerTenantSchema.parse(req.body);

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: body.tenantSlug },
    });
    if (existingTenant) throw ApiError.conflict('Tenant slug already taken');

    const passwordHash = await bcrypt.hash(body.password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.tenantName,
        slug: body.tenantSlug,
        users: {
          create: {
            email: body.email,
            passwordHash,
            firstName: body.firstName,
            lastName: body.lastName,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const owner = tenant.users[0];
    const accessToken = signAccessToken({
      userId: owner.id,
      tenantId: tenant.id,
      role: owner.role,
      email: owner.email,
    });

    const tokenId = uuidv4();
    const refreshToken = signRefreshToken({
      userId: owner.id,
      tenantId: tenant.id,
      tokenId,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: owner.id, expiresAt },
    });

    sendSuccess(
      res,
      {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
        user: {
          id: owner.id,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          role: owner.role,
        },
        tokens: { accessToken, refreshToken },
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({
      where: { slug: body.tenantSlug },
    });
    if (!tenant || !tenant.isActive) throw ApiError.unauthorized('Invalid credentials');

    const user = await prisma.user.findFirst({
      where: { email: body.email, tenantId: tenant.id, isActive: true },
    });
    if (!user) throw ApiError.unauthorized('Invalid credentials');

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid credentials');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    const tokenId = uuidv4();
    const refreshToken = signRefreshToken({
      userId: user.id,
      tenantId: tenant.id,
      tokenId,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshTokens(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw ApiError.unauthorized('Invalid refresh token');
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = signAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: stored.user.role,
      email: stored.user.email,
    });

    const tokenId = uuidv4();
    const newRefreshToken = signRefreshToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      tokenId,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: payload.userId, expiresAt },
    });

    sendSuccess(res, {
      tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}
