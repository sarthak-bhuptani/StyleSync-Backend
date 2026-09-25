import mongoose from 'mongoose';

const wearLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    outfitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit',
    },
    outfitTitle: {
      type: String,
      default: 'Daily Worn Outfit',
      trim: true,
    },
    occasion: {
      type: String,
      default: 'Daily Wear',
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    temp: {
      type: String,
      default: 'Mild',
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WardrobeItem',
      },
    ],
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const WearLog = mongoose.model('WearLog', wearLogSchema);
