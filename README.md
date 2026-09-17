# StyleSync — AI Personal Shopping Advisor (Production Backend)

StyleSync answers: *"Will this product actually suit me before I buy it?"*

The backend evaluates shopping screenshots, clothing, shoes, eyewear, and accessories against:
1. **User Physical Traits**: Face Shape (`Oval`, `Square`, `Round`), Skin Undertone (`Warm Golden`, `Cool Rosy`, `Olive`), Color Season (`Warm Autumn`, `Cool Winter`), and Body Silhouette (`Athletic V-Taper`, `Lean Rectangle`, etc.).
2. **User Capsule Wardrobe**: Cross-referencing existing user wardrobe items to calculate outfit versatility.
3. **User Budget & Occasions**: Checking category price ceilings and color avoidance lists.

---

## Tech Stack
- **Runtime**: Node.js v20+ with Express (ES Modules)
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JsonWebToken) + bcrypt password hashing + Protected auth middleware
- **AI Engine**: Google Gemini Multimodal Vision (`@google/generative-ai`)
- **File Storage**: Multer + Cloudinary (with fallback to base64 data URIs)
- **API Documentation**: OpenAPI 3.0 with Swagger UI at `/api-docs`

---

## Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file from `.env.example`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/stylesync
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

### 3. Seed Demo Data (Optional)
To populate the database with a pre-calibrated demo user, wardrobe items, evaluations, and budgets:
```bash
npm run seed
```
> **Demo User Credentials:**
> - Email: `demo@stylesync.ai`
> - Password: `password123`

### 4. Start Development Server
```bash
npm run dev
# or
npm start
```
- API Base URL: `http://localhost:5000/api/v1`
- Interactive Swagger UI: `http://localhost:5000/api-docs`
- Health Check: `http://localhost:5000/health`

---

## API Endpoints Reference

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user `{ name, email, password }` |
| `POST` | `/auth/login` | Login user `{ email, password }` |
| `GET` | `/auth/me` | Current authenticated user profile |
| `POST` | `/auth/forgot-password` | Password reset dispatch |

### 👤 Profile & AI Calibration (`/api/v1/profile`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get full user profile, sizes, colors, budget, physical traits |
| `PUT` | `/profile` | Update styling preferences, brand preferences, avoid colors |
| `POST` | `/profile/onboarding` | Complete 6-step personalized setup |
| `POST` | `/profile/scan-face-body` | Upload selfie/portrait photo -> Gemini Vision detects face shape, undertone, season, body build |

### 👗 Capsule Wardrobe (`/api/v1/wardrobe`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/wardrobe` | Get wardrobe items (filter with `?category=Tops`, `?search=`) |
| `POST` | `/wardrobe` | Add new wardrobe item (multipart/form-data or JSON) |
| `PUT` | `/wardrobe/:id` | Edit item / update wear count |
| `DELETE` | `/wardrobe/:id` | Remove item from wardrobe |

### 🎯 Flagship Product Advisor (`/api/v1/products`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/products/analyze` | Multimodal AI evaluation: analyzes product against face shape, undertone, body type, wardrobe inventory, and budget ceiling. Returns score (0-100), BUY/MAYBE/SKIP decision, breakdown, and physical harmony notes. |
| `GET` | `/products` | Get list of user evaluated products |
| `GET` | `/products/:id` | Get single product result |

### 👔 AI Outfit Builder (`/api/v1/outfits`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/outfits` | Get user saved outfits |
| `POST` | `/outfits/generate` | Generate 4-piece coordinated outfit `{ occasion, weather, style }` from user's database wardrobe |

### 🛍️ Purchases & Feedback Loop (`/api/v1/purchases`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/purchases` | Purchase ledger & metrics (total spent, avg score) |
| `POST` | `/purchases` | Record purchase `{ productName, price, category, buyWiseScore, notes }` |
| `PATCH` | `/purchases/:id/feedback` | Update `{ feedback: 'good' | 'bad', rating: 1-5 }` to refine AI memory |

### 💰 Shopping Budget (`/api/v1/budget`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/budget` | Monthly budget allocation, spent amount, category totals, 6-month trends |
| `PATCH` | `/budget/limit` | Update monthly spending limit `{ limit }` |

### 💬 AI Fashion Stylist Chat (`/api/v1/chat`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat/message` | Conversational personal stylist with user physical traits and wardrobe context |
