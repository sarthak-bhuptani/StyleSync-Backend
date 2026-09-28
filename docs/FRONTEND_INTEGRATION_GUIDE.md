# 🔌 StyleSync Frontend Integration Guide

This guide explains how to connect any Frontend (React / Vite / Next.js / Vue / Mobile) to the StyleSync Production Backend.

---

## 🌐 API URLs & Documentation

- **Base API URL**: `http://localhost:5000/api/v1`
- **Interactive Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs)
- **OpenAPI 3.0 Spec (YAML)**: [`docs/swagger.yaml`](file:///d:/backend/docs/swagger.yaml)
- **OpenAPI 3.0 Spec (JSON)**: `http://localhost:5000/api-docs.json`
- **Ready-to-use JS API Client**: [`docs/stylesyncFrontendApi.js`](file:///d:/backend/docs/stylesyncFrontendApi.js)

---

## 🚀 Quick Integration in 3 Steps

### Step 1: Copy the API Client into your Frontend
Copy [`docs/stylesyncFrontendApi.js`](file:///d:/backend/docs/stylesyncFrontendApi.js) into your frontend `src/api/` folder:
```
src/
└── api/
    └── stylesyncApi.js
```

### Step 2: Authentication (Login / Register)
The API client automatically manages the `Bearer` token in `localStorage` under key `stylesync_token`.

```javascript
import { authApi } from './api/stylesyncApi';

// Register
const handleRegister = async () => {
  const result = await authApi.register({
    name: 'Sarthak',
    email: 'sarthak@example.com',
    password: 'password123',
  });
  console.log('Logged in user:', result.user);
};

// Login
const handleLogin = async () => {
  const result = await authApi.login({
    email: 'demo@stylesync.ai',
    password: 'password123',
  });
  console.log('User profile:', result.user);
};
```

---

## 📸 Step 3: Integrate Key Feature Endpoints

### 1. AI Physical Calibration (Selfie / Portrait Scan)
```javascript
import { profileApi } from './api/stylesyncApi';

const handleScanFace = async (fileInputEvent) => {
  const file = fileInputEvent.target.files[0];
  
  // Sends to Gemini Vision to detect face shape, undertone, season, body build
  const response = await profileApi.scanFaceAndBody(file);
  console.log('Detected Traits:', response.data.physicalTraits);
  console.log('AI Styling Notes:', response.data.detectedAnalysis.stylingNotes);
};
```

### 2. Flagship Product Advisor (`POST /products/analyze`)
Evaluates a shopping product screenshot against the user's face shape, undertone, body type, avoid colors, and wardrobe compatibility:

```javascript
import { productApi } from './api/stylesyncApi';

const handleAnalyzeProduct = async (imageFile, productInfo) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('name', 'Cashmere Ribbed Cardigan');
  formData.append('brand', 'Acne Studios');
  formData.append('category', 'Tops');
  formData.append('price', 180);
  formData.append('color', 'Oatmeal');

  const result = await productApi.analyzeProduct(formData);
  
  console.log('Score (0-100):', result.data.score); // e.g. 89
  console.log('Decision:', result.data.decision); // 'BUY' | 'MAYBE' | 'SKIP'
  console.log('Breakdown:', result.data.breakdown);
  console.log('AI Verdict:', result.data.aiExplanation);
  console.log('Physical Harmony:', result.data.physicalHarmony);
  console.log('Compatible Wardrobe Items:', result.data.compatibleWardrobeIds);
};
```

### 3. Capsule Wardrobe Management
```javascript
import { wardrobeApi } from './api/stylesyncApi';

// 1. Auto-analyze clothing photo (extracts shirt/pant/shoes, color, hex, category, tags)
const analyzeFormData = new FormData();
analyzeFormData.append('image', imageFile);

const analysis = await wardrobeApi.analyzeItem(analyzeFormData);
console.log('AI Detected Name:', analysis.data.name);         // e.g. "Navy Blue Oxford Cotton Shirt"
console.log('Category:', analysis.data.category);              // e.g. "Tops"
console.log('Detected Color:', analysis.data.color);           // e.g. "Navy Blue"
console.log('Dominant Hex Code:', analysis.data.colorHex);     // e.g. "#1B263B"
console.log('Pattern & Fabric:', analysis.data.pattern, analysis.data.fabric);
console.log('Fashion Tags:', analysis.data.tags);

// 2. Add item (if name/category/color are omitted, backend will auto-detect from image)
const formData = new FormData();
formData.append('image', imageFile);
// Optional manual overrides:
formData.append('price', 1999);
formData.append('brand', 'Uniqlo');

await wardrobeApi.addItem(formData);
```

### 4. AI 4-Piece Outfit Builder
```javascript
import { outfitApi } from './api/stylesyncApi';

const outfit = await outfitApi.generateOutfit({
  occasion: 'Date Night',
  weather: 'Mild (18°C)',
  style: 'Smart Casual',
});

console.log('Outfit Name:', outfit.data.name);
console.log('Selected Pieces:', outfit.data.items);
console.log('AI Reasoning:', outfit.data.aiReasoning);
```

### 5. AI Stylist Chat Assistant
```javascript
import { chatApi } from './api/stylesyncApi';

const response = await chatApi.sendMessage(
  'What should I wear with navy chinos for an outdoor dinner?',
  [
    { role: 'user', content: 'Hi, I need styling advice.' },
    { role: 'model', content: 'Hello! I am your StyleSync AI Stylist.' },
  ]
);

console.log('Stylist Advice:', response.data.reply);
```

---

## 🔒 CORS Configuration
CORS is already configured in [`src/server.js`](file:///d:/backend/src/server.js) for `http://localhost:5173` (the Vite default frontend) and all localhost origins.
