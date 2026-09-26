import express from 'express';
import {
  getWardrobeItems,
  addWardrobeItem,
  analyzeWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
} from '../controllers/wardrobeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/analyze', upload.single('image'), analyzeWardrobeItem);

router.route('/')
  .get(getWardrobeItems)
  .post(upload.single('image'), addWardrobeItem);

router.route('/:id')
  .put(upload.single('image'), updateWardrobeItem)
  .delete(deleteWardrobeItem);

export default router;

