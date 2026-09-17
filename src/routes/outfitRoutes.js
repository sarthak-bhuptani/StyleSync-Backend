import express from 'express';
import {
  getOutfits,
  generateOutfit,
} from '../controllers/outfitController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getOutfits);
router.post('/generate', generateOutfit);

export default router;
