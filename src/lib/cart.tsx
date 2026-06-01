import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApiProductsByIds } from "./products";
import {
  type CartDetail,
  type CartItem,
  buildDetailedCart,
  calculateCartCount,
  calculateCartSubtotal,

} from "./controllers/cartController";

type CartCtx = {
  items: CartItem[];
  add: (productId: string, qty?: number, maxQty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  detailed: CartDetail[];
};

const Ctx = createContext<CartCtx | null>(null);

async function fetchCartItems(): Promise<CartItem[]> {
  const response = await fetch("/api/cart", {
    credentials: "same-origin",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items: CartItem[] };
  return payload.items ?? [];
}

async function persistCartItems(items: CartItem[]) {
  const response = await fetch("/api/cart", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cart persistence failed: ${response.status} ${response.statusText} ${errorText}`);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const productIds = items.map((item) => item.productId);
  const { data: products = [] } = useApiProductsByIds(productIds);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    fetchCartItems().then((items) => {
      if (mounted) setItems(items);
    }).catch(() => {
      if (mounted) setItems([]);
    }).finally(() => {
      if (mounted) setCartLoaded(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !cartLoaded) return;
    persistCartItems(items).catch((error) => {
      console.error("Failed to persist cart items:", error);
    });
  }, [cartLoaded, items]);

  const value = useMemo<CartCtx>(() => {
    const detailed = buildDetailedCart(items, products);
    const stockByProductId = new Map(products.map((product) => [product.id, product.stock]));
    const clampQty = (productId: string, qty: number, maxQty?: number) => {
      const stock = maxQty ?? stockByProductId.get(productId);
      if (stock !== undefined) return Math.max(0, Math.min(stock, qty));
      return Math.max(0, qty);
    };

    return {
      items,
      add: (productId, qty = 1, maxQty) =>
        setItems((prev) => {
          const nextQty = clampQty(productId, qty, maxQty);
          if (nextQty <= 0) return prev;
          const idx = prev.findIndex((i) => i.productId === productId);
          if (idx >= 0) {
            const next = [...prev];
            const currentQty = next[idx].qty;
            const cappedQty = clampQty(productId, currentQty + qty, maxQty);
            next[idx] = { ...next[idx], qty: cappedQty };
            return next;
          }
          return [...prev, { productId, qty: nextQty }];
        }),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      setQty: (productId, qty) =>
        setItems((prev) => {
          const nextQty = clampQty(productId, qty);
          return nextQty <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, qty: nextQty } : i));
        }),
      clear: () => setItems([]),
      count: calculateCartCount(items),
      subtotal: calculateCartSubtotal(detailed),
      detailed,
    };
  }, [items, products]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "GHc", maximumFractionDigits: 0 }).format(n);
}
