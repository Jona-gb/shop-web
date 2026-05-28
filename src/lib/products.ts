import { useEffect, useState } from "react";

export type Product = {
  id: string;
  name: string;
  category: string; // category slug
  price: number;
  image: string;
  description: string;
  isNew?: boolean;
  isFeatured?: boolean;
};

export type Category = {
  slug: string;
  name: string;
};

export const seedCategories: Category[] = [
  { slug: "electronics", name: "Electronics" },
  { slug: "fashion", name: "Fashion" },
  { slug: "home", name: "Home & Living" },
  { slug: "beauty", name: "Beauty" },
  { slug: "sports", name: "Sports & Outdoors" },
  { slug: "books", name: "Books" },
];

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const seedProducts: Product[] = [
  { id: "p1", name: "Wireless Headphones", category: "electronics", price: 129, image: img("photo-1505740420928-5e560c06d30e"), description: "Over-ear Bluetooth headphones with active noise cancellation and 30-hour battery life.", isFeatured: true, isNew: true },
  { id: "p2", name: "Smart Watch Series 5", category: "electronics", price: 249, image: img("photo-1546868871-7041f2a55e12"), description: "Fitness tracking, heart-rate monitoring, and notifications on a crisp AMOLED display.", isFeatured: true },
  { id: "p3", name: "Classic Cotton Tee", category: "fashion", price: 28, image: img("photo-1521572163474-6864f9cf17ab"), description: "Soft 100% organic cotton t-shirt with a relaxed everyday fit.", isNew: true },
  { id: "p4", name: "Canvas Sneakers", category: "fashion", price: 65, image: img("photo-1542291026-7eec264c27ff"), description: "Lightweight low-top sneakers with cushioned insole and rubber sole.", isFeatured: true },
  { id: "p5", name: "Ceramic Mug Set", category: "home", price: 32, image: img("photo-1514228742587-6b1558fcca3d"), description: "Set of four handcrafted stoneware mugs, microwave and dishwasher safe." },
  { id: "p6", name: "Linen Throw Pillow", category: "home", price: 45, image: img("photo-1592078615290-033ee584e267"), description: "Stonewashed linen pillow cover with hidden zip. Insert included.", isNew: true },
  { id: "p7", name: "Hydrating Face Serum", category: "beauty", price: 38, image: img("photo-1620916566398-39f1143ab7be"), description: "Lightweight hyaluronic acid serum for a plump, dewy glow.", isFeatured: true },
  { id: "p8", name: "Yoga Mat Pro", category: "sports", price: 58, image: img("photo-1599447421416-3414500d18a5"), description: "6mm non-slip TPE mat with carrying strap. Perfect for yoga, pilates and stretching." },
  { id: "p9", name: "Stainless Water Bottle", category: "sports", price: 24, image: img("photo-1602143407151-7111542de6e8"), description: "Double-walled insulated bottle keeps drinks cold for 24h, hot for 12h." },
  { id: "p10", name: "The Modern Reader", category: "books", price: 18, image: img("photo-1544947950-fa07a98d237f"), description: "A curated anthology of contemporary short fiction.", isNew: true },
  { id: "p11", name: "Minimalist Backpack", category: "fashion", price: 89, image: img("photo-1553062407-98eeb64c6a62"), description: "Water-resistant 20L backpack with padded laptop sleeve.", isFeatured: true },
  { id: "p12", name: "Aroma Diffuser", category: "home", price: 54, image: img("photo-1602928298849-325cec8771c0"), description: "Ultrasonic essential oil diffuser with ambient LED lighting." },
];

const CAT_KEY = "shopease.categories.v2";
const PROD_KEY = "shopease.products.v2";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return seedCategories;
  return safeParse(localStorage.getItem(CAT_KEY), seedCategories);
}
export function loadProducts(): Product[] {
  if (typeof window === "undefined") return seedProducts;
  return safeParse(localStorage.getItem(PROD_KEY), seedProducts);
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((f) => f()); }

export function saveCategories(c: Category[]) {
  localStorage.setItem(CAT_KEY, JSON.stringify(c));
  emit();
}
export function saveProducts(p: Product[]) {
  localStorage.setItem(PROD_KEY, JSON.stringify(p));
  emit();
}

export function useCategories(): Category[] {
  const [c, setC] = useState<Category[]>(seedCategories);
  useEffect(() => {
    setC(loadCategories());
    const fn = () => setC(loadCategories());
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return c;
}

export function useProducts(): Product[] {
  const [p, setP] = useState<Product[]>(seedProducts);
  useEffect(() => {
    setP(loadProducts());
    const fn = () => setP(loadProducts());
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return p;
}

export function getProduct(id: string): Product | undefined {
  return loadProducts().find((p) => p.id === id);
}

export function categoryName(slug: string, list?: Category[]): string {
  const cats = list ?? loadCategories();
  return cats.find((c) => c.slug === slug)?.name ?? slug;
}

export function newId(prefix = "p") {
  return prefix + Math.random().toString(36).slice(2, 9);
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
