import mongoose from 'mongoose';

const monthlyHistorySchema = new mongoose.Schema({
  month: { type: String, required: true }, // e.g. "2025-01"
  monthName: { type: String, required: true }, // e.g. "Jan"
  limit: { type: Number, default: 500 },
  spent: { type: Number, default: 0 },
  saved: { type: Number, default: 0 },
});

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    monthlyLimit: {
      type: Number,
      default: 600,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    categoryAllocations: {
      tops: { type: Number, default: 150 },
      bottoms: { type: Number, default: 120 },
      outerwear: { type: Number, default: 150 },
      shoes: { type: Number, default: 120 },
      accessories: { type: Number, default: 60 },
    },
    monthlyHistory: [monthlyHistorySchema],
  },
  {
    timestamps: true,
  }
);

export const Budget = mongoose.model('Budget', budgetSchema);
