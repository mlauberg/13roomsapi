import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register } from '../controllers/auth.controller';

const router = Router();

// Strict rate limiting for authentication endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per window
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count successful requests too
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
