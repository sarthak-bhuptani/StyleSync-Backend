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

    const purchase = await Purchase.create({
      userId: req.user.id,
      productName,
      price: Number(price),
      category,
      brand,
      buyWiseScore: Number(buyWiseScore),
      notes,
      imageUrl: finalImageUrl,
      purchasedAt: new Date(),
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
    const { feedback, rating } = req.body;

    if (!feedback && rating === undefined) {
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

    if (feedback) purchase.feedback = feedback;
    if (rating !== undefined) purchase.rating = Number(rating);

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
