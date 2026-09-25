import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';
import { Notification } from '../models/Notification.js';
import { config } from '../config/env.js';

// Pre-generated secure default VAPID pair for instant zero-config operation
const DEFAULT_VAPID_PUBLIC =
  process.env.VAPID_PUBLIC_KEY ||
  'BOP7ec56T4hHaJbcaKj5FEBAHUeAx3rfoVybXos58KHfnttoe-gYDhzFOketN2YkJ921FctYu6hfDVXjloE5c3s';
const DEFAULT_VAPID_PRIVATE =
  process.env.VAPID_PRIVATE_KEY ||
  'SXMPRkfRTiqbOBDaen8nnbHq8O2ucVMbY6D-V5ITsIM';
const DEFAULT_VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@stylesync.ai';

try {
  webpush.setVapidDetails(
    config.vapidSubject || DEFAULT_VAPID_SUBJECT,
    config.vapidPublicKey || DEFAULT_VAPID_PUBLIC,
    config.vapidPrivateKey || DEFAULT_VAPID_PRIVATE
  );
} catch (err) {
  console.warn('[Notification Service] Web-push VAPID configuration notice:', err.message);
}

export const getPublicKey = () => {
  return config.vapidPublicKey || DEFAULT_VAPID_PUBLIC;
};

/**
 * Send push notification to all active devices of a user & save in-app record
 */
export const dispatchNotification = async ({
  userId,
  title,
  body,
  type = 'general',
  url = '/',
  icon = '/icons/icon-192x192.png',
  data = {},
}) => {
  // 1. Create in-app notification record
  const notificationRecord = await Notification.create({
    userId,
    title,
    body,
    type,
    url,
    icon,
    data,
    isRead: false,
  });

  // 2. Fetch all registered push subscriptions for this user
  const subscriptions = await PushSubscription.find({ userId });

  const payload = JSON.stringify({
    title,
    body,
    type,
    url,
    icon,
    notificationId: notificationRecord._id,
    timestamp: new Date().toISOString(),
    data,
  });

  // 3. Dispatch Web-Push payloads concurrently
  const pushPromises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        payload
      );
    } catch (pushErr) {
      // 404/410 indicates expired or unregistered subscription token
      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        console.log(`[WebPush] Removing expired subscription endpoint: ${sub.endpoint}`);
        await PushSubscription.deleteOne({ _id: sub._id });
      } else {
        console.warn(`[WebPush Error]:`, pushErr.message);
      }
    }
  });

  await Promise.allSettled(pushPromises);

  return notificationRecord;
};
