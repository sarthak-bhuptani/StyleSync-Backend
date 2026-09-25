import express from 'express';
import {
  analyzeProduct,
  getAnalyzedProducts,
  getProductById,
  parseProductUrl,
  compareProducts,
  completeTheLook,
  deleteProduct,
} from '../controllers/productController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/parse-url', parseProductUrl);
router.post('/compare', compareProducts);
router.post('/:id/complete-the-look', completeTheLook);
router.post('/analyze', upload.any(), analyzeProduct);
router.get('/', getAnalyzedProducts);
router.get('/:id', getProductById);
router.delete('/:id', deleteProduct);

export default router;

