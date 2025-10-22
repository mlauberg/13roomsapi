import { Router } from 'express';
import { getAllRooms, createRoom, updateRoom, deleteRoom } from '../controllers/rooms.controller';

const router = Router();

router.get('/', getAllRooms);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
