import { Router, RequestHandler } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listProjects, getProject, createProject, updateProject, deleteProject } from '../controllers/projects.controller';

const router = Router();
router.use(authenticate);
router.get('/', listProjects as RequestHandler);
router.get('/:projectId', getProject as RequestHandler);
router.post('/', requireRole('OWNER', 'ADMIN', 'MEMBER'), createProject as RequestHandler);
router.patch('/:projectId', requireRole('OWNER', 'ADMIN', 'MEMBER'), updateProject as RequestHandler);
router.delete('/:projectId', requireRole('OWNER', 'ADMIN'), deleteProject as RequestHandler);
export default router;
