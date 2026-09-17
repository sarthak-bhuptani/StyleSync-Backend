import { WardrobeItem } from '../models/WardrobeItem.js';
import { uploadImage } from '../config/cloudinary.js';

/**
 * @desc    Get user's wardrobe items (with optional ?category= filter)
 * @route   GET /api/v1/wardrobe
 * @access  Private
 */
export const getWardrobeItems = async (req, res, next) => {
  try {
    const { category, search, season, isFavorite } = req.query;

    const query = { userId: req.user.id };

    if (category && category !== 'All') {
      query.category = category;
    }

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

    const items = await WardrobeItem.find(query).sort({ createdAt: -1 });

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
 * @desc    Add a new wardrobe item
 * @route   POST /api/v1/wardrobe
 * @access  Private
 */
export const addWardrobeItem = async (req, res, next) => {
  try {
    const {
      name,
      category,
      subcategory,
      brand,
      color,
      colorHex,
      price,
      image,
      imageUrl: directImageUrl,
      wearCount,
      season,
      tags,
    } = req.body;

    if (!name || !category || !color) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, and color for the item',
      });
    }

    let finalImageUrl = directImageUrl || image || '';

    if (req.file) {
      finalImageUrl = await uploadImage(
        req.file.buffer,
        req.file.mimetype,
        'stylesync/wardrobe'
      );
    }

    const parsedTags = Array.isArray(tags)
      ? tags
      : tags
      ? tags.split(',').map((t) => t.trim())
      : [];

    const item = await WardrobeItem.create({
      userId: req.user.id,
      name,
      category,
      subcategory: subcategory || '',
      brand: brand || '',
      color,
      colorHex: colorHex || '#000000',
      price: price ? Number(price) : 0,
      imageUrl: finalImageUrl,
      wearCount: wearCount ? Number(wearCount) : 0,
      season: season || 'All-Season',
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
