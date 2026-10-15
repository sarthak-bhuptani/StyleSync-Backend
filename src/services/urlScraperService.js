import { runWithAiResilience } from '../config/ai.js';

/**
 * Service to scrape and parse e-commerce product links & direct images
 * Supports Zara, Myntra, Amazon, Nike, ASOS, H&M, Uniqlo, Ajio, Flipkart, Meesho, and generic fashion stores.
 * Combines high-fidelity HTML / JSON-LD / OpenGraph scraping with Gemini AI Link Intelligence.
 */

// Category + Color high-resolution curated imagery for authentic fashion visualization
const CURATED_IMAGES = {
  Tops: {
    Black: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80',
    White: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
    Blue: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80',
    Navy: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80',
    Olive: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
    Green: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
    Beige: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    Brown: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    Grey: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80',
    Maroon: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80',
    Red: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&auto=format&fit=crop&q=80',
    Yellow: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80',
    default: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
  },
  Bottoms: {
    Blue: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
    Black: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
    Beige: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80',
    Khaki: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80',
    Grey: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=600&auto=format&fit=crop&q=80',
    default: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
  },
  Outerwear: {
    Black: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
    Brown: 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=600&auto=format&fit=crop&q=80',
    Olive: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
    Beige: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&auto=format&fit=crop&q=80',
    Navy: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=600&auto=format&fit=crop&q=80',
    default: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
  },
  Shoes: {
    White: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
    Black: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&auto=format&fit=crop&q=80',
    Brown: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=600&auto=format&fit=crop&q=80',
    default: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
  },
  Eyewear: {
    default: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
  },
  Accessories: {
    default: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  },
};

/**
 * Decode common HTML entities from scraped HTML strings
 */
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '—')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Detect product category from text keywords
 */
const detectCategoryFromText = (text) => {
  const corpus = (text || '').toLowerCase();
  if (corpus.includes('sunglass') || corpus.includes('goggle') || corpus.includes('glass') || corpus.includes('eyewear')) {
    return 'Eyewear';
  }
  if (corpus.includes('shoe') || corpus.includes('sneaker') || corpus.includes('boot') || corpus.includes('loafer') || corpus.includes('slide') || corpus.includes('sandal') || corpus.includes('footwear')) {
    return 'Shoes';
  }
  if (corpus.includes('pant') || corpus.includes('jean') || corpus.includes('denim') || corpus.includes('trouser') || corpus.includes('short') || corpus.includes('chino') || corpus.includes('cargo') || corpus.includes('jogger')) {
    return 'Bottoms';
  }
  if (corpus.includes('jacket') || corpus.includes('coat') || corpus.includes('blazer') || corpus.includes('hoodie') || corpus.includes('sweater') || corpus.includes('cardigan') || corpus.includes('outerwear') || corpus.includes('overshirt') || corpus.includes('bomber') || corpus.includes('shacket')) {
    return 'Outerwear';
  }
  if (corpus.includes('watch') || corpus.includes('belt') || corpus.includes('cap') || corpus.includes('hat') || corpus.includes('bag') || corpus.includes('wallet') || corpus.includes('tie') || corpus.includes('scarf')) {
    return 'Accessories';
  }
  return 'Tops';
};

/**
 * Extract color keyword from text/slug
 */
const detectColorFromText = (text) => {
  const corpus = (text || '').toLowerCase();
  const colors = [
    'navy blue', 'dark blue', 'light blue', 'sky blue', 'off white', 'olive green', 'forest green', 'mint green',
    'black', 'white', 'navy', 'blue', 'olive', 'green', 'beige', 'brown', 'tan', 'khaki', 'red', 'maroon',
    'burgundy', 'pink', 'grey', 'gray', 'charcoal', 'yellow', 'mustard', 'orange', 'purple', 'lavender',
    'teal', 'cream', 'rust', 'coral', 'peach'
  ];
  for (const c of colors) {
    const regex = new RegExp(`\\b${c}\\b`, 'i');
    if (regex.test(corpus)) {
      return c.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  return '';
};

/**
 * Extract Amazon ASIN from standard Amazon URLs
 */
const extractAmazonAsin = (url) => {
  const match = url.match(/(?:\/dp\/|\/gp\/product\/|\/d\/|\/product\/)([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
};

/**
 * Clean URL slug into human-readable product title
 */
const cleanSlugToTitle = (slug) => {
  if (!slug) return '';
  return decodeURIComponent(slug)
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/(?:[-_]|\+)/g, ' ')
    .replace(/\b(?:dp|gp|product|buy|pdp|item|in|en|shop|catalog|ref|qid|sr|itm)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * AI-powered link comprehension using Gemini
 * Extracts exact fashion details from product URL slug, path, and context
 */
const parseWithGeminiIntelligence = async (url) => {
  try {
    return await runWithAiResilience(async (model) => {
      const prompt = `You are a fashion product link intelligence expert for StyleSync.
Analyze this fashion e-commerce URL:
${url}

Extract or deduce the item's catalog fashion details. Return ONLY a valid JSON object:
{
  "name": "Exact clean title e.g. Men Solid Polo Neck T-Shirt",
  "brand": "Brand name e.g. Puma, Zara, Roadster, H&M, Nike, Netplay, Symbol",
  "category": "Tops" | "Bottoms" | "Shoes" | "Outerwear" | "Eyewear" | "Accessories",
  "color": "Primary color e.g. Navy Blue, Black, White, Olive, etc.",
  "price": number (estimated typical retail price in INR as an integer, e.g. 1199, 1990, 2490),
  "description": "1-2 sentence aesthetic styling summary of the piece"
}`;
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();
      let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      return JSON.parse(cleaned);
    });
  } catch (err) {
    console.warn('[urlScraperService] Gemini intelligence extraction error:', err.message);
    return null;
  }
};

/**
 * Get category & color matched fallback image
 */
const getMatchedImage = (category, color) => {
  const catGroup = CURATED_IMAGES[category] || CURATED_IMAGES.Tops;
  if (color && catGroup) {
    const colorKey = Object.keys(catGroup).find((k) =>
      color.toLowerCase().includes(k.toLowerCase())
    );
    if (colorKey && catGroup[colorKey]) {
      return catGroup[colorKey];
    }
  }
  return catGroup?.default || CURATED_IMAGES.Tops.default;
};

/**
 * Main scraper function
 */
export const scrapeProductUrl = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Please provide a valid product or image URL.');
  }

  const url = rawUrl.trim();

  // 1. Direct Image URL check (.jpg, .jpeg, .png, .webp, unsplash, cloudinary)
  const isDirectImage =
    /\.(jpeg|jpg|png|webp)($|\?)/i.test(url) ||
    url.includes('images.unsplash.com') ||
    url.includes('res.cloudinary.com');

  if (isDirectImage) {
    let derivedName = '';
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      const lastSeg = segments[segments.length - 1] || '';
      derivedName = decodeURIComponent(lastSeg)
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      if (/^\d+$/.test(derivedName)) derivedName = '';
    } catch {
      derivedName = '';
    }

    const detectedColor = detectColorFromText(derivedName);
    const category = detectCategoryFromText(derivedName);

    return {
      name: derivedName || 'Shopping Item Candidate',
      brand: 'Contemporary Brand',
      category,
      price: 1990,
      currency: '₹',
      color: detectedColor || 'Neutral',
      image: url,
      description: 'Extracted directly from image URL.',
      sourceUrl: url,
    };
  }

  // 2. Fetch product webpage HTML
  let html = '';
  let fetchFailed = false;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      html = await res.text();
    } else {
      console.warn(`[urlScraperService] External site returned HTTP ${res.status}. Falling back to AI Link Intelligence.`);
      fetchFailed = true;
    }
  } catch (err) {
    console.warn(`[urlScraperService] Fetch failed (${err.message}). Falling back to AI Link Intelligence.`);
    fetchFailed = true;
  }

  // Helper to extract meta content
  const getMeta = (property) => {
    if (!html) return '';
    const match =
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["']`, 'i'));
    return match ? decodeHtmlEntities(match[1]) : '';
  };

  // 3. Extract JSON-LD if present in HTML
  let jsonLdData = null;
  if (html) {
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        const item = Array.isArray(parsed)
          ? parsed.find((p) => p['@type'] === 'Product')
          : (parsed['@type'] === 'Product' ? parsed : (parsed['@graph']?.find((p) => p['@type'] === 'Product')));
        if (item) {
          jsonLdData = item;
          break;
        }
      } catch {}
    }
  }

  // 4. Initial extraction from HTML/meta/JSON-LD
  let image = '';
  if (Array.isArray(jsonLdData?.image) && jsonLdData.image.length > 0) {
    image = typeof jsonLdData.image[0] === 'string' ? jsonLdData.image[0] : (jsonLdData.image[0]?.url || '');
  } else if (typeof jsonLdData?.image === 'string') {
    image = jsonLdData.image;
  } else if (jsonLdData?.image?.url) {
    image = jsonLdData.image.url;
  }
  if (!image) {
    image = getMeta('image') || getMeta('image:secure_url') || '';
  }

  if (!image && html) {
    const linkImg = html.match(/<link[^>]+rel=["'](?:image_src|preload)["'][^>]+href=["']([^"']+)["']/i);
    if (linkImg) image = linkImg[1].trim();
  }

  const asin = extractAmazonAsin(url);
  if (!image && asin) {
    image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX600_.jpg`;
  }

  let title = jsonLdData?.name || getMeta('title') || '';
  if (!title && html) {
    const tagTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (tagTitle) title = decodeHtmlEntities(tagTitle[1]);
  }

  // Clean title
  let cleanName = decodeHtmlEntities(title)
    .replace(/\s*[-|–]\s*(Zara|Nike|Amazon|Myntra|ASOS|H&M|Uniqlo|Official Site|Buy Online|India|Flipkart|Ajio).*$/i, '')
    .replace(/^Buy\s+/i, '')
    .trim();

  let brand = jsonLdData?.brand?.name || (typeof jsonLdData?.brand === 'string' ? jsonLdData.brand : '') ||
    getMeta('brand') || getMeta('site_name') || '';

  let price = 0;
  if (jsonLdData?.offers?.price) {
    price = parseFloat(jsonLdData.offers.price) || 0;
  } else {
    const rawPrice = getMeta('price:amount') || getMeta('price') || '';
    if (rawPrice) {
      price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
    } else if (html) {
      const priceMatch = html.match(/"price"\s*:\s*["']?([0-9.]+)/i);
      if (priceMatch) price = parseFloat(priceMatch[1]) || 0;
    }
  }

  let description = jsonLdData?.description || getMeta('description') || '';
  let color = jsonLdData?.color || detectColorFromText(`${cleanName} ${description} ${url}`);
  let category = detectCategoryFromText(`${cleanName} ${description} ${url}`);

  // 5. Detect if extraction was poor (e.g. status was not 200, title is &nbsp; or too short, price is 0, or brand is generic)
  const isTitleInvalid = !cleanName || cleanName.length < 3 || cleanName.toLowerCase() === '&nbsp;' || cleanName === 'Shopping Candidate Item';
  const needsAiIntelligence = fetchFailed || isTitleInvalid || price === 0 || !brand || brand.toLowerCase() === 'online brand';

  if (needsAiIntelligence) {
    console.log(`[urlScraperService] Refining product details with Gemini AI Link Intelligence for: ${url}`);
    const aiData = await parseWithGeminiIntelligence(url);
    if (aiData) {
      if (isTitleInvalid && aiData.name) cleanName = aiData.name;
      if ((!brand || brand.toLowerCase() === 'online brand' || brand.toLowerCase() === 'myntra' || brand.toLowerCase() === 'amazon' || brand.toLowerCase() === 'flipkart' || brand.toLowerCase() === 'ajio') && aiData.brand) {
        brand = aiData.brand;
      }
      if (aiData.category) category = aiData.category;
      if (!color && aiData.color) color = aiData.color;
      if ((price === 0 || !price) && aiData.price) price = Number(aiData.price);
      if (!description && aiData.description) description = aiData.description;
    }
  }

  // 6. Final heuristic fallback for brand if still generic
  if (!brand || brand === 'Online Brand' || brand === 'Retailer') {
    try {
      const parsedHost = new URL(url).hostname.replace('www.', '').toLowerCase();
      if (parsedHost.includes('zara')) brand = 'Zara';
      else if (parsedHost.includes('myntra')) brand = 'Myntra';
      else if (parsedHost.includes('nike')) brand = 'Nike';
      else if (parsedHost.includes('hm.com')) brand = 'H&M';
      else if (parsedHost.includes('uniqlo')) brand = 'Uniqlo';
      else if (parsedHost.includes('snitch')) brand = 'Snitch';
      else if (parsedHost.includes('amazon')) brand = 'Amazon Brand';
      else if (parsedHost.includes('flipkart')) brand = 'Flipkart';
      else if (parsedHost.includes('ajio')) brand = 'Ajio';
      else {
        const hostFirst = parsedHost.split('.')[0];
        brand = hostFirst.charAt(0).toUpperCase() + hostFirst.slice(1);
      }
    } catch {
      brand = 'Contemporary Brand';
    }
  }

  // 7. Final heuristic fallback for name if still invalid
  if (!cleanName || cleanName.length < 3 || cleanName.toLowerCase() === '&nbsp;') {
    try {
      const parsed = new URL(url);
      cleanName = cleanSlugToTitle(parsed.pathname) || `${brand} Fashion Piece`;
    } catch {
      cleanName = `${brand} Fashion Piece`;
    }
  }

  // 8. Image validation & high-resolution fallback
  if (image && image.startsWith('/')) {
    try {
      const parsedBase = new URL(url);
      image = `${parsedBase.origin}${image}`;
    } catch {}
  }

  if (!image || image.includes('transparent.gif') || image.endsWith('.svg')) {
    image = getMatchedImage(category, color);
  }

  return {
    name: cleanName || 'Contemporary Fashion Piece',
    brand: brand || 'Contemporary Brand',
    category,
    price: price || 1990,
    currency: '₹',
    color: color || 'Neutral',
    image,
    description: description.substring(0, 300) || `Tailored piece from ${brand}.`,
    sourceUrl: url,
  };
};
