import { Router, RequestHandler } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listApiKeys, createApiKey, revokeApiKey, verifyApiKey } from '../controllers/apikeys.controller';

const router = Router();
router.post('/verify', verifyApiKey);
router.use(authenticate);
router.get('/', requireRole('OWNER', 'ADMIN'), listApiKeys as RequestHandler);
router.post('/', requireRole('OWNER', 'ADMIN'), createApiKey as RequestHandler);
router.delete('/:keyId', requireRole('OWNER', 'ADMIN'), revokeApiKey as RequestHandler);
export default router;
