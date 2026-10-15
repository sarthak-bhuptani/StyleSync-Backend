import mongoose from 'mongoose';

const lookSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => 'look_' + new mongoose.Types.ObjectId().toString().slice(-6),
    },
    title: {
      type: String,
      default: '',
    },
    items: [
      {
        type: String,
      },
    ],
  },
  { _id: false }
);

const collectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide collection name'],
      trim: true,
    },
    category: {
      type: String,
      default: 'Work',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    coverImage: {
      type: String,
      default: '',
    },
    itemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WardrobeItem',
      },
    ],
    outfitIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outfit',
      },
    ],
    looks: [lookSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

collectionSchema.virtual('id').get(function () {
  return this._id.toString();
});

export const Collection = mongoose.model('Collection', collectionSchema);
