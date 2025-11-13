import { Router } from 'express';
import { getAllRooms, createRoom, updateRoom, deleteRoom, getRoomById, getAvailableRooms } from '../controllers/rooms.controller';
import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.middleware';
import { readLimiter, writeLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

/**
 * ════════════════════════════════════════════════════════════════════════════
 * ROOMS ROUTES - GRANULAR RATE LIMITING
 * ════════════════════════════════════════════════════════════════════════════
 *
 * GET routes: Use readLimiter (200 req/min) - High frequency, low risk
 * POST/PUT/DELETE routes: Use writeLimiter (100 req/15min) - Data modification
 */

// Public read routes - Use lenient readLimiter for heartbeat compatibility
// Use authenticateOptional for privacy anonymization
router.get('/', readLimiter, authenticateOptional, getAllRooms);

// PHASE 3: Smart Failure Recovery - Get available rooms for a time slot
// IMPORTANT: This must come BEFORE /:id route to avoid route matching conflicts
router.get('/available', readLimiter, getAvailableRooms);

router.get('/:id', readLimiter, getRoomById);

// Protected write routes (admin only) - Use stricter writeLimiter
router.post('/', writeLimiter, authenticate, requireAdmin, createRoom);
router.put('/:id', writeLimiter, authenticate, requireAdmin, updateRoom);
router.delete('/:id', writeLimiter, authenticate, requireAdmin, deleteRoom);

export default router;
