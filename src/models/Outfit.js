import mongoose from 'mongoose';

const outfitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    occasion: {
      type: String,
      default: 'Smart Casual',
    },
    weather: {
      type: String,
      default: 'Mild (15-22°C)',
    },
    style: {
      type: String,
      default: 'Smart Casual',
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WardrobeItem',
        required: true,
      },
    ],
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 90,
    },
    aiReasoning: {
      type: String,
      default: '',
    },
    colorHarmony: {
      type: String,
      default: '',
    },
    isSaved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Outfit = mongoose.model('Outfit', outfitSchema);
