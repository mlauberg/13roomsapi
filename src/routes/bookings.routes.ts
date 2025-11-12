import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking, updateBooking, getBookingsByRoomId, checkBookingConflict, getMyBookings } from '../controllers/bookings.controller';
import { authenticate, authenticateOptional, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Admin-only routes
router.get('/', authenticate, requireAdmin, getAllBookings);

// Protected routes (authenticated users only) - Must come before public routes to avoid route conflicts
router.get('/my-bookings', authenticate, getMyBookings);
router.put('/:id', authenticate, updateBooking);
router.delete('/:id', authenticate, deleteBooking);

// Public routes (accessible to guests)
router.get('/check-conflict/:roomId', checkBookingConflict);
router.get('/room/:roomId', getBookingsByRoomId);

// Optional authentication route - allows both authenticated users and guests
router.post('/', authenticateOptional, createBooking);

export default router;
