import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { formatPrice, useCart } from "@/lib/cart";
import { categoryName } from "@/lib/products";
import { getShippingCost, getOrderTotal } from "@/lib/controllers/checkoutController";
import { getInventoryLabel, getInventoryStatus, getInventoryTextClass } from "@/lib/inventory";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — ShopEase" }] }),
  component: CartPage,
});

function CartPage() {
  const { detailed, subtotal, setQty, remove } = useCart();
  const shipping = getShippingCost(subtotal);
  const total = getOrderTotal(subtotal);
  const hasUnavailableItems = detailed.some(({ product, qty }) => product.stock <= 0 || qty > product.stock);

  if (detailed.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted">
          <ShoppingBag className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add a few items to get started.</p>
        <Link
          to="/products"
          className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Your cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {detailed.map(({ product, qty, lineTotal }) => {
            const inventoryStatus = getInventoryStatus(product.stock);
            return (
            <li key={product.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4">
              <Link to="/products/$id" params={{ id: product.id }} className="block w-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-28">
                <img src={product.image} alt={product.name} className="aspect-square h-full w-full object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <Link to="/products/$id" params={{ id: product.id }} className="block truncate font-semibold hover:text-primary">
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{categoryName(product.category)}</p>
                    <p className={`mt-2 text-xs ${qty > product.stock ? "text-destructive" : getInventoryTextClass(inventoryStatus)}`}>
                      {getInventoryLabel(product.stock, true)}
                    </p>
                    {qty > product.stock && product.stock > 0 && (
                      <p className="mt-1 text-xs text-destructive">Reduce quantity before checkout.</p>
                    )}
                  </div>
                  <button onClick={() => remove(product.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between pt-4">
                  <div className="flex items-center rounded-full border border-border">
                    <button onClick={() => setQty(product.id, qty - 1)} className="px-2.5 py-1.5 text-foreground/70 hover:text-primary">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                    <button
                      onClick={() => setQty(product.id, Math.min(product.stock, qty + 1))}
                      disabled={qty >= product.stock || product.stock <= 0}
                      className="px-2.5 py-1.5 text-foreground/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="font-semibold">{formatPrice(lineTotal)}</p>
                </div>
              </div>
            </li>
          );
          })}
        </ul>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Order summary</h2>
          <div className="mt-5 space-y-2">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
          </div>
          <div className="my-5 border-t border-border" />
          <Row label="Total" value={formatPrice(total)} emphasis />
          {hasUnavailableItems ? (
            <button
              type="button"
              disabled
              className="mt-6 block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground opacity-50"
            >
              Update cart to checkout
            </button>
          ) : (
            <Link
              to="/checkout"
              className="mt-6 block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Proceed to checkout
            </Link>
          )}
          <Link to="/products" className="mt-3 block text-center text-sm font-medium text-muted-foreground hover:text-primary">
            Continue shopping →
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasis ? "font-display text-base font-semibold" : "text-sm text-muted-foreground"}>{label}</span>
      <span className={emphasis ? "font-display text-lg font-bold" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}
