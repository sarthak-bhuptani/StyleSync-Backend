import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    // AI Physical Calibration Traits
    physicalTraits: {
      faceShape: {
        type: String,
        enum: ['Oval', 'Square', 'Round', 'Heart', 'Oblong', 'Diamond', 'Uncalibrated'],
        default: 'Uncalibrated',
      },
      skinUndertone: {
        type: String,
        enum: ['Warm Golden', 'Cool Rosy', 'Neutral', 'Olive', 'Deep Warm', 'Uncalibrated'],
        default: 'Uncalibrated',
      },
      colorSeason: {
        type: String,
        enum: [
          'Warm Autumn',
          'Cool Winter',
          'Light Spring',
          'Soft Summer',
          'Deep Autumn',
          'Clear Winter',
          'Uncalibrated',
        ],
        default: 'Uncalibrated',
      },
      bodySilhouette: {
        type: String,
        enum: [
          'Athletic V-Taper',
          'Lean Rectangle',
          'Hourglass',
          'Pear/Triangle',
          'Inverted Triangle',
          'Oval/Apple',
          'Uncalibrated',
        ],
        default: 'Uncalibrated',
      },
      hairColor: { type: String, default: '' },
      eyeColor: { type: String, default: '' },
      height: { type: String, default: '' },
      weight: { type: String, default: '' },
      calibrationConfidence: { type: String, default: '0%' },
      calibrationNotes: { type: String, default: '' },
      calibratedAt: { type: Date },
    },
    // Styling Preferences
    preferences: {
      brandPreferences: [{ type: String }],
      sizes: {
        tops: { type: String, default: 'M' },
        bottoms: { type: String, default: '32' },
        outerwear: { type: String, default: 'M' },
        shoes: { type: String, default: '10' },
      },
      avoidColors: [{ type: String }],
      favoriteStyles: [{ type: String }],
      budgetLimits: {
        tops: { type: Number, default: 100 },
        bottoms: { type: Number, default: 150 },
        outerwear: { type: Number, default: 250 },
        shoes: { type: Number, default: 180 },
        accessories: { type: Number, default: 80 },
      },
    },
    // Onboarding status
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    onboardingStep: {
      type: Number,
      default: 1,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare input password with database hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate a cryptographically secure 32-byte token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash token using SHA-256 and save to user
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration time to 15 minutes
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

export const User = mongoose.model('User', userSchema);

