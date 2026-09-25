import { WardrobeItem } from '../models/WardrobeItem.js';
import { User } from '../models/User.js';
import { detectWardrobeGapsWithGemini } from '../services/geminiVisionService.js';

/**
 * @desc    Capsule Wardrobe Gap Engine: Detect missing closet essentials
 * @route   GET /api/v1/recommendations/gaps, GET /api/v1/gaps
 * @access  Private
 */
export const getWardrobeGaps = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const wardrobeItems = await WardrobeItem.find({ userId: req.user.id });

    const gapsData = await detectWardrobeGapsWithGemini({
      user,
      wardrobeItems,
    });

    res.status(200).json({
      success: true,
      missingCategories: gapsData.missingCategories || [],
      gaps: gapsData.gaps || [],
      data: gapsData, // Provided for frontend compatibility
    });
  } catch (error) {
    next(error);
  }
};
