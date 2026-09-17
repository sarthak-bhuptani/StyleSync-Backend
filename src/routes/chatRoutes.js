import express from 'express';
import { sendMessage } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/message', sendMessage);

export default router;
