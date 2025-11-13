import express from 'express';
import { getActivityLogs } from '../controllers/logs.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { readLimiter } from '../middleware/rate-limiter.middleware';

const router = express.Router();

/**
 * ════════════════════════════════════════════════════════════════════════════
 * LOGS ROUTES - GRANULAR RATE LIMITING
 * ════════════════════════════════════════════════════════════════════════════
 *
 * GET routes: Use readLimiter (200 req/min) - Admin-only, read-heavy audit logs
 */

/**
 * @route GET /api/logs
 * @desc Get activity logs with pagination
 * @access Private (requires admin)
 */
router.get('/', readLimiter, authenticate, requireAdmin, getActivityLogs);

export default router;
