import express from 'express';
import { getActivityLogs } from '../controllers/logs.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @route GET /api/logs
 * @desc Get activity logs with pagination
 * @access Private (requires admin)
 */
router.get('/', authenticate, requireAdmin, getActivityLogs);

export default router;
