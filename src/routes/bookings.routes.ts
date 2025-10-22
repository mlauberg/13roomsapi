import { Router } from 'express';
import { getAllBookings, createBooking, deleteBooking } from '../controllers/bookings.controller';

const router = Router();

router.get('/', getAllBookings);
router.post('/', createBooking);
router.delete('/:id', deleteBooking);

export default router;
