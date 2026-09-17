/**
 * StyleSync Frontend API Integration Client
 * Base URL: http://localhost:5000/api/v1
 * 
 * Usage in React / Vite:
 * import { authApi, profileApi, wardrobeApi, productApi, outfitApi, purchaseApi, budgetApi, chatApi } from './stylesyncFrontendApi';
 */

const BASE_URL = 'http://localhost:5000/api/v1';

// Helper to get auth header with JWT token from localStorage
const getAuthHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('stylesync_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Generic response handler
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
};

// =======================================================
// 1. AUTHENTICATION API
// =======================================================
export const authApi = {
  // Register: { name, email, password }
  register: async (credentials) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('stylesync_token', data.token);
    }
    return data;
  },

  // Login: { email, password }
  login: async (credentials) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('stylesync_token', data.token);
    }
    return data;
  },

  // Get current user profile
  getMe: async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Logout
  logout: () => {
    localStorage.removeItem('stylesync_token');
  },
};

// =======================================================
// 2. PROFILE & AI PHYSICAL CALIBRATION API
// =======================================================
export const profileApi = {
  // Get full profile, physical traits & preferences
  getProfile: async () => {
    const res = await fetch(`${BASE_URL}/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Update profile / preferences
  updateProfile: async (updateData) => {
    const res = await fetch(`${BASE_URL}/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  // Complete onboarding
  completeOnboarding: async (onboardingData) => {
    const res = await fetch(`${BASE_URL}/profile/onboarding`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(onboardingData),
    });
    return handleResponse(res);
  },

  // Scan face/body photo (Accepts File/Blob or { image: base64/url })
  scanFaceAndBody: async (fileOrData) => {
    let body;
    let isMultipart = false;

    if (fileOrData instanceof File || fileOrData instanceof Blob) {
      body = new FormData();
      body.append('image', fileOrData);
      isMultipart = true;
    } else {
      body = JSON.stringify(fileOrData);
    }

    const res = await fetch(`${BASE_URL}/profile/scan-face-body`, {
      method: 'POST',
      headers: getAuthHeaders(isMultipart),
      body,
    });
    return handleResponse(res);
  },
};

// =======================================================
// 3. CAPSULE WARDROBE API
// =======================================================
export const wardrobeApi = {
  // Get wardrobe items (optional category filter)
  getItems: async (category = '') => {
    const url = category && category !== 'All' 
      ? `${BASE_URL}/wardrobe?category=${encodeURIComponent(category)}`
      : `${BASE_URL}/wardrobe`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Add wardrobe item (accepts FormData with file or JSON)
  addItem: async (itemData) => {
    const isMultipart = itemData instanceof FormData;
    const res = await fetch(`${BASE_URL}/wardrobe`, {
      method: 'POST',
      headers: getAuthHeaders(isMultipart),
      body: isMultipart ? itemData : JSON.stringify(itemData),
    });
    return handleResponse(res);
  },

  // Update wardrobe item (details / wear count)
  updateItem: async (id, updateData) => {
    const isMultipart = updateData instanceof FormData;
    const res = await fetch(`${BASE_URL}/wardrobe/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(isMultipart),
      body: isMultipart ? updateData : JSON.stringify(updateData),
    });
    return handleResponse(res);
  },

  // Delete wardrobe item
  deleteItem: async (id) => {
    const res = await fetch(`${BASE_URL}/wardrobe/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// =======================================================
// 4. FLAGSHIP PRODUCT ADVISOR API
// =======================================================
export const productApi = {
  // Analyze shopping candidate with Gemini Vision
  // Accepts FormData (with file) or JSON ({ image: url/base64, name, brand, category, price, color })
  analyzeProduct: async (productData) => {
    const isMultipart = productData instanceof FormData;
    const res = await fetch(`${BASE_URL}/products/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(isMultipart),
      body: isMultipart ? productData : JSON.stringify(productData),
    });
    return handleResponse(res);
  },

  // Get evaluated product history
  getAnalyzedProducts: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `${BASE_URL}/products?${params}` : `${BASE_URL}/products`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Get single product evaluation by ID
  getProductById: async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// =======================================================
// 5. AI OUTFIT BUILDER API
// =======================================================
export const outfitApi = {
  // Get user saved outfits
  getOutfits: async () => {
    const res = await fetch(`${BASE_URL}/outfits`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Generate 4-piece coordinated outfit: { occasion, weather, style }
  generateOutfit: async (options = {}) => {
    const res = await fetch(`${BASE_URL}/outfits/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options),
    });
    return handleResponse(res);
  },
};

// =======================================================
// 6. PURCHASES & FEEDBACK API
// =======================================================
export const purchaseApi = {
  // Get purchase ledger
  getPurchases: async () => {
    const res = await fetch(`${BASE_URL}/purchases`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Record purchase: { productName, price, category, brand, buyWiseScore, notes }
  recordPurchase: async (purchaseData) => {
    const isMultipart = purchaseData instanceof FormData;
    const res = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: getAuthHeaders(isMultipart),
      body: isMultipart ? purchaseData : JSON.stringify(purchaseData),
    });
    return handleResponse(res);
  },

  // Update feedback loop: { feedback: 'good' | 'bad', rating: 1-5 }
  updateFeedback: async (id, feedbackData) => {
    const res = await fetch(`${BASE_URL}/purchases/${id}/feedback`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(feedbackData),
    });
    return handleResponse(res);
  },
};

// =======================================================
// 7. SHOPPING BUDGET API
// =======================================================
export const budgetApi = {
  // Get budget metrics, category spent, 6-month trends
  getBudget: async () => {
    const res = await fetch(`${BASE_URL}/budget`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Update monthly spending limit: { limit: 800 }
  updateLimit: async (limit) => {
    const res = await fetch(`${BASE_URL}/budget/limit`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ limit }),
    });
    return handleResponse(res);
  },
};

// =======================================================
// 8. AI STYLIST CHAT API
// =======================================================
export const chatApi = {
  // Chat with AI Stylist: { message, history: [{ role: 'user'|'model', content }] }
  sendMessage: async (message, history = []) => {
    const res = await fetch(`${BASE_URL}/chat/message`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, history }),
    });
    return handleResponse(res);
  },
};
