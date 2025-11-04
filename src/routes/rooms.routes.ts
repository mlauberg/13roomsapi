import { Router } from 'express';
import { getAllRooms, createRoom, updateRoom, deleteRoom, getRoomById, getAvailableRooms } from '../controllers/rooms.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getAllRooms);
// PHASE 3: Smart Failure Recovery - Get available rooms for a time slot
// IMPORTANT: This must come BEFORE /:id route to avoid route matching conflicts
router.get('/available', getAvailableRooms);
router.get('/:id', getRoomById);
router.post('/', requireAdmin, createRoom);
router.put('/:id', requireAdmin, updateRoom);
router.delete('/:id', requireAdmin, deleteRoom);

export default router;
