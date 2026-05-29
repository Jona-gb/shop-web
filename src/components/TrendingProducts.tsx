import { useState } from "react";
import { Product } from "@/lib/products";
import { ProductCard } from "./ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TrendingProductsProps {
  allProducts: Product[];
  newProducts: Product[];
  bestSellers: Product[];
  featured: Product[];
}

export function TrendingProducts({
  allProducts,
  newProducts,
  bestSellers,
  featured,
}: TrendingProductsProps) {
  const [activeTab, setActiveTab] = useState("new");

  const safeAllProducts = allProducts ?? [];
  const safeNewProducts = newProducts ?? [];
  const safeBestSellers = bestSellers ?? [];
  const safeFeatured = featured ?? [];

  const tabData = {
    new: safeNewProducts.slice(0, 8),
    best: safeBestSellers.slice(0, 8),
    featured: safeFeatured.slice(0, 8),
    all: safeAllProducts.slice(0, 8),
  };

  return (
    <section className="bg-background py-16">
      <div className="shop-container">
        <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="section-kicker">Worth a look</p>
            <h2 className="section-heading mt-2">Our trending products</h2>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-full border border-border bg-card p-1 md:w-auto md:grid-cols-4">
              <TabsTrigger value="new" className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white">New products</TabsTrigger>
              <TabsTrigger value="best" className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white">Best selling</TabsTrigger>
              <TabsTrigger value="featured" className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white">Featured</TabsTrigger>
              <TabsTrigger value="all" className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white">Popular</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tabData[activeTab as keyof typeof tabData].map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
