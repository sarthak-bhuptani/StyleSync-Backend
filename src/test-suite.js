import assert from 'assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
  analyzePhysicalTraits,
  evaluateProductWithGemini,
  generateOutfitWithAI,
  chatWithAIStylist,
} from './services/geminiVisionService.js';
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

  // 2. AI Physical Traits Calibration Service Validation
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

  // 3. AI Flagship Product Advisor Service
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

  // 4. AI Outfit Builder Service
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

  // 5. AI Chat Stylist Service
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
