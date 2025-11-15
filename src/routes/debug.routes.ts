import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { runSeed } from '../debug/seed';
import { invalidateRoomsCache } from '../services/cache.service';

const router = Router();

// THIS ENDPOINT SHOULD BE DISABLED OR PROTECTED IN A REAL PRODUCTION ENVIRONMENT
router.post('/seed', requireAdmin, async (req: Request, res: Response) => {
  try {
    await runSeed();
    invalidateRoomsCache(); // IMPORTANT: Clear the cache after seeding
    res.status(200).json({ message: 'Database seeding completed successfully.' });
  } catch (error) {
    console.error('Seeding failed:', error);
    res.status(500).json({ message: 'Database seeding failed.' });
  }
});

export default router;
