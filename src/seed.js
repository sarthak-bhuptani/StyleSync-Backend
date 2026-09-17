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

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected. Clearing previous demo data...');

    await User.deleteMany({ email: 'demo@stylesync.ai' });
    
    // Create Demo User
    const demoUser = await User.create({
      name: 'Alex Vance',
      email: 'demo@stylesync.ai',
      password: 'password123',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      isOnboarded: true,
      onboardingStep: 6,
      physicalTraits: {
        faceShape: 'Oval',
        skinUndertone: 'Warm Golden',
        colorSeason: 'Warm Autumn',
        bodySilhouette: 'Athletic V-Taper',
        hairColor: 'Deep Chestnut',
        eyeColor: 'Hazel',
        height: "5'11\"",
        weight: '165 lbs',
        calibrationConfidence: '96%',
        calibrationNotes: 'Balanced high cheekbones with warm undertone. Flattered by structured shoulders, rich olive/terracotta/navy hues.',
        calibratedAt: new Date(),
      },
      preferences: {
        brandPreferences: ['Uniqlo', 'COS', 'Acne Studios', 'Lululemon', 'Theory'],
        sizes: { tops: 'M', bottoms: '32', outerwear: 'L', shoes: '10.5' },
        avoidColors: ['Mustard Yellow', 'Neon Green', 'Pastel Pink'],
        favoriteStyles: ['Smart Casual', 'Minimalist Scandinavian', 'Modern Tailoring'],
        budgetLimits: { tops: 120, bottoms: 160, outerwear: 300, shoes: 200, accessories: 75 },
      },
    });

    console.log(`[Seed] Demo User created: ${demoUser.email} (Password: password123)`);

    // Clean up associated items
    await WardrobeItem.deleteMany({ userId: demoUser._id });
    await AnalyzedProduct.deleteMany({ userId: demoUser._id });
    await Outfit.deleteMany({ userId: demoUser._id });
    await Purchase.deleteMany({ userId: demoUser._id });
    await Budget.deleteMany({ userId: demoUser._id });

    // Seed Wardrobe Items
    const wardrobe = await WardrobeItem.insertMany([
      {
        userId: demoUser._id,
        name: 'Merino Wool Crewneck Sweater',
        category: 'Tops',
        subcategory: 'Knitwear',
        brand: 'COS',
        color: 'Forest Green',
        colorHex: '#1E3A2F',
        price: 110,
        imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80',
        wearCount: 14,
        season: 'Fall/Winter',
        tags: ['smart casual', 'warm', 'layering'],
        isFavorite: true,
      },
      {
        userId: demoUser._id,
        name: 'Relaxed Tapered Chinos',
        category: 'Bottoms',
        subcategory: 'Chinos',
        brand: 'Uniqlo U',
        color: 'Navy Blue',
        colorHex: '#1A2A44',
        price: 50,
        imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80',
        wearCount: 22,
        season: 'All-Season',
        tags: ['versatile', 'office', 'weekend'],
        isFavorite: true,
      },
      {
        userId: demoUser._id,
        name: 'Structured Wool Overcoat',
        category: 'Outerwear',
        subcategory: 'Coat',
        brand: 'Theory',
        color: 'Charcoal Grey',
        colorHex: '#36383E',
        price: 340,
        imageUrl: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=600&q=80',
        wearCount: 8,
        season: 'Fall/Winter',
        tags: ['formal', 'warm', 'tailored'],
        isFavorite: false,
      },
      {
        userId: demoUser._id,
        name: 'Minimalist Leather Low-Tops',
        category: 'Shoes',
        subcategory: 'Sneakers',
        brand: 'Common Projects',
        color: 'Off-White',
        colorHex: '#F4F1EA',
        price: 240,
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
        wearCount: 35,
        season: 'All-Season',
        tags: ['everyday', 'casual', 'clean'],
        isFavorite: true,
      },
    ]);

    console.log(`[Seed] Added ${wardrobe.length} Wardrobe Items.`);

    // Seed Analyzed Products
    const evaluatedProduct = await AnalyzedProduct.create({
      userId: demoUser._id,
      name: 'Cashmere Ribbed Cardigan',
      brand: 'Acne Studios',
      category: 'Tops',
      price: 180,
      color: 'Warm Oatmeal',
      imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=600&q=80',
      description: 'Luxurious 100% Mongolian cashmere ribbed cardigan with horn buttons.',
      score: 89,
      decision: 'BUY',
      confidence: '95%',
      breakdown: {
        styleMatch: { score: 24, max: 25 },
        colorMatch: { score: 19, max: 20 },
        wardrobeMatch: { score: 18, max: 20 },
        versatility: { score: 14, max: 15 },
        budget: { score: 6, max: 10 },
        occasion: { score: 8, max: 10 },
      },
      aiExplanation: 'The warm oatmeal shade creates effortless color harmony with your Warm Autumn palette. Its relaxed shoulders beautifully drape your athletic build and pair directly with your navy chinos and off-white sneakers.',
      strongMatches: [
        'Ideal high-contrast synergy with Warm Golden skin undertone',
        'Direct outfit pairing with 3 existing wardrobe staples',
        'Flattering shoulder line for Athletic V-Taper silhouette',
      ],
      considerations: [
        'Price ($180) slightly exceeds your $120 Tops budget limit, but cost-per-wear potential is high.',
      ],
      compatibleWardrobeIds: [wardrobe[1]._id, wardrobe[3]._id],
      physicalHarmony: {
        faceMatch: 'Deep V-neckline elongates the neckline and balances oval facial proportions.',
        complexionMatch: 'Warm Oatmeal adds radiant warmth without washing out golden undertones.',
        bodyMatch: 'Slightly relaxed torso highlights upper body width while maintaining structured taper.',
      },
      isSaved: true,
    });

    console.log(`[Seed] Added Analyzed Product: ${evaluatedProduct.name}`);

    // Seed Saved Outfit
    await Outfit.create({
      userId: demoUser._id,
      name: 'Smart Casual Autumn Office Look',
      occasion: 'Work / Smart Casual',
      weather: 'Cool (10-16°C)',
      style: 'Minimalist Scandinavian',
      items: [wardrobe[0]._id, wardrobe[1]._id, wardrobe[3]._id],
      matchScore: 94,
      aiReasoning: 'Forest green merino wool and deep navy blue form a timeless organic contrast, anchored by crisp off-white leather sneakers.',
      colorHarmony: 'Deep Forest Green (#1E3A2F) + Navy (#1A2A44) + Off-White (#F4F1EA)',
      isSaved: true,
    });

    // Seed Purchases
    await Purchase.insertMany([
      {
        userId: demoUser._id,
        productName: 'Merino Wool Crewneck Sweater',
        price: 110,
        category: 'Tops',
        brand: 'COS',
        buyWiseScore: 92,
        notes: 'Fits like a glove, favorite staple piece.',
        feedback: 'good',
        rating: 5,
        imageUrl: wardrobe[0].imageUrl,
      },
      {
        userId: demoUser._id,
        productName: 'Relaxed Tapered Chinos',
        price: 50,
        category: 'Bottoms',
        brand: 'Uniqlo U',
        buyWiseScore: 88,
        notes: 'High versatility, worn weekly.',
        feedback: 'good',
        rating: 5,
        imageUrl: wardrobe[1].imageUrl,
      },
    ]);

    // Seed Budget
    await Budget.create({
      userId: demoUser._id,
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
        { month: '2025-03', monthName: 'Mar', limit: 600, spent: 160, saved: 440 },
      ],
    });

    console.log('[Seed] Database seeding completed successfully! ✨');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
