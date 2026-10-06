/**
 * Service to scrape and parse e-commerce product links & direct images
 * Supports Zara, Myntra, Amazon, Nike, ASOS, H&M, Uniqlo, and generic e-commerce stores.
 * Includes resilience against cloud/datacenter bot-protection (503 / 403 / CAPTCHA).
 */

const CATEGORY_DEFAULT_IMAGES = {
  Tops: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80',
  Bottoms: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=80',
  Shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
  Outerwear: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=80',
  Eyewear: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
  Accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
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
  if (corpus.includes('jacket') || corpus.includes('coat') || corpus.includes('blazer') || corpus.includes('hoodie') || corpus.includes('sweater') || corpus.includes('cardigan') || corpus.includes('outerwear') || corpus.includes('overshirt')) {
    return 'Outerwear';
  }
  if (corpus.includes('watch') || corpus.includes('belt') || corpus.includes('cap') || corpus.includes('hat') || corpus.includes('bag') || corpus.includes('wallet') || corpus.includes('tie') || corpus.includes('scarf')) {
    return 'Accessories';
  }
  return 'Tops';
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
    .replace(/\b(?:dp|gp|product|buy|pdp|item|in|en|shop|catalog|ref|qid|sr)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Smart URL fallback extraction when cloud IP is blocked by anti-bot (503 / 403 / Cloudflare)
 */
const extractFallbackFromUrl = (url, reason = 'Bot challenge encountered') => {
  let hostname = '';
  let pathname = '';
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.toLowerCase().replace('www.', '');
    pathname = parsed.pathname;
  } catch {
    hostname = 'online';
    pathname = '';
  }

  // Derive Brand
  let brand = 'Online Store';
  if (hostname.includes('amazon')) brand = 'Amazon';
  else if (hostname.includes('myntra')) brand = 'Myntra';
  else if (hostname.includes('zara')) brand = 'Zara';
  else if (hostname.includes('nike')) brand = 'Nike';
  else if (hostname.includes('hm.com')) brand = 'H&M';
  else if (hostname.includes('ajio')) brand = 'Ajio';
  else if (hostname.includes('flipkart')) brand = 'Flipkart';
  else if (hostname.includes('uniqlo')) brand = 'Uniqlo';
  else if (hostname.includes('asos')) brand = 'ASOS';
  else {
    const mainPart = hostname.split('.')[0];
    if (mainPart) brand = mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  }

  // Derive Name from URL path segments
  const segments = pathname.split('/').filter(Boolean);
  let bestSlug = '';

  // For Amazon: The segment before /dp/ is usually the product name
  const dpIndex = segments.findIndex((s) => s.toLowerCase() === 'dp' || s.toLowerCase() === 'd');
  if (dpIndex > 0) {
    bestSlug = segments[dpIndex - 1];
  } else {
    // Pick the longest alphabetical segment
    const validSegments = segments.filter((s) => !/^[0-9a-f]{8,}$/i.test(s) && !/^\d+$/.test(s));
    bestSlug = validSegments.sort((a, b) => b.length - a.length)[0] || '';
  }

  const derivedName = cleanSlugToTitle(bestSlug) || `${brand} Candidate Item`;
  const category = detectCategoryFromText(`${pathname} ${derivedName}`);

  // Image derivation: If Amazon, direct CDN static image works without scraping
  let fallbackImage = '';
  const asin = extractAmazonAsin(url);
  if (asin) {
    fallbackImage = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX600_.jpg`;
  } else {
    fallbackImage = CATEGORY_DEFAULT_IMAGES[category] || CATEGORY_DEFAULT_IMAGES.Tops;
  }

  return {
    name: derivedName,
    brand,
    category,
    price: 0,
    currency: '₹',
    color: '',
    image: fallbackImage,
    description: `Auto-extracted from ${brand} product link (${reason}). Adjust price and photo if needed.`,
    sourceUrl: url,
    isFallback: true,
  };
};

/**
 * Main scraper function
 */
export const scrapeProductUrl = async (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Please provide a valid product or image URL.');
  }

  const url = rawUrl.trim();

  // If it's a direct image URL (.jpg, .jpeg, .png, .webp, or unsplash/cloudinary)
  const isDirectImage = /\.(jpeg|jpg|png|webp)($|\?)/i.test(url) || 
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

    return {
      name: derivedName || 'Shopping Item Candidate',
      brand: 'Online Brand',
      category: 'Tops',
      price: 0,
      currency: '₹',
      color: '',
      image: url,
      description: 'Extracted directly from image URL.',
      sourceUrl: url,
    };
  }

  // Fetch product webpage HTML with modern browser headers
  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      // Cloud IP bot blocked (503 / 403 / 429) -> Gracefully fallback rather than crashing
      console.warn(`[urlScraperService] External site returned HTTP ${res.status}. Using smart URL parsing fallback.`);
      return extractFallbackFromUrl(url, `Website returned status ${res.status}`);
    }

    html = await res.text();
  } catch (err) {
    console.warn(`[urlScraperService] Fetch failed (${err.message}). Using smart URL parsing fallback.`);
    return extractFallbackFromUrl(url, err.message);
  }

  // Extract metadata using regex
  const getMeta = (property) => {
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
      html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["']`, 'i'));
    return match ? match[1].trim() : '';
  };

  let image = getMeta('image') || getMeta('image:secure_url') || '';
  if (!image) {
    const linkImg = html.match(/<link[^>]+rel=["'](?:image_src|preload)["'][^>]+href=["']([^"']+)["']/i);
    if (linkImg) image = linkImg[1].trim();
  }

  // If Amazon ASIN image can be derived
  if (!image) {
    const asin = extractAmazonAsin(url);
    if (asin) {
      image = `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX600_.jpg`;
    }
  }

  let title = getMeta('title') || '';
  if (!title) {
    const tagTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (tagTitle) title = tagTitle[1].trim();
  }

  let brand = getMeta('brand') || getMeta('site_name') || '';
  if (!brand) {
    try {
      const parsedHost = new URL(url).hostname.replace('www.', '').split('.')[0];
      if (parsedHost) brand = parsedHost.charAt(0).toUpperCase() + parsedHost.slice(1);
    } catch {}
  }

  let rawPrice = getMeta('price:amount') || getMeta('price') || '';
  let price = 0;
  if (rawPrice) {
    price = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
  } else {
    const priceMatch = html.match(/"price"\s*:\s*["']?([0-9.]+)/i);
    if (priceMatch) price = parseFloat(priceMatch[1]) || 0;
  }

  const description = getMeta('description') || '';
  const category = detectCategoryFromText(`${title} ${description} ${url}`);

  let cleanName = title
    .replace(/\s*[-|–]\s*(Zara|Nike|Amazon|Myntra|ASOS|H&M|Uniqlo|Official Site|Buy Online|India).*$/i, '')
    .replace(/^Buy\s+/i, '')
    .trim();

  // If title was missing or useless, clean from slug
  if (!cleanName || cleanName.length < 3) {
    try {
      const parsed = new URL(url);
      cleanName = cleanSlugToTitle(parsed.pathname) || 'Shopping Candidate Item';
    } catch {
      cleanName = 'Shopping Candidate Item';
    }
  }

  if (image && image.startsWith('/')) {
    try {
      const parsedBase = new URL(url);
      image = `${parsedBase.origin}${image}`;
    } catch {}
  }

  // Fallback image if still missing
  if (!image) {
    image = CATEGORY_DEFAULT_IMAGES[category] || CATEGORY_DEFAULT_IMAGES.Tops;
  }

  return {
    name: cleanName || 'Shopping Candidate Item',
    brand: brand || 'Online Brand',
    category,
    price: price || 0,
    currency: '₹',
    color: '',
    image,
    description: description.substring(0, 300) || `Product from ${brand}`,
    sourceUrl: url,
  };
};
