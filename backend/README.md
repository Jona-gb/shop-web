# ShopEase Backend

Express.js server providing REST API for the ShopEase e-commerce platform.

## Setup

```bash
cd backend
npm install
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
PORT=3000
FRONTEND_URL=http://localhost:8080
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=shop_db
```

Or use the default `DATABASE_URL` format:
```
DATABASE_URL=mysql://root@127.0.0.1:3306/shop_db
```

## Running

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server runs on `http://localhost:3000`

## API Routes

All API routes are prefixed with `/api/`:

- `GET /api/categories` - List all categories
- `GET /api/products` - List products (supports filtering by category & search)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/home` - Get home page data (featured, new arrivals)
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Update cart
- `DELETE /api/cart` - Clear cart
- `POST /api/checkout` - Create order

**Admin routes** (same patterns):
- `/api/admin/categories` - CRUD categories
- `/api/admin/products` - CRUD products
- `/api/admin/orders` - List orders
- `/api/admin/reset` - Reset database

## Database

Uses MySQL 2. Schema is auto-created on first run with seed data.

## Running Full Stack

From the root directory:

```bash
# Install dependencies
npm install
cd backend && npm install

# Run both backend and frontend
npm run dev:full

# Or run separately:
npm run dev:backend      # Terminal 1
npm run dev:frontend     # Terminal 2
```

Frontend will call backend at `http://localhost:3000` (configured in frontend `.env.local`)
