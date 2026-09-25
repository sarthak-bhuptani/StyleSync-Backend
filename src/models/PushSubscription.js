import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
        trim: true,
      },
      auth: {
        type: String,
        required: true,
        trim: true,
      },
    },
    deviceType: {
      type: String,
      default: 'web',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
