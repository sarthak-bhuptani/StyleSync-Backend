import { Outfit } from '../models/Outfit.js';
import { WardrobeItem } from '../models/WardrobeItem.js';
import { WearLog } from '../models/WearLog.js';
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
 * @desc    Save a customized or manual outfit to DB
 * @route   POST /api/v1/outfits
 * @access  Private
 */
export const saveOutfit = async (req, res, next) => {
  try {
    const { name, title, occasion, weather, style, itemIds, items, matchScore, aiReasoning } = req.body;

    const finalItemIds = itemIds || items || [];
    const finalName = title || name || 'Custom Curated Outfit';

    const outfit = await Outfit.create({
      userId: req.user.id,
      name: finalName,
      occasion: occasion || 'Casual',
      weather: weather || 'Mild',
      style: style || 'Smart Casual',
      items: finalItemIds,
      matchScore: matchScore || 92,
      aiReasoning: aiReasoning || 'Curated staple combination',
      isSaved: true,
    });

    const populated = await Outfit.findById(outfit._id).populate('items');

    res.status(201).json({
      success: true,
      message: 'Outfit saved to lookbook successfully',
      data: populated,
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

    // Categorize populated items for direct top/bottom/shoe visualization
    const populatedItems = populated.items || [];
    const topItem = populatedItems.find((i) => i.category === 'Tops');
    const bottomItem = populatedItems.find((i) => i.category === 'Bottoms');
    const shoeItem = populatedItems.find((i) => i.category === 'Shoes');
    const layerItem = populatedItems.find((i) => i.category === 'Outerwear');

    const formattedResponse = {
      id: outfit._id.toString(),
      _id: outfit._id,
      title: outfit.name,
      name: outfit.name,
      occasion: outfit.occasion,
      weather: outfit.weather,
      style: outfit.style,
      matchScore: outfit.matchScore,
      top: topItem ? { name: topItem.name, color: topItem.color, imageUrl: topItem.imageUrl, id: topItem._id } : null,
      bottom: bottomItem ? { name: bottomItem.name, color: bottomItem.color, imageUrl: bottomItem.imageUrl, id: bottomItem._id } : null,
      shoe: shoeItem ? { name: shoeItem.name, color: shoeItem.color, imageUrl: shoeItem.imageUrl, id: shoeItem._id } : null,
      layer: layerItem ? { name: layerItem.name, color: layerItem.color, imageUrl: layerItem.imageUrl, id: layerItem._id } : null,
      stylingTip: aiResult.aiReasoning || 'Roll the cuffs twice for a confident, effortless silhouette.',
      items: populated.items,
      aiReasoning: outfit.aiReasoning,
      colorHarmony: outfit.colorHarmony,
    };

    res.status(201).json({
      success: true,
      message: 'Outfit generated successfully',
      ...formattedResponse,
      data: formattedResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log today's worn outfit & increment item usage/wear counts
 * @route   POST /api/v1/outfits/log-wear
 * @access  Private
 */
export const logWear = async (req, res, next) => {
  try {
    const { outfitId, outfitTitle, occasion, date, temp, itemIds, notes } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of itemIds to increment wear count',
      });
    }

    // 1. Increment wearCount on all provided wardrobe items belonging to user
    const updateResult = await WardrobeItem.updateMany(
      {
        _id: { $in: itemIds },
        userId: req.user.id,
      },
      {
        $inc: { wearCount: 1 },
      }
    );

    // 2. Persist daily WearLog record in MongoDB for wear history tracking
    const wearLog = await WearLog.create({
      userId: req.user.id,
      outfitId: outfitId || undefined,
      outfitTitle: outfitTitle || 'Daily Worn Outfit',
      occasion: occasion || 'Daily Wear',
      date: date || new Date().toISOString().split('T')[0],
      temp: temp || 'Mild',
      items: itemIds,
      notes: notes || '',
    });

    res.status(200).json({
      success: true,
      message: 'Outfit logged! Item usage counts updated.',
      data: wearLog,
      loggedDetails: {
        outfitTitle: wearLog.outfitTitle,
        occasion: wearLog.occasion,
        date: wearLog.date,
        temp: wearLog.temp,
        updatedItemsCount: updateResult.modifiedCount || itemIds.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's wear history log from DB
 * @route   GET /api/v1/outfits/wear-logs
 * @access  Private
 */
export const getWearLogs = async (req, res, next) => {
  try {
    const logs = await WearLog.find({ userId: req.user.id })
      .populate('items')
      .populate('outfitId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete saved outfit from lookbook
 * @route   DELETE /api/v1/outfits/:id
 * @access  Private
 */
export const deleteOutfit = async (req, res, next) => {
  try {
    const outfit = await Outfit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!outfit) {
      return res.status(404).json({
        success: false,
        message: 'Outfit not found in lookbook',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Outfit removed from lookbook.',
    });
  } catch (error) {
    next(error);
  }
};


