import express from 'express';
import {
  getBudget,
  updateBudgetLimit,
} from '../controllers/budgetController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getBudget);
router.patch('/limit', updateBudgetLimit);

export default router;
