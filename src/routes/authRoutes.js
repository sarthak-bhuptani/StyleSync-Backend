import express from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/reset-password/:resetToken', resetPassword);
router.put('/reset-password/:resetToken', resetPassword);

export default router;
