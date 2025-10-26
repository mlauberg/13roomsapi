import { Router } from 'express';
import { getAllRooms, createRoom, updateRoom, deleteRoom, getRoomById, getAvailableRooms } from '../controllers/rooms.controller';

const router = Router();

router.get('/', getAllRooms);
// PHASE 3: Smart Failure Recovery - Get available rooms for a time slot
// IMPORTANT: This must come BEFORE /:id route to avoid route matching conflicts
router.get('/available', getAvailableRooms);
router.get('/:id', getRoomById);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
