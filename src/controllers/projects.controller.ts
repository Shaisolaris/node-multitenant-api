import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess, buildPaginationMeta } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema, paginationSchema } from '../validators/schemas';

export async function listProjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const tenantId = req.tenantId as string;
    const skip = (page - 1) * limit;
    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({ where: { tenantId, status: { not: 'DELETED' } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.project.count({ where: { tenantId, status: { not: 'DELETED' } } }),
    ]);
    sendSuccess(res, projects, 200, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
}

export async function getProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params['projectId'] as string;
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: req.tenantId as string, status: { not: 'DELETED' } },
    });
    if (!project) throw ApiError.notFound('Project');
    sendSuccess(res, project);
  } catch (err) { next(err); }
}

export async function createProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createProjectSchema.parse(req.body);
    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
        tenantId: req.tenantId as string,
      },
    });
    sendSuccess(res, project, 201);
  } catch (err) { next(err); }
}

export async function updateProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params['projectId'] as string;
    const body = updateProjectSchema.parse(req.body);
    const tenantId = req.tenantId as string;
    const existing = await prisma.project.findFirst({ where: { id: projectId, tenantId, status: { not: 'DELETED' } } });
    if (!existing) throw ApiError.notFound('Project');
    const updateData: Prisma.ProjectUpdateInput = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.metadata !== undefined && { metadata: body.metadata as Prisma.InputJsonValue }),
    };
    const updated = await prisma.project.update({ where: { id: projectId }, data: updateData });
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deleteProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params['projectId'] as string;
    const tenantId = req.tenantId as string;
    const existing = await prisma.project.findFirst({ where: { id: projectId, tenantId, status: { not: 'DELETED' } } });
    if (!existing) throw ApiError.notFound('Project');
    await prisma.project.update({ where: { id: projectId }, data: { status: 'DELETED' } });
    sendSuccess(res, { message: 'Project deleted' });
  } catch (err) { next(err); }
}
