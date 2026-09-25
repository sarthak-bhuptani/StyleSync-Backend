import express from 'express';
import {
  getVapidKey,
  subscribePush,
  unsubscribePush,
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  sendTestNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / auth route for VAPID key
router.get('/vapid-key', getVapidKey);

// Protected notification management routes
router.use(protect);

router.get('/', getNotifications);
router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);
router.post('/test-send', sendTestNotification);

export default router;
