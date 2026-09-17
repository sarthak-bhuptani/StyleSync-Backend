import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Budget } from '../models/Budget.js';
import { config } from '../config/env.js';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    // Initialize default budget record for user
    await Budget.create({
      userId: user._id,
      monthlyLimit: 600,
      categoryAllocations: {
        tops: 150,
        bottoms: 120,
        outerwear: 150,
        shoes: 120,
        accessories: 60,
      },
      monthlyHistory: [
        { month: '2025-01', monthName: 'Jan', limit: 600, spent: 420, saved: 180 },
        { month: '2025-02', monthName: 'Feb', limit: 600, spent: 380, saved: 220 },
        { month: '2025-03', monthName: 'Mar', limit: 600, spent: 510, saved: 90 },
      ],
    });

    const token = generateToken(user._id);

    // Return sanitized user object
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      physicalTraits: user.physicalTraits,
      preferences: user.preferences,
      isOnboarded: user.isOnboarded,
      onboardingStep: user.onboardingStep,
    };

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login existing user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user._id);

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      physicalTraits: user.physicalTraits,
      preferences: user.preferences,
      isOnboarded: user.isOnboarded,
      onboardingStep: user.onboardingStep,
    };

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password / Reset dispatch
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address. Please check your spelling or sign up.',
      });
    }

    // Generate secure token via model helper (15 min expiry)
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Construct reset URL pointing to frontend /reset-password?token=...
    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });

      res.status(200).json({
        success: true,
        message: 'A password reset link has been dispatched to your email address.',
        resetUrl: config.nodeEnv === 'development' ? resetUrl : undefined,
      });
    } catch (mailErr) {
      // Revert token if email dispatch throws
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('[StyleSync Auth] Email dispatch error:', mailErr);
      return res.status(500).json({
        success: false,
        message: 'Email could not be dispatched. Please check your server SMTP settings.',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using token
 * @route   POST /api/v1/auth/reset-password or POST /api/v1/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    // Support token from route params (:resetToken or :token) or request body
    const token = req.params.resetToken || req.params.token || req.body.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is required',
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Hash token to compare with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Set new password (pre-save hook will hash it with bcrypt)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate fresh JWT token for seamless auto-login
    const jwtToken = generateToken(user._id);

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      physicalTraits: user.physicalTraits,
      preferences: user.preferences,
      isOnboarded: user.isOnboarded,
      onboardingStep: user.onboardingStep,
    };

    res.status(200).json({
      success: true,
      message: 'Password has been updated successfully! You can now log in with your new password.',
      token: jwtToken,
      user: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

