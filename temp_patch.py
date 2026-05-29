from pathlib import Path

replacements = [
    {
        'path': 'src/lib/api.ts',
        'old': 'import {\n  getCategories,\n  getProducts,\n  getProductById,\n  createOrder,\n  createCategory,\n  updateCategory,\n  deleteCategory,\n  createProduct,\n  updateProduct,\n  deleteProduct,\n  resetStore,\n  getOrders,\n  getCartItems,\n  setCartItems,\n  clearCartItems,\n} from "@/lib/db";\n',
        'new': 'import {\n  getCategories,\n  getProducts,\n  getProductById,\n  getProductsByIds,\n  getHomePageProducts,\n  createOrder,\n  createCategory,\n  updateCategory,\n  deleteCategory,\n  createProduct,\n  updateProduct,\n  deleteProduct,\n  resetStore,\n  getOrders,\n  getCartItems,\n  setCartItems,\n  clearCartItems,\n} from "@/lib/db";\n',
    },
    {
        'path': 'src/lib/api.ts',
        'old': '  if (path === "/api/products" && request.method === "GET") {\n    return json(await getProducts(url.searchParams.get("category") ?? undefined, url.searchParams.get("q") ?? undefined));\n  }\n\n  if (path === "/api/products/related" && request.method === "GET") {\n',
        'new': '  if (path === "/api/products" && request.method === "GET") {\n    const limitValue = url.searchParams.get("limit");\n    return json(await getProducts(\n      url.searchParams.get("category") ?? undefined,\n      url.searchParams.get("q") ?? undefined,\n      limitValue ? Number(limitValue) : undefined,\n    ));\n  }\n\n  if (path === "/api/products/home" && request.method === "GET") {\n    return json(await getHomePageProducts());\n  }\n\n  if (path === "/api/products/ids" && request.method === "GET") {\n    const ids = url.searchParams.getAll("id");\n    return json(await getProductsByIds(ids));\n  }\n\n  if (path === "/api/products/related" && request.method === "GET") {\n',
    },
    {
        'path': 'src/routes/index.tsx',
        'old': 'import { CategoryCarousel, Category } from "@/components/CategoryCarousel";\nimport { FeaturedSection, PromotionalBanner } from "@/components/FeaturedSection";\nimport { HeroSection } from "@/components/HeroSection";\nimport { ProductCard } from "@/components/ProductCard";\nimport { TrendingProducts } from "@/components/TrendingProducts";\nimport { useApiCategories, useApiProducts } from "@/lib/products";\nimport { getCategoryStats, getFeaturedProducts, getNewArrivals } from "@/lib/controllers/productController";\n',
        'new': 'import { CategoryCarousel, Category } from "@/components/CategoryCarousel";\nimport { FeaturedSection, PromotionalBanner } from "@/components/FeaturedSection";\nimport { HeroSection } from "@/components/HeroSection";\nimport { ProductCard } from "@/components/ProductCard";\nimport { TrendingProducts } from "@/components/TrendingProducts";\nimport { useApiHomeProducts } from "@/lib/products";\n',
    },
    {
        'path': 'src/routes/index.tsx',
        'old': 'function HomePage() {\n  const { data: products = [] } = useApiProducts();\n  const { data: categories = [] } = useApiCategories();\n  const featured = getFeaturedProducts(products);\n  const newArrivals = getNewArrivals(products);\n  const categoryItems: Category[] = getCategoryStats(categories, products).map((category) => ({\n    slug: category.slug,\n    name: category.name,\n    icon: getCategoryIcon(category.slug, category.name),\n    count: category.count,\n  }));\n',
        'new': 'function HomePage() {\n  const { data: homeData = { featured: [], newArrivals: [], categoryStats: [] } } = useApiHomeProducts();\n  const featured = homeData.featured;\n  const newArrivals = homeData.newArrivals;\n  const categoryItems: Category[] = homeData.categoryStats.map((category) => ({\n    slug: category.slug,\n    name: category.name,\n    icon: getCategoryIcon(category.slug, category.name),\n    count: category.count,\n  }));\n',
    },
    {
        'path': 'src/lib/cart.tsx',
        'old': 'import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";\nimport { useApiProducts } from "./products";\nimport {\n  type CartDetail,\n  type CartItem,\n  buildDetailedCart,\n  calculateCartCount,\n  calculateCartSubtotal,\n\n} from "./controllers/cartController";\n',
        'new': 'import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";\nimport { useApiProductsByIds } from "./products";\nimport {\n  type CartDetail,\n  type CartItem,\n  buildDetailedCart,\n  calculateCartCount,\n  calculateCartSubtotal,\n\n} from "./controllers/cartController";\n',
    },
    {
        'path': 'src/lib/cart.tsx',
        'old': 'export function CartProvider({ children }: { children: ReactNode }) {\n  const [items, setItems] = useState<CartItem[]>([]);\n  const { data: products = [] } = useApiProducts();\n\n  useEffect(() => {\n',
        'new': 'export function CartProvider({ children }: { children: ReactNode }) {\n  const [items, setItems] = useState<CartItem[]>([]);\n  const productIds = items.map((item) => item.productId);\n  const { data: products = [] } = useApiProductsByIds(productIds);\n\n  useEffect(() => {\n',
    },
]

for entry in replacements:
    path = Path(entry['path'])
    text = path.read_text(encoding='utf-8')
    if entry['old'] not in text:
        raise ValueError(f"Old text not found in {entry['path']}\n{entry['old']}")
    text = text.replace(entry['old'], entry['new'], 1)
    path.write_text(text, encoding='utf-8')
print('patched')
