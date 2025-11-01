import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { registerLimiter, authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply strict rate limiting to auth endpoints
router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
