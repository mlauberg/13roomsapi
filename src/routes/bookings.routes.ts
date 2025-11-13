import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking, updateBooking, getBookingsByRoomId, checkBookingConflict, getMyBookings } from '../controllers/bookings.controller';
import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.middleware';
import { readLimiter, writeLimiter, checkConflictLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

/**
 * ════════════════════════════════════════════════════════════════════════════
 * BOOKINGS ROUTES - GRANULAR RATE LIMITING
 * ════════════════════════════════════════════════════════════════════════════
 *
 * GET routes: Use readLimiter (200 req/min) - High frequency, low risk
 * GET /check-conflict: Use checkConflictLimiter (100 req/min) - Real-time validation
 * POST/PUT/DELETE routes: Use writeLimiter (100 req/15min) - Data modification
 */

// Admin-only read routes - Use lenient readLimiter
router.get('/', readLimiter, authenticate, requireAdmin, getAllBookings);

// Protected read routes (authenticated users only) - Must come before public routes to avoid route conflicts
router.get('/my-bookings', readLimiter, authenticate, getMyBookings);

// Protected write routes (authenticated users only)
router.put('/:id', writeLimiter, authenticate, updateBooking);
router.delete('/:id', writeLimiter, authenticate, deleteBooking);

// Public read routes (accessible to guests) - Use authenticateOptional for privacy anonymization
// Special case: conflict check uses ultra-lenient limiter for real-time form validation
router.get('/check-conflict/:roomId', checkConflictLimiter, authenticateOptional, checkBookingConflict);
router.get('/room/:roomId', readLimiter, authenticateOptional, getBookingsByRoomId);

// Optional authentication write route - allows both authenticated users and guests
router.post('/', writeLimiter, authenticateOptional, createBooking);

export default router;
