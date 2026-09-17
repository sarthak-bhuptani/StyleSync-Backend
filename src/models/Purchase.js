import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide price'],
      min: 0,
    },
    category: {
      type: String,
      default: 'Tops',
    },
    brand: {
      type: String,
      default: '',
    },
    buyWiseScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 85,
    },
    notes: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    feedback: {
      type: String,
      enum: ['good', 'bad', 'pending'],
      default: 'pending',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Purchase = mongoose.model('Purchase', purchaseSchema);
