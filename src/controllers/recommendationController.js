import { WardrobeItem } from '../models/WardrobeItem.js';
import { User } from '../models/User.js';
import { detectWardrobeGapsWithGemini } from '../services/geminiVisionService.js';

/**
 * @desc    Dedicated Wardrobe Gap Analysis: Detect missing closet capsule essentials (Top 4 picks ₹499 - ₹1,799)
 * @route   GET /api/v1/recommendations/gaps, GET /api/v1/gaps
 * @access  Private
 */
export const getWardrobeGaps = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const wardrobeItems = await WardrobeItem.find({ userId: req.user.id });

    // Inspect user's existing wardrobe items
    const rawGapsData = await detectWardrobeGapsWithGemini({
      user,
      wardrobeItems,
    });

    const defaultCuratedGaps = [
      {
        id: 'gap_1',
        title: 'Minimalist Clean White Low-Tops',
        category: 'Footwear Staple',
        multiplier: '+10 Outfits',
        reason: 'Unlocks versatile styling across casual chinos and dark jeans.',
        priceRange: '₹799 – ₹1,499',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80',
        curatedPicks: [
          { name: 'Classic Low-Top Sneaker', brand: 'Red Tape', price: 1199 },
          { name: 'Retro Court Sneaker', brand: 'HRX', price: 899 },
        ],
      },
      {
        id: 'gap_2',
        title: 'Crisp Oxford Cotton Button-Down Shirt',
        category: 'Tops Staple',
        multiplier: '+8 Outfits',
        reason: 'Pairs effortlessly under sweaters, over tees, or solo with tailored trousers.',
        priceRange: '₹699 – ₹1,299',
        image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
        curatedPicks: [
          { name: 'Solid Oxford Casual Shirt', brand: 'Snitch', price: 999 },
          { name: 'Cotton Regular Fit Shirt', brand: 'Highlander', price: 699 },
        ],
      },
      {
        id: 'gap_3',
        title: 'Relaxed Tapered Olive/Khaki Chinos',
        category: 'Bottoms Staple',
        multiplier: '+7 Outfits',
        reason: 'Essential neutral foundation that elevates casual tees and complements linen shirts.',
        priceRange: '₹899 – ₹1,599',
        image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
        curatedPicks: [
          { name: 'Slim Tapered Stretch Chinos', brand: 'Roadster', price: 899 },
          { name: 'Smart Casual Cotton Trousers', brand: 'Mast & Harbour', price: 1299 },
        ],
      },
      {
        id: 'gap_4',
        title: 'Structured Lightweight Knit Overshirt',
        category: 'Layering Staple',
        multiplier: '+9 Outfits',
        reason: 'Adds texture and dimension to monochrome casual looks in mild transitional weather.',
        priceRange: '₹999 – ₹1,799',
        image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=80',
        curatedPicks: [
          { name: 'Textured Shacket Overshirt', brand: 'The Indian Garage Co', price: 1149 },
          { name: 'Waffle Knit Zip Layer', brand: 'Ketch', price: 999 },
        ],
      },
    ];

    // Normalize AI returned gaps or use curated fallback
    let normalizedGaps = [];
    if (rawGapsData && Array.isArray(rawGapsData.gaps) && rawGapsData.gaps.length > 0) {
      normalizedGaps = rawGapsData.gaps.slice(0, 4).map((gap, index) => ({
        id: gap.id || `gap_${index + 1}`,
        title: gap.title || `Essential Capsule Piece ${index + 1}`,
        category: gap.category || 'Wardrobe Staple',
        multiplier: gap.multiplier || (gap.unlocksOutfitsCount ? `+${gap.unlocksOutfitsCount} Outfits` : `+${8 + index * 2} Outfits`),
        reason: gap.reason || 'Broadens combinations across existing wardrobe items.',
        priceRange: gap.priceRange || '₹799 – ₹1,499',
        image: gap.image || gap.curatedPicks?.[0]?.image || defaultCuratedGaps[index]?.image || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80',
        curatedPicks: Array.isArray(gap.curatedPicks) && gap.curatedPicks.length > 0
          ? gap.curatedPicks.slice(0, 2).map((p) => ({
              name: p.name || 'Classic Capsule Pick',
              brand: p.brand || 'Selected Brand',
              price: Number(p.price) || 999,
            }))
          : defaultCuratedGaps[index]?.curatedPicks || [
              { name: 'Curated Staple Pick', brand: 'StyleSync Curated', price: 999 },
            ],
      }));
    }

    if (normalizedGaps.length === 0) {
      normalizedGaps = defaultCuratedGaps;
    }

    res.status(200).json({
      success: true,
      data: normalizedGaps,
      gaps: normalizedGaps,
      missingCategories: rawGapsData?.missingCategories || ['Shoes', 'Outerwear'],
    });
  } catch (error) {
    next(error);
  }
};
