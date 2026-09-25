import { Purchase } from '../models/Purchase.js';
import { Budget } from '../models/Budget.js';
import { uploadImage } from '../config/cloudinary.js';

/**
 * @desc    Get all recorded purchases
 * @route   GET /api/v1/purchases
 * @access  Private
 */
export const getPurchases = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ userId: req.user.id }).sort({
      purchasedAt: -1,
    });

    const totalSpent = purchases.reduce((sum, item) => sum + (item.price || 0), 0);
    const avgScore =
      purchases.length > 0
        ? Math.round(
            purchases.reduce((sum, item) => sum + (item.buyWiseScore || 0), 0) /
              purchases.length
          )
        : 0;

    res.status(200).json({
      success: true,
      count: purchases.length,
      metrics: {
        totalSpent,
        avgStyleSyncScore: avgScore,
      },
      data: purchases,
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
      image,
      imageUrl: directImageUrl,
    } = req.body;

    if (!productName || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide productName and price',
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
      productName,
      price: Number(price),
      currency: currency || '₹',
      category,
      brand,
      buyWiseScore: Number(buyWiseScore),
      notes,
      feedback: userFeedback || feedback || 'pending',
      rating: userRating !== undefined ? Number(userRating) : rating !== undefined ? Number(rating) : 5,
      imageUrl: finalImageUrl,
      date: purchaseDate,
      purchasedAt: purchaseDate,
    });

    // Optionally update user budget spent for the current month
    const budget = await Budget.findOne({ userId: req.user.id });
    if (budget && budget.monthlyHistory.length > 0) {
      const currentMonthEntry = budget.monthlyHistory[budget.monthlyHistory.length - 1];
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
    const { feedback, userFeedback, rating, userRating } = req.body;

    const finalFeedback = userFeedback !== undefined ? userFeedback : feedback;
    const finalRating = userRating !== undefined ? userRating : rating;

    if (!finalFeedback && finalRating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide feedback ("good" | "bad") or rating (1-5)',
      });
    }

    const purchase = await Purchase.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase record not found',
      });
    }

    if (finalFeedback !== undefined) purchase.feedback = finalFeedback;
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
    const purchase = await Purchase.findOneAndDelete({
      _id: req.params.id,
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
      message: 'Purchase deleted.',
    });
  } catch (error) {
    next(error);
  }
};

