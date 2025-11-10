import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking, getBookingsByRoomId, checkBookingConflict } from '../controllers/bookings.controller';
import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Admin-only routes
router.get('/', authenticate, requireAdmin, getAllBookings);

// Public routes (accessible to guests)
router.get('/check-conflict/:roomId', checkBookingConflict);
router.get('/room/:roomId', getBookingsByRoomId);

// Optional authentication route - allows both authenticated users and guests
router.post('/', authenticateOptional, createBooking);

// Protected routes (authenticated users only)
router.delete('/:id', authenticate, deleteBooking);

export default router;
