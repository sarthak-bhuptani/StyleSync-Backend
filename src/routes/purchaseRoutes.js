import express from 'express';
import {
  getPurchases,
  recordPurchase,
  updateFeedback,
  deletePurchase,
} from '../controllers/purchaseController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(upload.single('image'), recordPurchase);

router.patch('/:id/feedback', updateFeedback);
router.delete('/:id', deletePurchase);

export default router;

