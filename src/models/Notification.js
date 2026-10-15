import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['weather', 'outfit', 'gap', 'budget', 'price_drop', 'general'],
      default: 'general',
    },
    icon: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '/',
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.message = ret.body;
        ret.read = ret.isRead;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.message = ret.body;
        ret.read = ret.isRead;
        delete ret.__v;
        return ret;
      },
    },
  }
);

notificationSchema.virtual('id').get(function () {
  return this._id.toString();
});

notificationSchema.virtual('message')
  .get(function () {
    return this.body;
  })
  .set(function (val) {
    this.body = val;
  });

notificationSchema.virtual('read')
  .get(function () {
    return this.isRead;
  })
  .set(function (val) {
    this.isRead = val;
  });

export const Notification = mongoose.model('Notification', notificationSchema);
