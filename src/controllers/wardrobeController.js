import { WardrobeItem } from '../models/WardrobeItem.js';
import { uploadImage } from '../config/cloudinary.js';
import {
  analyzeWardrobeItemWithGemini,
  normalizeWardrobeCategory,
} from '../services/geminiVisionService.js';

/**
 * Helper to extract image buffer and URL from request
 */
const extractImageBuffer = async (req) => {
  let imageBuffer = null;
  let mimeType = 'image/jpeg';
  let imageUrl = req.body?.imageUrl || req.body?.image || '';

  if (req.file) {
    imageBuffer = req.file.buffer;
    mimeType = req.file.mimetype || 'image/jpeg';
    imageUrl = await uploadImage(imageBuffer, mimeType, 'stylesync/wardrobe');
  } else if (imageUrl) {
    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(';base64,');
      mimeType = parts[0].replace('data:', '') || 'image/jpeg';
      imageBuffer = Buffer.from(parts[1], 'base64');
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const imageRes = await fetch(imageUrl);
        const arrayBuf = await imageRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
        mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
      } catch (fetchErr) {
        console.warn('[extractImageBuffer] Could not download image URL:', fetchErr.message);
      }
    }
  }

  return { imageBuffer, mimeType, imageUrl };
};

/**
 * @desc    Analyze uploaded clothing/wardrobe image (auto-detect shirt, pants, color, hex, category, fabric, etc.)
 * @route   POST /api/v1/wardrobe/analyze
 * @access  Private
 */
export const analyzeWardrobeItem = async (req, res, next) => {
  try {
    const { imageBuffer, mimeType, imageUrl } = await extractImageBuffer(req);

    if (!imageBuffer && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image file or imageUrl to analyze the clothing item',
      });
    }

    const aiResult = await analyzeWardrobeItemWithGemini(imageBuffer, mimeType);

    res.status(200).json({
      success: true,
      message: 'Wardrobe item analyzed successfully',
      data: {
        ...aiResult,
        imageUrl: imageUrl || '',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's wardrobe items (with optional ?category= filter)
 * @route   GET /api/v1/wardrobe
 * @access  Private
 */
export const getWardrobeItems = async (req, res, next) => {
  try {
    const { category, search, season, isFavorite } = req.query;

    const query = { userId: req.user.id };

    if (season) {
      query.season = season;
    }

    if (isFavorite !== undefined) {
      query.isFavorite = isFavorite === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { color: { $regex: search, $options: 'i' } },
      ];
    }

    let items = await WardrobeItem.find(query).sort({ createdAt: -1 });

    // Auto-heal any existing items in the database that had incorrect category tags
    const updatePromises = [];
    items = items.map((item) => {
      const correctCategory = normalizeWardrobeCategory(item.category, item.name, item.subcategory);
      if (correctCategory !== item.category) {
        item.category = correctCategory;
        updatePromises.push(
          WardrobeItem.findByIdAndUpdate(item._id, { category: correctCategory }).exec()
        );
      }
      return item;
    });

    if (updatePromises.length > 0) {
      await Promise.allSettled(updatePromises);
    }

    // Apply category filter after normalization
    if (category && category !== 'All') {
      const targetCategory = normalizeWardrobeCategory(category);
      items = items.filter((item) => item.category === targetCategory || item.category === category);
    }

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a new wardrobe item (with optional auto-AI analysis if fields missing)
 * @route   POST /api/v1/wardrobe
 * @access  Private
 */
export const addWardrobeItem = async (req, res, next) => {
  try {
    let {
      name,
      category,
      subcategory,
      brand,
      color,
      colorHex,
      price,
      image,
      imageUrl: directImageUrl,
      fabric,
      pattern,
      formality,
      wearCount,
      season,
      tags,
    } = req.body;

    const { imageBuffer, mimeType, imageUrl: finalImageUrl } = await extractImageBuffer(req);

    let aiResult = null;

    // If core fields are missing, attempt automatic AI extraction from the image
    if ((!name || !category || !color) && (imageBuffer || finalImageUrl)) {
      aiResult = await analyzeWardrobeItemWithGemini(imageBuffer, mimeType);
    } else if (!name || !category || !color) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, and color for the item (or upload an image for automatic detection)',
      });
    }

    const resolvedName = name || aiResult?.name || 'Wardrobe Item';
    const resolvedSubcategory = subcategory || aiResult?.subcategory || '';
    const resolvedCategory = normalizeWardrobeCategory(
      category || aiResult?.category || 'Tops',
      resolvedName,
      resolvedSubcategory
    );

    const parsedTags = Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(',').map((t) => t.trim())
      : (aiResult?.tags || []);

    const item = await WardrobeItem.create({
      userId: req.user.id,
      name: resolvedName,
      category: resolvedCategory,
      subcategory: resolvedSubcategory,
      brand: brand || '',
      color: color || aiResult?.color || 'Neutral',
      colorHex: colorHex || aiResult?.colorHex || '#000000',
      price: price ? Number(price) : 0,
      imageUrl: finalImageUrl || directImageUrl || image || '',
      fabric: fabric || aiResult?.fabric || '',
      pattern: pattern || aiResult?.pattern || 'Solid',
      formality: formality || aiResult?.formality || 'Smart Casual',
      wearCount: wearCount ? Number(wearCount) : 0,
      season: season || aiResult?.season || 'All-Season',
      tags: parsedTags,
    });

    res.status(201).json({
      success: true,
      message: 'Wardrobe item added successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update wardrobe item (details, wear count, favorite)
 * @route   PUT /api/v1/wardrobe/:id
 * @access  Private
 */
export const updateWardrobeItem = async (req, res, next) => {
  try {
    let item = await WardrobeItem.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Wardrobe item not found',
      });
    }

    let finalImageUrl = item.imageUrl;
    if (req.file) {
      finalImageUrl = await uploadImage(
        req.file.buffer,
        req.file.mimetype,
        'stylesync/wardrobe'
      );
    } else if (req.body.imageUrl || req.body.image) {
      finalImageUrl = req.body.imageUrl || req.body.image;
    }

    const updates = { ...req.body };
    if (finalImageUrl) updates.imageUrl = finalImageUrl;

    item = await WardrobeItem.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Wardrobe item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete wardrobe item
 * @route   DELETE /api/v1/wardrobe/:id
 * @access  Private
 */
export const deleteWardrobeItem = async (req, res, next) => {
  try {
    const item = await WardrobeItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Wardrobe item not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Wardrobe item removed successfully',
    });
  } catch (error) {
    next(error);
  }
};
