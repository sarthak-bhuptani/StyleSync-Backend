import mongoose from 'mongoose';

const analyzedProductSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: 'Evaluated Product',
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'Tops',
    },
    price: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    // AI Evaluation Engine Results
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    decision: {
      type: String,
      enum: ['BUY', 'MAYBE', 'SKIP'],
      required: true,
    },
    confidence: {
      type: String,
      default: '90%',
    },
    breakdown: {
      styleMatch: {
        score: { type: Number, default: 20 },
        max: { type: Number, default: 25 },
      },
      colorMatch: {
        score: { type: Number, default: 18 },
        max: { type: Number, default: 20 },
      },
      wardrobeMatch: {
        score: { type: Number, default: 16 },
        max: { type: Number, default: 20 },
      },
      versatility: {
        score: { type: Number, default: 12 },
        max: { type: Number, default: 15 },
      },
      budget: {
        score: { type: Number, default: 9 },
        max: { type: Number, default: 10 },
      },
      occasion: {
        score: { type: Number, default: 8 },
        max: { type: Number, default: 10 },
      },
    },
    aiExplanation: {
      type: String,
      required: true,
    },
    strongMatches: [{ type: String }],
    considerations: [{ type: String }],
    compatibleWardrobeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WardrobeItem',
      },
    ],
    physicalHarmony: {
      faceMatch: { type: String, default: '' },
      complexionMatch: { type: String, default: '' },
      bodyMatch: { type: String, default: '' },
    },
    isSaved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const AnalyzedProduct = mongoose.model('AnalyzedProduct', analyzedProductSchema);
