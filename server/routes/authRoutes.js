import { Router } from 'express';
import { login, me, refresh, invalidate, requireAuth } from '../controllers/authController.js';

const router = Router();
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/refresh', requireAuth, refresh);
router.post('/logout', requireAuth, invalidate);

export default router;
