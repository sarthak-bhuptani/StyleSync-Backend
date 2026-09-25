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
    currency: {
      type: String,
      default: '₹',
    },
    feedback: {
      type: String,
      enum: ['good', 'bad', 'pending', null],
      default: 'pending',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals for spec naming compatibility
purchaseSchema.virtual('userFeedback').get(function () {
  return this.feedback;
});
purchaseSchema.virtual('userRating').get(function () {
  return this.rating;
});

export const Purchase = mongoose.model('Purchase', purchaseSchema);

