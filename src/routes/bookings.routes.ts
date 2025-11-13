import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking, updateBooking, getBookingsByRoomId, checkBookingConflict, getMyBookings } from '../controllers/bookings.controller';
import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.middleware';
import { apiLimiter, checkConflictLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// Admin-only routes
router.get('/', apiLimiter, authenticate, requireAdmin, getAllBookings);

// Protected routes (authenticated users only) - Must come before public routes to avoid route conflicts
router.get('/my-bookings', apiLimiter, authenticate, getMyBookings);
router.put('/:id', apiLimiter, authenticate, updateBooking);
router.delete('/:id', apiLimiter, authenticate, deleteBooking);

// Public routes (accessible to guests) - Use authenticateOptional for privacy anonymization
router.get('/check-conflict/:roomId', checkConflictLimiter, authenticateOptional, checkBookingConflict);
router.get('/room/:roomId', apiLimiter, authenticateOptional, getBookingsByRoomId);

// Optional authentication route - allows both authenticated users and guests
router.post('/', apiLimiter, authenticateOptional, createBooking);

export default router;
