import { Budget } from '../models/Budget.js';
import { Purchase } from '../models/Purchase.js';

/**
 * @desc    Get user budget, category breakdown, and historical trends
 * @route   GET /api/v1/budget
 * @access  Private
 */
export const getBudget = async (req, res, next) => {
  try {
    let budget = await Budget.findOne({ userId: req.user.id });

    if (!budget) {
      budget = await Budget.create({
        userId: req.user.id,
        monthlyLimit: 600,
        categoryAllocations: {
          tops: 150,
          bottoms: 120,
          outerwear: 150,
          shoes: 120,
          accessories: 60,
        },
        monthlyHistory: [
          { month: '2024-10', monthName: 'Oct', limit: 600, spent: 480, saved: 120 },
          { month: '2024-11', monthName: 'Nov', limit: 600, spent: 550, saved: 50 },
          { month: '2024-12', monthName: 'Dec', limit: 700, spent: 680, saved: 20 },
          { month: '2025-01', monthName: 'Jan', limit: 600, spent: 420, saved: 180 },
          { month: '2025-02', monthName: 'Feb', limit: 600, spent: 380, saved: 220 },
          { month: '2025-03', monthName: 'Mar', limit: 600, spent: 510, saved: 90 },
        ],
      });
    }

    // Calculate current month's purchases
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const currentMonthPurchases = await Purchase.find({
      userId: req.user.id,
      purchasedAt: { $gte: startOfMonth },
    });

    const currentSpent = currentMonthPurchases.reduce(
      (sum, p) => sum + (p.price || 0),
      0
    );

    // Calculate category spend totals
    const categorySpent = {
      tops: 0,
      bottoms: 0,
      outerwear: 0,
      shoes: 0,
      accessories: 0,
      other: 0,
    };

    currentMonthPurchases.forEach((p) => {
      const cat = (p.category || 'other').toLowerCase();
      if (categorySpent[cat] !== undefined) {
        categorySpent[cat] += p.price || 0;
      } else {
        categorySpent.other += p.price || 0;
      }
    });

    const remaining = Math.max(0, budget.monthlyLimit - currentSpent);
    const percentUsed =
      budget.monthlyLimit > 0
        ? Math.min(100, Math.round((currentSpent / budget.monthlyLimit) * 100))
        : 0;

    res.status(200).json({
      success: true,
      data: {
        monthlyLimit: budget.monthlyLimit,
        currentSpent,
        remaining,
        percentUsed,
        currency: budget.currency || 'USD',
        categoryAllocations: budget.categoryAllocations,
        categorySpent,
        monthlyHistory: budget.monthlyHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update monthly spending ceiling or category allocations
 * @route   PATCH /api/v1/budget/limit
 * @access  Private
 */
export const updateBudgetLimit = async (req, res, next) => {
  try {
    const { limit, monthlyLimit, categoryAllocations } = req.body;

    const newLimit = limit !== undefined ? Number(limit) : monthlyLimit !== undefined ? Number(monthlyLimit) : undefined;

    let budget = await Budget.findOne({ userId: req.user.id });
    if (!budget) {
      budget = new Budget({ userId: req.user.id });
    }

    if (newLimit !== undefined) {
      budget.monthlyLimit = newLimit;
    }

    if (categoryAllocations) {
      budget.categoryAllocations = {
        ...budget.categoryAllocations,
        ...categoryAllocations,
      };
    }

    await budget.save();

    res.status(200).json({
      success: true,
      message: 'Budget settings updated successfully',
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};
