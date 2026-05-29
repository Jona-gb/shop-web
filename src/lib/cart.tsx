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
  add: (productId: string, qty?: number) => void;
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
  await fetch("/api/cart", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const productIds = items.map((item) => item.productId);
  const { data: products = [] } = useApiProductsByIds(productIds);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mounted = true;

    fetchCartItems().then((items) => {
      if (mounted) setItems(items);
    }).catch(() => {
      if (mounted) setItems([]);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    persistCartItems(items).catch(() => {
      // swallow persistence errors; cart state remains in memory until retry
    });
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    const detailed = buildDetailedCart(items, products);

    return {
      items,
      add: (productId, qty = 1) =>
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.productId === productId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], qty: next[idx].qty + qty };
            return next;
          }
          return [...prev, { productId, qty }];
        }),
      remove: (productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)),
      setQty: (productId, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((i) => i.productId !== productId)
            : prev.map((i) => (i.productId === productId ? { ...i, qty } : i)),
        ),
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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
