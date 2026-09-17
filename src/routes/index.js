import express from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import wardrobeRoutes from './wardrobeRoutes.js';
import productRoutes from './productRoutes.js';
import outfitRoutes from './outfitRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';
import budgetRoutes from './budgetRoutes.js';
import chatRoutes from './chatRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/wardrobe', wardrobeRoutes);
router.use('/products', productRoutes);
router.use('/outfits', outfitRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/budget', budgetRoutes);
router.use('/chat', chatRoutes);

export default router;
