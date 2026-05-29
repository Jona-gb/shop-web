# ShopEase - Separated Backend & Frontend

Full-stack e-commerce application with **separated Node.js backend** and **React SPA frontend**.

## Architecture

```
shop-web/
├── backend/                 # Express.js REST API (port 3000)
│   ├── src/
│   │   ├── server.js       # Express app entry point
│   │   ├── api.js          # API route handlers
│   │   └── db.js           # Database operations (MySQL)
│   ├── package.json
│   └── README.md
├── src/                    # React SPA (port 8080)
│   ├── lib/
│   │   ├── apiClient.ts    # Frontend HTTP client
│   │   └── ... (other utils)
│   └── routes/
├── package.json
├── vite.config.ts
├── .env.local              # Frontend env config
└── README.md (this file)
```

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+ (or compatible)

### Installation

1. **Install root & frontend dependencies:**
```bash
npm install
```

2. **Install backend dependencies:**
```bash
cd backend
npm install
```

### Running the Full Stack

**Option 1: Run both services together (recommended)**
```bash
npm run dev:full
```

This starts:
- Backend: `http://localhost:3000/api/*`
- Frontend: `http://localhost:8080/`

**Option 2: Run separately in different terminals**

Terminal 1 - Backend:
```bash
npm run dev:backend
# or from backend/: node src/server.js
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
# or: npm run dev
```

## Configuration

### Backend Environment (`.env` or `DATABASE_URL`)

Create `backend/.env`:
```env
PORT=3000
FRONTEND_URL=http://localhost:8080
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=shop_db
```

Or set `DATABASE_URL`:
```env
DATABASE_URL=mysql://root:password@localhost:3306/shop_db
```

### Frontend Environment (`.env.local`)

```env
VITE_API_URL=http://localhost:3000
```

## API Endpoints

All routes start with `/api/`:

### Public Routes
- `GET /api/categories` - List categories
- `GET /api/products?category=...&q=...&limit=...` - List products
- `GET /api/products/:id` - Product details
- `GET /api/products/home` - Home page data
- `GET /api/products/related?category=...` - Related products
- `POST /api/checkout` - Create order
- `GET /api/cart` - Get cart
- `POST /api/cart` - Update cart
- `DELETE /api/cart` - Clear cart

### Admin Routes (`/api/admin/*`)
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:slug` - Update category
- `DELETE /api/admin/categories/:slug` - Delete category
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - List orders
- `POST /api/admin/reset` - Reset database

## Development Scripts

```bash
# Run frontend only
npm run dev:frontend

# Run backend only (from root)
npm run dev:backend

# Run both together
npm run dev:full

# Build frontend
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Database

- **Type:** MySQL
- **Auto-creation:** Schema is created automatically on first run
- **Seed data:** Products and categories are pre-seeded
- **Reset:** Use `POST /api/admin/reset` endpoint

## Frontend Client

Frontend uses `src/lib/apiClient.ts` to make HTTP calls to the backend.

Example:
```typescript
import { getProducts, createOrder } from '@/lib/apiClient';

// Call backend API
const products = await getProducts('electronics', 'search term', 10);
const order = await createOrder({ /* order data */ });
```

All API calls include:
- `credentials: 'include'` for cookie handling
- Automatic JSON serialization
- Error handling

## Features

- ✅ Product listing & search
- ✅ Shopping cart (localStorage)
- ✅ Checkout & orders
- ✅ Admin dashboard (categories, products, orders)
- ✅ Dark/light theme
- ✅ CORS-enabled for frontend/backend separation
- ✅ MySQL database with auto-schema
- ✅ Server-side data validation

## Troubleshooting

**Backend won't start**
- Check MySQL is running
- Verify `DATABASE_URL` or env vars are correct
- Check port 3000 is not in use

**Frontend can't reach API**
- Verify `VITE_API_URL` in `.env.local` points to backend
- Check backend is running on port 3000
- Browser console should show API errors

**Database errors**
- Reset with: `curl -X POST http://localhost:3000/api/admin/reset`
- Or delete the database and restart backend

## Production Deployment

**Backend:**
```bash
npm run build  # if needed for bundling
npm start      # runs on PORT env var (default 3000)
```

**Frontend:**
```bash
npm run build  # outputs dist/
# Deploy dist/ to CDN or static host
```

Set production env vars:
- Backend: `DATABASE_URL`, `PORT`, `FRONTEND_URL`
- Frontend: `VITE_API_URL` (points to production backend)

## License

MIT
