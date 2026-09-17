import mongoose from 'mongoose';
import dns from 'dns';
import { User } from './models/User.js';
import { WardrobeItem } from './models/WardrobeItem.js';
import { AnalyzedProduct } from './models/AnalyzedProduct.js';
import { Outfit } from './models/Outfit.js';
import { Purchase } from './models/Purchase.js';
import { Budget } from './models/Budget.js';
import { config } from './config/env.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

const clearAllData = async () => {
  try {
    console.log('[Clear] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[Clear] Connected successfully.');

    const userCount = await User.countDocuments();
    const wardrobeCount = await WardrobeItem.countDocuments();
    const productCount = await AnalyzedProduct.countDocuments();
    const outfitCount = await Outfit.countDocuments();
    const purchaseCount = await Purchase.countDocuments();
    const budgetCount = await Budget.countDocuments();

    console.log(`[Clear] Current records before wiping:`);
    console.log(`  - Users: ${userCount}`);
    console.log(`  - Wardrobe Items: ${wardrobeCount}`);
    console.log(`  - Analyzed Products: ${productCount}`);
    console.log(`  - Outfits: ${outfitCount}`);
    console.log(`  - Purchases: ${purchaseCount}`);
    console.log(`  - Budgets: ${budgetCount}`);

    console.log('[Clear] Deleting all records across all collections...');
    await Promise.all([
      User.deleteMany({}),
      WardrobeItem.deleteMany({}),
      AnalyzedProduct.deleteMany({}),
      Outfit.deleteMany({}),
      Purchase.deleteMany({}),
      Budget.deleteMany({}),
    ]);

    console.log('✅ [Clear] All users, login credentials, and dummy data have been completely wiped!');
    console.log('✨ [Clear] The database is now 100% clean and ready for fresh registration and testing.');

    process.exit(0);
  } catch (error) {
    console.error('❌ [Clear Error]:', error.message);
    process.exit(1);
  }
};

clearAllData();
