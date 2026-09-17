import express from 'express';
import {
  getProfile,
  updateProfile,
  completeOnboarding,
  scanFaceAndBody,
  getColorDraping,
} from '../controllers/profileController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getProfile);
router.put('/', updateProfile);
router.post('/onboarding', completeOnboarding);
router.post('/scan-face-body', upload.single('image'), scanFaceAndBody);
router.get('/color-draping', getColorDraping);

export default router;
