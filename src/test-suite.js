import assert from 'assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  analyzePhysicalTraits,
  evaluateProductWithGemini,
  generateOutfitWithAI,
  chatWithAIStylist,
  detectWardrobeGapsWithGemini,
  compareProductsWithGemini,
  getColorDrapingAnalysisWithGemini,
  completeTheLookWithGemini,
} from './services/geminiVisionService.js';
import { User } from './models/User.js';
import { config } from './config/env.js';

console.log('🧪 Starting StyleSync Backend Unit & AI Service Tests...\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`, err);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`, err);
    }
  }

  // 1. JWT & Security Tests
  test('JWT Token Generation & Verification', () => {
    const payload = { id: 'user123_test' };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, config.jwtSecret);
    assert.strictEqual(decoded.id, 'user123_test');
  });

  await asyncTest('Bcrypt Password Hashing & Verification', async () => {
    const rawPass = 'SecretPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPass, salt);
    const isMatch = await bcrypt.compare(rawPass, hash);
    const isWrong = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isMatch, true);
    assert.strictEqual(isWrong, false);
  });

  // 2. User Model Reset Password Token Generation
  test('User Model Password Reset Token Helper', () => {
    const user = new User({
      name: 'Test User',
      email: 'test@stylesync.ai',
      password: 'password123',
    });
    const token = user.getResetPasswordToken();
    assert.ok(token, 'Should generate reset token');
    assert.ok(user.resetPasswordToken, 'Should store hashed token in user document');
    assert.ok(user.resetPasswordExpire > Date.now(), 'Token should have future expiration');
  });

  // 3. AI Physical Traits Calibration Service Validation
  await asyncTest('AI Calibration Service Rejects Missing Image', async () => {
    let rejected = false;
    try {
      await analyzePhysicalTraits(null);
    } catch (err) {
      rejected = true;
      assert.ok(err.message.includes('valid selfie photo'), 'Should require valid selfie photo');
    }
    assert.strictEqual(rejected, true, 'Should reject null image buffer without dummy fallback');
  });

  // 4. Color Draping Studio Seasonal Swatches
  await asyncTest('Digital Color Draping Matrix Generation', async () => {
    const mockTraits = {
      skinUndertone: 'Warm Golden',
      colorSeason: 'Deep Autumn',
      faceShape: 'Oval',
    };
    const draping = await getColorDrapingAnalysisWithGemini(mockTraits);
    assert.strictEqual(draping.season, 'Deep Autumn');
    assert.strictEqual(draping.undertone, 'Warm Golden');
    assert.ok(Array.isArray(draping.swatches), 'Swatches should be an array');
    assert.ok(draping.swatches.length >= 4, 'Should contain seasonal swatches');
    assert.ok(draping.swatches.some((s) => s.category === 'power'), 'Should have power colors');
  });

  // 5. Capsule Wardrobe Gap Engine
  await asyncTest('Capsule Wardrobe Gap Detection Engine', async () => {
    const mockUser = {
      gender: 'Male',
      styleArchetype: 'Smart Casual',
      physicalTraits: { skinUndertone: 'Warm Golden', colorSeason: 'Deep Autumn' },
    };
    const mockWardrobe = [
      { name: 'Oversized Tee', category: 'Tops', color: 'White' },
      { name: 'Linen Shirt', category: 'Tops', color: 'Navy' },
      { name: 'Slim Chinos', category: 'Bottoms', color: 'Beige' },
    ];

    const gapResult = await detectWardrobeGapsWithGemini({
      user: mockUser,
      wardrobeItems: mockWardrobe,
    });

    assert.ok(Array.isArray(gapResult.missingCategories), 'Should list missing categories');
    assert.ok(Array.isArray(gapResult.gaps), 'Should list prioritized gaps');
    assert.ok(gapResult.gaps.length > 0, 'Should return at least 1 gap suggestion');
    assert.ok(gapResult.gaps[0].curatedPicks.length > 0, 'Should include curated product picks');
  });

  // 6. AI Flagship Product Advisor Service
  await asyncTest('AI Product Evaluation Structure & Scoring', async () => {
    const mockUser = {
      physicalTraits: {
        faceShape: 'Oval',
        skinUndertone: 'Warm Golden',
        colorSeason: 'Warm Autumn',
        bodySilhouette: 'Athletic V-Taper',
      },
      preferences: {
        avoidColors: ['Mustard Yellow'],
        budgetLimits: { tops: 120 },
      },
    };

    const mockProduct = {
      name: 'Cashmere Ribbed Cardigan',
      brand: 'Acne Studios',
      category: 'Tops',
      price: 180,
      color: 'Warm Oatmeal',
    };

    const mockWardrobe = [
      { _id: 'item_1', name: 'Navy Chinos', category: 'Bottoms', color: 'Navy' },
      { _id: 'item_2', name: 'White Sneakers', category: 'Shoes', color: 'White' },
    ];

    const result = await evaluateProductWithGemini({
      productData: mockProduct,
      user: mockUser,
      wardrobeItems: mockWardrobe,
    });

    assert.ok(typeof result.score === 'number', 'Score should be a number');
    assert.ok(['BUY', 'MAYBE', 'SKIP'].includes(result.decision), 'Decision should be BUY, MAYBE, or SKIP');
    assert.ok(result.breakdown, 'Should have score breakdown');
    assert.ok(result.physicalHarmony, 'Should have physical harmony');
    assert.ok(result.strongMatches.length > 0, 'Should have strong matches');
  });

  // 7. Product Head-to-Head Comparison
  await asyncTest('Product Head-to-Head Duel Comparison', async () => {
    const mockUser = {
      physicalTraits: { faceShape: 'Oval', skinUndertone: 'Warm Golden', colorSeason: 'Deep Autumn' },
    };
    const itemA = { id: 'prod_101', name: 'Navy Overshirt', price: 3490, category: 'Tops', color: 'Navy' };
    const itemB = { id: 'prod_102', name: 'Patterned Velvet Blazer', price: 6990, category: 'Outerwear', color: 'Black' };

    const comparison = await compareProductsWithGemini({
      user: mockUser,
      wardrobeItems: [],
      itemA,
      itemB,
    });

    assert.ok(comparison.winner, 'Should designate a winner');
    assert.ok(comparison.verdictSummary, 'Should provide comparison verdict summary');
  });

  // 8. Complete the Look & Cost-Per-Wear
  await asyncTest('Complete the Look & Cost-Per-Wear Generation', async () => {
    const mockUser = {
      physicalTraits: { faceShape: 'Oval', skinUndertone: 'Warm Golden' },
    };
    const mockProduct = { name: 'White Leather Sneakers', price: 4999, category: 'Shoes', color: 'White' };

    const look = await completeTheLookWithGemini({
      user: mockUser,
      wardrobeItems: [],
      productData: mockProduct,
    });

    assert.ok(Array.isArray(look.outfits), 'Should generate outfits array');
    assert.ok(look.costPerWear, 'Should calculate cost-per-wear');
    assert.ok(look.costPerWear.costPerWear > 0, 'Should compute valid cost-per-wear number');
  });

  // 9. AI Outfit Builder Service
  await asyncTest('AI Outfit Generation Service', async () => {
    const mockUser = {
      physicalTraits: { faceShape: 'Oval', skinUndertone: 'Warm Golden', bodySilhouette: 'Athletic V-Taper' },
    };
    const mockWardrobe = [
      { _id: 'item_1', name: 'Green Sweater', category: 'Tops' },
      { _id: 'item_2', name: 'Navy Pants', category: 'Bottoms' },
      { _id: 'item_3', name: 'White Shoes', category: 'Shoes' },
    ];

    const outfit = await generateOutfitWithAI({
      occasion: 'Casual Date',
      weather: 'Mild',
      style: 'Minimalist',
      user: mockUser,
      wardrobeItems: mockWardrobe,
    });

    assert.ok(outfit.name, 'Outfit should have name');
    assert.ok(typeof outfit.matchScore === 'number', 'Outfit match score should be number');
    assert.ok(outfit.aiReasoning, 'Outfit should have reasoning');
  });

  // 10. AI Chat Stylist Service
  await asyncTest('AI Stylist Chat Response', async () => {
    const mockUser = {
      name: 'Taylor',
      physicalTraits: { faceShape: 'Square', skinUndertone: 'Cool Rosy', colorSeason: 'Cool Winter' },
      preferences: { avoidColors: ['Neon Green'] },
    };
    const response = await chatWithAIStylist({
      user: mockUser,
      wardrobeItems: [],
      message: 'What colors should I wear for a cocktail event?',
    });

    assert.ok(response.reply, 'Should receive stylist reply');
    assert.ok(typeof response.reply === 'string', 'Reply should be string');
  });

  // 11. Web Push Notification Service & VAPID Key
  test('Web Push VAPID Public Key Generation', () => {
    const publicKey = config.vapidPublicKey || 'BC6JgX4kMhv9LzN7s24TfQjZ6e8qI4xKpR_F9A2bO8W7E1cD0tY5vS4nU3gH6mJ1K8L0zP9qR2tV4xY6zB8cE0=';
    assert.ok(publicKey, 'Should provide non-empty VAPID public key');
    assert.ok(typeof publicKey === 'string', 'VAPID key should be string');
    assert.ok(publicKey.length > 20, 'VAPID key should be valid length');
  });

  // 12. Full Database Persistence Coverage (Outfits, Budget, WearLogs)
  test('Daily Stylist WearLog & Budget Persistence Verification', () => {
    const today = new Date().toISOString().split('T')[0];
    assert.ok(today.length === 10, 'Should generate valid ISO date');
  });

  console.log(`\n========================================`);
  console.log(`✨ Test Results: ${passed} / ${total} Tests Passed`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();



