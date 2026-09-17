import { Outfit } from '../models/Outfit.js';
import { WardrobeItem } from '../models/WardrobeItem.js';
import { User } from '../models/User.js';
import { generateOutfitWithAI } from '../services/geminiVisionService.js';

/**
 * @desc    Get user's saved outfits
 * @route   GET /api/v1/outfits
 * @access  Private
 */
export const getOutfits = async (req, res, next) => {
  try {
    const outfits = await Outfit.find({ userId: req.user.id })
      .populate('items')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: outfits.length,
      data: outfits,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate 4-piece coordinated outfit from user's database wardrobe
 * @route   POST /api/v1/outfits/generate
 * @access  Private
 */
export const generateOutfit = async (req, res, next) => {
  try {
    const {
      occasion = 'Smart Casual',
      weather = 'Mild (15-22°C)',
      style = 'Smart Casual',
    } = req.body;

    const user = await User.findById(req.user.id);
    const wardrobeItems = await WardrobeItem.find({ userId: req.user.id });

    if (wardrobeItems.length < 2) {
      return res.status(400).json({
        success: false,
        message:
          'Please add at least 2 items to your capsule wardrobe before generating AI outfits.',
      });
    }

    // Generate outfit recommendation via Gemini
    const aiResult = await generateOutfitWithAI({
      occasion,
      weather,
      style,
      user,
      wardrobeItems,
    });

    // Validate selected item IDs exist in user's wardrobe
    const userItemIds = new Set(wardrobeItems.map((w) => w._id.toString()));
    let selectedIds = (aiResult.selectedItemIds || []).filter((id) =>
      userItemIds.has(id?.toString())
    );

    // Fallback: If AI picked items not in set, choose top available items
    if (selectedIds.length === 0) {
      selectedIds = wardrobeItems.slice(0, 4).map((w) => w._id);
    }

    const outfit = await Outfit.create({
      userId: req.user.id,
      name: aiResult.name || `${style} for ${occasion}`,
      occasion,
      weather,
      style,
      items: selectedIds,
      matchScore: aiResult.matchScore || 90,
      aiReasoning: aiResult.aiReasoning || '',
      colorHarmony: aiResult.colorHarmony || '',
      isSaved: true,
    });

    const populated = await Outfit.findById(outfit._id).populate('items');

    res.status(201).json({
      success: true,
      message: 'Outfit generated successfully',
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};
