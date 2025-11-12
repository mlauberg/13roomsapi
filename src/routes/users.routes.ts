import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/users.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All user management routes are admin-only
router.get('/', authenticate, requireAdmin, getAllUsers);
router.get('/:id', authenticate, requireAdmin, getUserById);
router.post('/', authenticate, requireAdmin, createUser);
router.put('/:id', authenticate, requireAdmin, updateUser);
router.delete('/:id', authenticate, requireAdmin, deleteUser);

export default router;
