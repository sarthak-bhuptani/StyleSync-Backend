import mongoose from 'mongoose';
import { Purchase } from '../models/Purchase.js';
import { Budget } from '../models/Budget.js';
import { uploadImage } from '../config/cloudinary.js';

/**
 * @desc    Get all recorded purchases with CPW and rating
 * @route   GET /api/v1/purchases
 * @access  Private
 */
export const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ userId: req.user.id }).sort({
      purchasedAt: -1,
      createdAt: -1,
    });

    const totalSpent = purchases.reduce((sum, item) => sum + (item.price || 0), 0);
    const avgScore =
      purchases.length > 0
        ? Math.round(
            purchases.reduce((sum, item) => sum + (item.buyWiseScore || 0), 0) /
              purchases.length
          )
        : 0;

    const formattedPurchases = purchases.map((p) => {
      const wearCount = p.wearCount || 0;
      const costPerWear = wearCount > 0 ? Number((p.price / wearCount).toFixed(1)) : p.price;
      const formattedDate = p.date
        ? p.date.toISOString().split('T')[0]
        : p.purchasedAt
        ? p.purchasedAt.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      return {
        id: p._id.toString(),
        _id: p._id,
        name: p.productName,
        productName: p.productName,
        brand: p.brand || '',
        category: p.category || 'Tops',
        price: p.price,
        currency: p.currency || '₹',
        date: formattedDate,
        imageUrl: p.imageUrl || '',
        wearCount,
        costPerWear,
        userRating: p.rating || 5,
        userFeedback: p.feedback || '',
        buyWiseScore: p.buyWiseScore || 85,
        createdAt: p.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedPurchases.length,
      metrics: {
        totalSpent,
        avgStyleSyncScore: avgScore,
      },
      data: formattedPurchases,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a new purchase
 * @route   POST /api/v1/purchases
 * @access  Private
 */
export const recordPurchase = async (req, res, next) => {
  try {
    const {
      name,
      productName,
      price,
      category = 'Tops',
      brand = '',
      buyWiseScore = 85,
      notes = '',
      currency = '₹',
      date,
      feedback,
      userFeedback,
      rating,
      userRating,
      wearCount = 0,
      image,
      imageUrl: directImageUrl,
    } = req.body;

    const finalName = name || productName;

    if (!finalName || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product name and price',
      });
    }

    let finalImageUrl = directImageUrl || image || '';
    if (req.file) {
      finalImageUrl = await uploadImage(
        req.file.buffer,
        req.file.mimetype,
        'stylesync/purchases'
      );
    }

    const purchaseDate = date ? new Date(date) : new Date();

    const purchase = await Purchase.create({
      userId: req.user.id,
      productName: finalName.trim(),
      price: Number(price),
      currency: currency || '₹',
      category: category.trim(),
      brand: brand.trim(),
      buyWiseScore: Number(buyWiseScore) || 85,
      notes,
      wearCount: Number(wearCount) || 0,
      feedback: userFeedback !== undefined ? userFeedback : feedback || '',
      rating: userRating !== undefined ? Number(userRating) : rating !== undefined ? Number(rating) : 5,
      imageUrl: finalImageUrl,
      date: purchaseDate,
      purchasedAt: purchaseDate,
    });

    // Update user budget spent for current month
    const budget = await Budget.findOne({ userId: req.user.id });
    if (budget && budget.monthlyHistory && budget.monthlyHistory.length > 0) {
      const currentMonthStr = purchaseDate.toISOString().slice(0, 7);
      let currentMonthEntry = budget.monthlyHistory.find((m) => m.month === currentMonthStr);
      if (!currentMonthEntry) {
        currentMonthEntry = budget.monthlyHistory[budget.monthlyHistory.length - 1];
      }
      if (currentMonthEntry) {
        currentMonthEntry.spent += Number(price);
        currentMonthEntry.saved = Math.max(0, currentMonthEntry.limit - currentMonthEntry.spent);
        await budget.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Purchase recorded successfully',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update feedback & rating on past purchase (AI memory loop)
 * @route   PATCH /api/v1/purchases/:id/feedback
 * @access  Private
 */
export const updateFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback, userFeedback, rating, userRating } = req.body;

    const finalFeedback = userFeedback !== undefined ? userFeedback : feedback;
    const finalRating = userRating !== undefined ? userRating : rating;

    if (finalFeedback === undefined && finalRating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide feedback or rating (1-5)',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase ID format',
      });
    }

    const purchase = await Purchase.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found',
      });
    }

    if (finalFeedback !== undefined) purchase.feedback = String(finalFeedback);
    if (finalRating !== undefined) purchase.rating = Number(finalRating);

    await purchase.save();

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully. AI recommendation memory refined.',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete purchase record
 * @route   DELETE /api/v1/purchases/:id
 * @access  Private
 */
export const deletePurchase = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase ID format',
      });
    }

    const purchase = await Purchase.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found',
      });
    }

    res.status(200).json({
      success: true,
      id,
      message: 'Purchase deleted',
    });
  } catch (error) {
    next(error);
  }
};
