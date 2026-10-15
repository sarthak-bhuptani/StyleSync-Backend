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
        monthlyLimit: 10000,
        currency: '₹',
        categoryAllocations: {
          tops: 2000,
          bottoms: 2000,
          outerwear: 1500,
          shoes: 3000,
          accessories: 1500,
        },
        monthlyHistory: [
          { month: '2026-05', monthName: 'May', limit: 10000, spent: 6800, saved: 3200 },
          { month: '2026-06', monthName: 'Jun', limit: 10000, spent: 7500, saved: 2500 },
          { month: '2026-07', monthName: 'Jul', limit: 10000, spent: 8200, saved: 1800 },
          { month: '2026-08', monthName: 'Aug', limit: 10000, spent: 5400, saved: 4600 },
          { month: '2026-09', monthName: 'Sep', limit: 10000, spent: 6100, saved: 3900 },
          { month: '2026-10', monthName: 'Oct', limit: 10000, spent: 3450, saved: 6550 },
        ],
      });
    }

    // Determine target month/year
    const { monthYear } = req.query;
    let startDate;
    let endDate;

    if (monthYear && /^\d{4}-\d{2}$/.test(monthYear)) {
      const [year, month] = monthYear.split('-').map(Number);
      startDate = new Date(Date.UTC(year, month - 1, 1));
      endDate = new Date(Date.UTC(year, month, 1));
    } else {
      const now = new Date();
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    }

    const currentMonthPurchases = await Purchase.find({
      userId: req.user.id,
      $or: [
        { purchasedAt: { $gte: startDate, $lt: endDate } },
        { date: { $gte: startDate, $lt: endDate } },
      ],
    });

    const currentSpent = currentMonthPurchases.reduce(
      (sum, p) => sum + (p.price || 0),
      0
    );

    // Group expenses into primary categories
    let clothingSpent = 0;
    let shoesSpent = 0;
    let accessoriesSpent = 0;
    let otherSpent = 0;

    currentMonthPurchases.forEach((p) => {
      const cat = (p.category || '').toLowerCase();
      const pr = Number(p.price) || 0;
      if (cat.includes('shoe') || cat.includes('sneaker') || cat.includes('footwear') || cat.includes('boot')) {
        shoesSpent += pr;
      } else if (cat.includes('access') || cat.includes('eyewear') || cat.includes('bag') || cat.includes('watch') || cat.includes('belt')) {
        accessoriesSpent += pr;
      } else if (
        cat.includes('top') ||
        cat.includes('bottom') ||
        cat.includes('shirt') ||
        cat.includes('pant') ||
        cat.includes('jean') ||
        cat.includes('dress') ||
        cat.includes('outer') ||
        cat.includes('jacket') ||
        cat.includes('cloth')
      ) {
        clothingSpent += pr;
      } else {
        otherSpent += pr;
      }
    });

    const monthlyLimit = budget.monthlyLimit || 10000;
    const remainingBudget = Math.max(0, monthlyLimit - currentSpent);
    const percentUsed =
      monthlyLimit > 0
        ? Math.min(100, Math.round((currentSpent / monthlyLimit) * 100))
        : 0;

    // Proportional or configured allocations
    const clothingAllocated = Math.round(monthlyLimit * 0.4);
    const shoesAllocated = Math.round(monthlyLimit * 0.3);
    const accessoriesAllocated = Math.round(monthlyLimit * 0.2);
    const otherAllocated = Math.max(0, monthlyLimit - clothingAllocated - shoesAllocated - accessoriesAllocated);

    const categories = [
      { name: 'Clothing', allocated: clothingAllocated, spent: clothingSpent, color: '#10B981' },
      { name: 'Shoes', allocated: shoesAllocated, spent: shoesSpent, color: '#3B82F6' },
      { name: 'Accessories', allocated: accessoriesAllocated, spent: accessoriesSpent, color: '#F59E0B' },
      { name: 'Other', allocated: otherAllocated, spent: otherSpent, color: '#8B5CF6' },
    ];

    const sixMonthTrends = (budget.monthlyHistory || []).slice(-6).map((m) => ({
      month: m.monthName || m.month,
      spent: m.spent || 0,
      limit: m.limit || monthlyLimit,
      saved: m.saved || 0,
    }));

    res.status(200).json({
      success: true,
      monthlyLimit,
      spentThisMonth: currentSpent,
      remainingBudget,
      currency: budget.currency || '₹',
      categories,
      sixMonthTrends,
      data: {
        monthlyLimit,
        spentThisMonth: currentSpent,
        remainingBudget,
        currency: budget.currency || '₹',
        categories,
        currentSpent,
        remaining: remainingBudget,
        percentUsed,
        categoryAllocations: budget.categoryAllocations,
        monthlyHistory: budget.monthlyHistory,
        sixMonthTrends,
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
    const { limit, monthlyLimit, categoryAllocations, currency } = req.body;

    const newLimit =
      monthlyLimit !== undefined
        ? Number(monthlyLimit)
        : limit !== undefined
        ? Number(limit)
        : undefined;

    let budget = await Budget.findOne({ userId: req.user.id });
    if (!budget) {
      budget = new Budget({ userId: req.user.id });
    }

    if (newLimit !== undefined && !isNaN(newLimit) && newLimit >= 0) {
      budget.monthlyLimit = newLimit;
    }

    if (currency) {
      budget.currency = currency;
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
      monthlyLimit: budget.monthlyLimit,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add clothing purchase expense to monthly budget tracking
 * @route   POST /api/v1/budget/expense
 * @access  Private
 */
export const addExpense = async (req, res, next) => {
  try {
    const {
      amount,
      price,
      category = 'Clothing',
      productName,
      name,
      notes = '',
      brand = '',
      date,
      purchaseId,
    } = req.body;

    const expenseAmount = Number(amount !== undefined ? amount : price);

    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive expense amount or price',
      });
    }

    const finalProductName = name || productName || `${category} Expense`;
    const expenseDate = date ? new Date(date) : new Date();

    // 1. Create or link Purchase record
    let purchase;
    if (purchaseId && /^[0-9a-fA-F]{24}$/.test(purchaseId)) {
      purchase = await Purchase.findOne({ _id: purchaseId, userId: req.user.id });
    }

    if (!purchase) {
      purchase = await Purchase.create({
        userId: req.user.id,
        productName: finalProductName,
        price: expenseAmount,
        category,
        brand,
        notes,
        purchasedAt: expenseDate,
        date: expenseDate,
      });
    }

    // 2. Update Budget monthly spent & history
    let budget = await Budget.findOne({ userId: req.user.id });
    if (!budget) {
      budget = await Budget.create({ userId: req.user.id, monthlyLimit: 10000 });
    }

    const monthStr = expenseDate.toISOString().slice(0, 7); // e.g. "2026-10"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[expenseDate.getMonth()];

    if (!budget.monthlyHistory) {
      budget.monthlyHistory = [];
    }

    let historyEntry = budget.monthlyHistory.find((m) => m.month === monthStr);
    if (!historyEntry) {
      historyEntry = {
        month: monthStr,
        monthName,
        limit: budget.monthlyLimit,
        spent: 0,
        saved: budget.monthlyLimit,
      };
      budget.monthlyHistory.push(historyEntry);
    }

    historyEntry.spent += expenseAmount;
    historyEntry.saved = Math.max(0, historyEntry.limit - historyEntry.spent);

    await budget.save();

    res.status(201).json({
      success: true,
      message: 'Clothing expense added to monthly budget tracking',
      data: {
        purchase,
        budget,
        spentThisMonth: historyEntry.spent,
        monthlyLimit: budget.monthlyLimit,
        remainingBudget: Math.max(0, budget.monthlyLimit - historyEntry.spent),
      },
    });
  } catch (error) {
    next(error);
  }
};
