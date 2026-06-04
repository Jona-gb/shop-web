import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, ArrowRight, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type Product, categoryName } from "@/lib/products";
import { formatPrice, useCart } from "@/lib/cart";
import { getInventoryLabel, getInventoryStatus, getInventoryTextClass } from "@/lib/inventory";

export function ProductQuickView({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inStock = product.stock > 0;
  const inventoryStatus = getInventoryStatus(product.stock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Quick view of {product.name}
        </DialogDescription>

        <div className="grid md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square bg-muted md:aspect-auto md:min-h-[500px]">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {product.isNew && (
              <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                New
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col p-6 sm:p-8">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {categoryName(product.category)}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                {product.name}
              </h2>
              <p className="mt-3 text-xl font-bold text-foreground">
                {formatPrice(product.price)}
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {product.description}
              </p>
              <p className={`mt-4 text-sm font-medium ${getInventoryTextClass(inventoryStatus)}`}>
                {getInventoryLabel(product.stock, true)}
              </p>

              <div className="mt-6 space-y-3 border-t border-border pt-6 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" /> Free shipping on orders over $50
                </p>
                <p className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" /> 30-day easy returns
                </p>
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Secure checkout
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-full border border-border bg-card">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={!inStock}
                  className="px-3 py-2.5 text-foreground/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Decrease"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock || !inStock}
                  className="px-3 py-2.5 text-foreground/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Increase"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  add(product.id, qty, product.stock);
                  setAdded(true);
                  setTimeout(() => setAdded(false), 1800);
                }}
                disabled={!inStock}
                className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:flex-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {added ? "Added to cart" : inStock ? "Add to cart" : "Out of stock"}
              </button>
            </div>

            <Link
              to="/products/$id"
              params={{ id: product.id }}
              onClick={() => onOpenChange(false)}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View full details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
