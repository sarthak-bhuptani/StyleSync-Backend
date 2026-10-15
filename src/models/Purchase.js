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
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
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
    wearCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    feedback: {
      type: String,
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
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.name = ret.productName;
        ret.userRating = ret.rating;
        ret.userFeedback = ret.feedback;
        const wear = ret.wearCount || 0;
        ret.costPerWear = wear > 0 ? Number((ret.price / wear).toFixed(1)) : ret.price;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.name = ret.productName;
        ret.userRating = ret.rating;
        ret.userFeedback = ret.feedback;
        const wear = ret.wearCount || 0;
        ret.costPerWear = wear > 0 ? Number((ret.price / wear).toFixed(1)) : ret.price;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtuals for spec naming compatibility
purchaseSchema.virtual('id').get(function () {
  return this._id.toString();
});

purchaseSchema.virtual('name')
  .get(function () {
    return this.productName;
  })
  .set(function (val) {
    this.productName = val;
  });

purchaseSchema.virtual('userFeedback')
  .get(function () {
    return this.feedback;
  })
  .set(function (val) {
    this.feedback = val;
  });

purchaseSchema.virtual('userRating')
  .get(function () {
    return this.rating;
  })
  .set(function (val) {
    this.rating = val;
  });

purchaseSchema.virtual('costPerWear').get(function () {
  const wear = this.wearCount || 0;
  return wear > 0 ? Number((this.price / wear).toFixed(1)) : this.price;
});

export const Purchase = mongoose.model('Purchase', purchaseSchema);
