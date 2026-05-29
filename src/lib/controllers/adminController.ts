import { type Category, type Product, newId, slugify } from "@/lib/products";

// Admin helper functions for managing categories and products.
export function createCategoryValue(name: string, categories: Category[]) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  const slug = slugify(trimmed);
  if (!slug) throw new Error("Category name is invalid.");
  if (categories.some((c) => c.slug === slug)) throw new Error("Category already exists.");
  return { slug, name: trimmed } as Category;
}

// Remove a category by slug while preserving the remaining collection.
export function removeCategory(categories: Category[], products: Product[], slug: string) {
  return categories.filter((category) => category.slug !== slug);
}

// Update only the display name of an existing category.
export function updateCategoryName(categories: Category[], slug: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  return categories.map((category) => (category.slug === slug ? { ...category, name: trimmed } : category));
}

// Add a new product or update an existing one.
export function upsertProduct(products: Product[], product: Product) {
  const exists = products.some((item) => item.id === product.id);
  return exists ? products.map((item) => (item.id === product.id ? product : item)) : [...products, product];
}

// Create a blank product template for the admin product form.
export function blankProduct(category: string): Product {
  return {
    id: newId(),
    name: "",
    category,
    price: 0,
    image: "",
    description: "",
    isFeatured: false,
    isNew: true,
  };
}

// Validate admin product form data before saving.
export function validateProduct(product: Product) {
  if (!product.name.trim()) return "Name is required.";
  if (!product.category) return "Category is required.";
  if (product.price < 0) return "Price must be ≥ 0.";
  if (product.stock < 0) return "Stock must be ≥ 0.";
  if (!product.image.trim()) return "Image URL is required.";
  return null;
}
