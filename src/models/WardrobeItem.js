import mongoose from 'mongoose';

const wardrobeItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide item name'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      enum: ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Eyewear', 'One-Piece', 'Other'],
      index: true,
    },
    subcategory: {
      type: String,
      default: '',
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      required: [true, 'Please specify item color'],
      trim: true,
    },
    colorHex: {
      type: String,
      default: '#000000',
    },
    price: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    fabric: {
      type: String,
      default: '',
      trim: true,
    },
    pattern: {
      type: String,
      default: 'Solid',
    },
    formality: {
      type: String,
      enum: ['Casual', 'Smart Casual', 'Formal', 'Other'],
      default: 'Smart Casual',
    },
    wearCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    season: {
      type: String,
      enum: ['All-Season', 'Spring/Summer', 'Fall/Winter', 'Summer', 'Winter', 'All Season', 'Transitional'],
      default: 'All Season',
    },
    tags: [{ type: String }],
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for usageCount (alias to wearCount)
wardrobeItemSchema.virtual('usageCount').get(function () {
  return this.wearCount || 0;
});
wardrobeItemSchema.virtual('usageCount').set(function (val) {
  this.wearCount = val;
});

// Virtual for Cost Per Wear calculation
wardrobeItemSchema.virtual('costPerWear').get(function () {
  if (!this.price || this.price <= 0) return 0;
  const count = this.wearCount || 0;
  if (count <= 0) return this.price;
  return Number((this.price / count).toFixed(2));
});


export const WardrobeItem = mongoose.model('WardrobeItem', wardrobeItemSchema);
