import type { Product } from "@/lib/products";

export const LOW_STOCK_THRESHOLD = 5;

export type InventoryStatus = "in-stock" | "low-stock" | "out-of-stock";

export function getInventoryStatus(stock: number): InventoryStatus {
  if (stock <= 0) return "out-of-stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export function getInventoryLabel(stock: number, exact = false) {
  const status = getInventoryStatus(stock);
  if (status === "out-of-stock") return "Out of stock";
  if (status === "low-stock") return exact ? `Low stock: ${stock}` : "Low stock";
  return exact ? `In stock: ${stock}` : "In stock";
}

export function getInventoryStatusClass(status: InventoryStatus) {
  if (status === "out-of-stock") return "bg-destructive text-destructive-foreground";
  if (status === "low-stock") return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
}

export function getInventoryTextClass(status: InventoryStatus) {
  if (status === "out-of-stock") return "text-destructive";
  if (status === "low-stock") return "text-amber-700 dark:text-amber-300";
  return "text-muted-foreground";
}

export function calculateInventoryValue(products: Product[]) {
  return products.reduce((sum, product) => sum + product.price * Math.max(0, product.stock), 0);
}
