import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess, buildPaginationMeta } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { inviteUserSchema, updateUserRoleSchema, paginationSchema } from '../validators/schemas';

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const tenantId = req.tenantId as string;
    const skip = (page - 1) * limit;
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: { tenantId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { tenantId } }),
    ]);
    sendSuccess(res, users, 200, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params['userId'] as string;
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: req.tenantId as string },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw ApiError.notFound('User');
    sendSuccess(res, user);
  } catch (err) { next(err); }
}

export async function inviteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = inviteUserSchema.parse(req.body);
    const tenantId = req.tenantId as string;
    const existing = await prisma.user.findUnique({ where: { email_tenantId: { email: body.email, tenantId } } });
    if (existing) throw ApiError.conflict('User with this email already exists in tenant');
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, firstName: body.firstName, lastName: body.lastName, passwordHash, role: body.role, tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });
    sendSuccess(res, user, 201);
  } catch (err) { next(err); }
}

export async function updateUserRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role } = updateUserRoleSchema.parse(req.body);
    const userId = req.params['userId'] as string;
    const tenantId = req.tenantId as string;
    if (userId === req.user!.userId) throw ApiError.badRequest('Cannot change your own role');
    const target = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!target) throw ApiError.notFound('User');
    if (target.role === 'OWNER') throw ApiError.forbidden('Cannot change owner role');
    const updated = await prisma.user.update({ where: { id: userId }, data: { role }, select: { id: true, email: true, role: true } });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deactivateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params['userId'] as string;
    const tenantId = req.tenantId as string;
    if (userId === req.user!.userId) throw ApiError.badRequest('Cannot deactivate yourself');
    const target = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!target) throw ApiError.notFound('User');
    if (target.role === 'OWNER') throw ApiError.forbidden('Cannot deactivate owner');
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    sendSuccess(res, { message: 'User deactivated' });
  } catch (err) { next(err); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, role: true, lastLoginAt: true, createdAt: true,
        tenant: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
    if (!user) throw ApiError.notFound('User');
    sendSuccess(res, user);
  } catch (err) { next(err); }
}
