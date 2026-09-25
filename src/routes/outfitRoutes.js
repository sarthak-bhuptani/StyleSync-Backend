import express from 'express';
import {
  getOutfits,
  saveOutfit,
  generateOutfit,
  logWear,
  getWearLogs,
  deleteOutfit,
} from '../controllers/outfitController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getOutfits)
  .post(saveOutfit);

router.post('/generate', generateOutfit);
router.post('/log-wear', logWear);
router.get('/wear-logs', getWearLogs);
router.delete('/:id', deleteOutfit);

export default router;


