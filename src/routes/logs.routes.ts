import express from 'express';
import { getActivityLogs } from '../controllers/logs.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { apiLimiter } from '../middleware/rate-limiter.middleware';

const router = express.Router();

/**
 * @route GET /api/logs
 * @desc Get activity logs with pagination
 * @access Private (requires admin)
 */
router.get('/', apiLimiter, authenticate, requireAdmin, getActivityLogs);

export default router;
