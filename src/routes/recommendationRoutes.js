import express from 'express';
import { getWardrobeGaps } from '../controllers/recommendationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/gaps', getWardrobeGaps);
router.get('/', getWardrobeGaps);

export default router;
