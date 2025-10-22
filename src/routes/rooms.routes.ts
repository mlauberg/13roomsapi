import { Router } from 'express';
import { getAllRooms, createRoom, updateRoom, deleteRoom, getRoomById } from '../controllers/rooms.controller';

const router = Router();

router.get('/', getAllRooms);
router.get('/:id', getRoomById); // Added this line
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
