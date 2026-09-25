import express from 'express';
import {
  getBudget,
  updateBudgetLimit,
  addExpense,
} from '../controllers/budgetController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getBudget);
router.patch('/limit', updateBudgetLimit);
router.post('/expense', addExpense);

export default router;

