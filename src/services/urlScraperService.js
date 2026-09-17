/**
 * Service to scrape and parse e-commerce product links & direct images
 * Supports Zara, Myntra, Amazon, Nike, ASOS, H&M, Uniqlo, and generic e-commerce stores
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

  // Fetch product webpage HTML with browser-like user agent
  let html = '';
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      throw new Error(`Website returned status ${res.status}`);
    }
    html = await res.text();
  } catch (err) {
    throw new Error(`Could not access product URL: ${err.message}`);
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
  const textCorpus = `${title} ${description}`.toLowerCase();

  let category = 'Tops';
  if (textCorpus.includes('sunglass') || textCorpus.includes('goggle') || textCorpus.includes('glass') || textCorpus.includes('eyewear')) {
    category = 'Eyewear';
  } else if (textCorpus.includes('shoe') || textCorpus.includes('sneaker') || textCorpus.includes('boot') || textCorpus.includes('loafer')) {
    category = 'Shoes';
  } else if (textCorpus.includes('pant') || textCorpus.includes('jean') || textCorpus.includes('trouser') || textCorpus.includes('short')) {
    category = 'Bottoms';
  } else if (textCorpus.includes('jacket') || textCorpus.includes('coat') || textCorpus.includes('blazer') || textCorpus.includes('outerwear')) {
    category = 'Outerwear';
  }

  let cleanName = title
    .replace(/\s*[-|–]\s*(Zara|Nike|Amazon|Myntra|ASOS|H&M|Uniqlo|Official Site|Buy Online|India).*$/i, '')
    .replace(/^Buy\s+/i, '')
    .trim();

  if (image && image.startsWith('/')) {
    try {
      const parsedBase = new URL(url);
      image = `${parsedBase.origin}${image}`;
    } catch {}
  }

  if (!image) {
    throw new Error('Product page was fetched, but high-resolution product image could not be located. Please upload a screenshot.');
  }

  return {
    name: cleanName || 'Shopping Candidate Item',
    brand: brand || 'Online Brand',
    category,
    price: price || 0,
    currency: '₹',
    color: '',
    image,
    description: description.substring(0, 300),
    sourceUrl: url,
  };
};
