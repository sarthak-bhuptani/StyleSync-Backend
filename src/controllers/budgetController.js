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

    const categoriesArray = [
      { name: 'Tops', allocated: budget.categoryAllocations?.tops || 8000, spent: categorySpent.tops },
      { name: 'Bottoms', allocated: budget.categoryAllocations?.bottoms || 7000, spent: categorySpent.bottoms },
      { name: 'Shoes', allocated: budget.categoryAllocations?.shoes || 6000, spent: categorySpent.shoes },
      { name: 'Outerwear', allocated: budget.categoryAllocations?.outerwear || 4000, spent: categorySpent.outerwear },
    ];

    const sixMonthTrends = (budget.monthlyHistory || []).slice(-6).map((m) => ({
      month: m.monthName || m.month,
      spent: m.spent || 0,
      limit: m.limit || budget.monthlyLimit,
      saved: m.saved || 0,
    }));

    res.status(200).json({
      success: true,
      monthlyLimit: budget.monthlyLimit,
      spentThisMonth: currentSpent,
      currency: budget.currency || '₹',
      categories: categoriesArray,
      sixMonthTrends: sixMonthTrends.length > 0 ? sixMonthTrends : [
        { month: 'Apr', spent: 12000 },
        { month: 'May', spent: 18500 },
        { month: 'Jun', spent: currentSpent || 14200 },
      ],
      data: {
        monthlyLimit: budget.monthlyLimit,
        currentSpent,
        spentThisMonth: currentSpent,
        remaining,
        percentUsed,
        currency: budget.currency || '₹',
        categoryAllocations: budget.categoryAllocations,
        categorySpent,
        categories: categoriesArray,
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
      category = 'Tops',
      productName,
      name,
      notes = '',
      brand = '',
      date,
    } = req.body;

    const expenseAmount = Number(amount !== undefined ? amount : price);

    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive expense amount or price',
      });
    }

    const finalProductName = productName || name || `${category} Purchase`;
    const expenseDate = date ? new Date(date) : new Date();

    // 1. Create Purchase record in Database
    const purchase = await Purchase.create({
      userId: req.user.id,
      productName: finalProductName,
      price: expenseAmount,
      category,
      brand,
      notes,
      purchasedAt: expenseDate,
      date: expenseDate,
    });

    // 2. Update Budget monthly spent
    let budget = await Budget.findOne({ userId: req.user.id });
    if (!budget) {
      budget = await Budget.create({ userId: req.user.id, monthlyLimit: 25000 });
    }

    if (budget.monthlyHistory && budget.monthlyHistory.length > 0) {
      const currentMonth = budget.monthlyHistory[budget.monthlyHistory.length - 1];
      if (currentMonth) {
        currentMonth.spent += expenseAmount;
        currentMonth.saved = Math.max(0, currentMonth.limit - currentMonth.spent);
      }
    }

    await budget.save();

    res.status(201).json({
      success: true,
      message: 'Clothing expense added to monthly budget tracking',
      data: {
        purchase,
        budget,
      },
    });
  } catch (error) {
    next(error);
  }
};


