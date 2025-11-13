import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/users.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { readLimiter, writeLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

/**
 * ════════════════════════════════════════════════════════════════════════════
 * USERS ROUTES - GRANULAR RATE LIMITING
 * ════════════════════════════════════════════════════════════════════════════
 *
 * GET routes: Use readLimiter (200 req/min) - Admin-only, less frequent
 * POST/PUT/DELETE routes: Use writeLimiter (100 req/15min) - Data modification
 */

// All user management routes are admin-only
// Read routes - Use lenient readLimiter
router.get('/', readLimiter, authenticate, requireAdmin, getAllUsers);
router.get('/:id', readLimiter, authenticate, requireAdmin, getUserById);

// Write routes - Use stricter writeLimiter
router.post('/', writeLimiter, authenticate, requireAdmin, createUser);
router.put('/:id', writeLimiter, authenticate, requireAdmin, updateUser);
router.delete('/:id', writeLimiter, authenticate, requireAdmin, deleteUser);

export default router;
