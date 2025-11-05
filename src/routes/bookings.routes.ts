import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking, getBookingsByRoomId, checkBookingConflict } from '../controllers/bookings.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireAdmin, getAllBookings);
router.get('/check-conflict/:roomId', checkBookingConflict);
router.get('/room/:roomId', getBookingsByRoomId);
router.post('/', createBooking);
router.delete('/:id', deleteBooking);

export default router;
