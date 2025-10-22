import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking, getBookingsByRoomId, checkBookingConflict } from '../controllers/bookings.controller';

const router = Router();

router.get('/', getAllBookings);
router.get('/check-conflict/:roomId', checkBookingConflict);
router.get('/room/:roomId', getBookingsByRoomId);
router.post('/', createBooking);
router.delete('/:id', deleteBooking);

export default router;
