import mongoose from 'mongoose';
import { Collection } from '../models/Collection.js';
import { WardrobeItem } from '../models/WardrobeItem.js';
import { Outfit } from '../models/Outfit.js';

/**
 * @desc    Fetch all collections created by the authenticated user
 * @route   GET /api/v1/collections
 * @access  Private
 */
export const getCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find({ userId: req.user.id })
      .populate('itemIds')
      .populate('outfitIds')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new capsule collection
 * @route   POST /api/v1/collections
 * @access  Private
 */
export const createCollection = async (req, res, next) => {
  try {
    const {
      name,
      category = 'Work',
      description = '',
      coverImage = '',
      itemIds = [],
      outfitIds = [],
      looks = [],
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a collection name',
      });
    }

    const collection = await Collection.create({
      userId: req.user.id,
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      coverImage,
      itemIds,
      outfitIds,
      looks,
    });

    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      data: collection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single collection by ID with populated items and outfits
 * @route   GET /api/v1/collections/:id
 * @access  Private
 */
export const getCollectionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection ID format',
      });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user.id,
    })
      .populate('itemIds')
      .populate('outfitIds');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    res.status(200).json({
      success: true,
      data: collection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update collection details
 * @route   PUT /api/v1/collections/:id
 * @access  Private
 */
export const updateCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, category, coverImage, itemIds, outfitIds, looks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection ID format',
      });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (category !== undefined) collection.category = category;
    if (coverImage !== undefined) collection.coverImage = coverImage;
    if (itemIds !== undefined) collection.itemIds = itemIds;
    if (outfitIds !== undefined) collection.outfitIds = outfitIds;
    if (looks !== undefined) collection.looks = looks;

    await collection.save();

    const updated = await Collection.findById(collection._id)
      .populate('itemIds')
      .populate('outfitIds');

    res.status(200).json({
      success: true,
      message: 'Collection updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a collection
 * @route   DELETE /api/v1/collections/:id
 * @access  Private
 */
export const deleteCollection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection ID format',
      });
    }

    const collection = await Collection.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Collection deleted',
      id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add items and outfits to a collection
 * @route   POST /api/v1/collections/:id/items
 * @access  Private
 */
export const addItemsToCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemIds = [], outfitIds = [] } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection ID format',
      });
    }

    const collection = await Collection.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found',
      });
    }

    // Append new item IDs avoiding duplicates
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      const existingItemSet = new Set(collection.itemIds.map((item) => item.toString()));
      itemIds.forEach((itemId) => {
        if (itemId && !existingItemSet.has(itemId.toString())) {
          collection.itemIds.push(itemId);
          existingItemSet.add(itemId.toString());
        }
      });
    }

    // Append new outfit IDs avoiding duplicates
    if (Array.isArray(outfitIds) && outfitIds.length > 0) {
      const existingOutfitSet = new Set(collection.outfitIds.map((outfit) => outfit.toString()));
      outfitIds.forEach((outfitId) => {
        if (outfitId && !existingOutfitSet.has(outfitId.toString())) {
          collection.outfitIds.push(outfitId);
          existingOutfitSet.add(outfitId.toString());
        }
      });
    }

    await collection.save();

    const updated = await Collection.findById(collection._id)
      .populate('itemIds')
      .populate('outfitIds');

    res.status(200).json({
      success: true,
      message: 'Items updated in collection successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
