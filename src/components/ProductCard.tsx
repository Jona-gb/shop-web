import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { categoryName, type Product } from "@/lib/products";
import { ProductQuickView } from "./ProductQuickView";

export function ProductCard({ product }: { product: Product }) {
  const [quickOpen, setQuickOpen] = useState(false);
  const inStock = product.stock > 0;

  return (
    <>
      <div className="group">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_60px_rgba(15,23,42,0.09)]">
          <Link to="/products/$id" params={{ id: product.id }} className="block h-full w-full">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
            />
          </Link>
          {product.isNew && (
            <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-foreground">
              New
            </span>
          )}
          {!inStock && (
            <span className="absolute right-4 top-4 rounded-full bg-destructive px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive-foreground">
              Out of stock
            </span>
          )}
          <div className="absolute inset-0 flex items-end justify-center bg-black/0 p-4 transition-all duration-300 group-hover:bg-black/20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQuickOpen(true);
              }}
              className="translate-y-4 rounded-full bg-card px-5 py-2.5 text-xs font-semibold text-foreground opacity-0 shadow-xl transition-all duration-300 hover:bg-primary hover:text-primary-foreground group-hover:translate-y-0 group-hover:opacity-100"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> View details
              </span>
            </button>
          </div>
        </div>

        <Link to="/products/$id" params={{ id: product.id }} className="flex items-start justify-between gap-3 px-2 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {categoryName(product.category)}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-foreground group-hover:text-primary">{product.name}</h3>
            <p className={`mt-1 text-xs ${inStock ? "text-muted-foreground" : "text-destructive"}`}>
              {inStock ? `${product.stock} in stock` : "Out of stock"}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-foreground">{formatPrice(product.price)}</p>
        </Link>
      </div>

      <ProductQuickView product={product} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
