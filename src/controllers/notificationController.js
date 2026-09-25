import { PushSubscription } from '../models/PushSubscription.js';
import { Notification } from '../models/Notification.js';
import { getPublicKey, dispatchNotification } from '../services/notificationService.js';

/**
 * @desc    Get VAPID Public Key for Web Push registration
 * @route   GET /api/v1/notifications/vapid-key
 * @access  Public / Private
 */
export const getVapidKey = (req, res) => {
  const publicKey = getPublicKey();
  res.status(200).json({
    success: true,
    publicKey,
  });
};

/**
 * @desc    Subscribe device for Background Web Push notifications
 * @route   POST /api/v1/notifications/subscribe
 * @access  Private
 */
export const subscribePush = async (req, res, next) => {
  try {
    const { endpoint, keys, deviceType, userAgent } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription payload. Must include endpoint and keys (p256dh, auth).',
      });
    }

    // Upsert subscription per endpoint
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user.id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        deviceType: deviceType || 'web',
        userAgent: userAgent || req.headers['user-agent'] || '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Push notifications subscribed successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unsubscribe device from Web Push
 * @route   POST /api/v1/notifications/unsubscribe
 * @access  Private
 */
export const unsubscribePush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Please provide endpoint to unsubscribe',
      });
    }

    await PushSubscription.findOneAndDelete({
      endpoint,
      userId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Device unsubscribed from push notifications',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user notification history & unread count
 * @route   GET /api/v1/notifications
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const { limit = 30, page = 1, isRead } = req.query;

    const query = { userId: req.user.id };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark single notification as read
 * @route   PATCH /api/v1/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PATCH /api/v1/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification removed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trigger a test push notification to user's registered devices
 * @route   POST /api/v1/notifications/test-send
 * @access  Private
 */
export const sendTestNotification = async (req, res, next) => {
  try {
    const {
      title = '☀️ StyleSync Weather Styling Alert',
      body = 'It is 28°C and sunny in your area today! Your tailored Linen Oxford outfit is ready.',
      type = 'weather',
      url = '/outfits',
    } = req.body;

    const notification = await dispatchNotification({
      userId: req.user.id,
      title,
      body,
      type,
      url,
      data: { test: true },
    });

    res.status(200).json({
      success: true,
      message: 'Test notification dispatched to user devices and in-app feed',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};
