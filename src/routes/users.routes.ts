import { Router, RequestHandler } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listUsers, getUser, inviteUser, updateUserRole, deactivateUser, getMe } from '../controllers/users.controller';

const router = Router();
router.use(authenticate);
router.get('/me', getMe as RequestHandler);
router.get('/', requireRole('OWNER', 'ADMIN'), listUsers as RequestHandler);
router.get('/:userId', requireRole('OWNER', 'ADMIN'), getUser as RequestHandler);
router.post('/', requireRole('OWNER', 'ADMIN'), inviteUser as RequestHandler);
router.patch('/:userId/role', requireRole('OWNER', 'ADMIN'), updateUserRole as RequestHandler);
router.delete('/:userId', requireRole('OWNER', 'ADMIN'), deactivateUser as RequestHandler);
export default router;
