import { type Product } from "@/lib/products";

// A single item in the shopping cart.
export type CartItem = { productId: string; qty: number };

// The detailed cart item shape used for UI display.
export type CartDetail = {
  product: Product;
  qty: number;
  lineTotal: number;
};

// Build detailed cart entries by joining cart item IDs to the product catalog.
export function buildDetailedCart(items: CartItem[], products: Product[]): CartDetail[] {
  return items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { product, qty: item.qty, lineTotal: product.price * item.qty };
    })
    .filter((entry): entry is CartDetail => entry !== null);
}

// Calculate the total number of items in the cart.
export function calculateCartCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

// Calculate subtotal from detailed cart entries.
export function calculateCartSubtotal(detailed: CartDetail[]) {
  return detailed.reduce((sum, entry) => sum + entry.lineTotal, 0);
}
