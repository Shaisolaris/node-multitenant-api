import { Router } from 'express';
import { registerTenant, login, refreshTokens, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerTenant);
router.post('/login', login);
router.post('/refresh', refreshTokens);
router.post('/logout', logout);

export default router;
