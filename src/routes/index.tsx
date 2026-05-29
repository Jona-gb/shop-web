import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Dumbbell,
  Gem,
  Headphones,
  Home,
  Laptop,
  LucideIcon,
  Package,
  Shirt,
  Sparkles,
  Smartphone,
  Speaker,
  Tablet,
  Tv,
  Watch,
  Zap,
} from "lucide-react";
import { CategoryCarousel, Category } from "@/components/CategoryCarousel";
import { FeaturedSection, PromotionalBanner } from "@/components/FeaturedSection";
import { HeroSection } from "@/components/HeroSection";
import { ProductCard } from "@/components/ProductCard";
import { TrendingProducts } from "@/components/TrendingProducts";
import { useApiHomeProducts } from "@/lib/products";

const productImage = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const heroPhoneImage = productImage("photo-1592750475338-74b7b21085ab");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickShop - Electronics, gadgets, and daily tech" },
      { name: "description", content: "Shop smart phones, audio, laptops, wearables, and trending electronics with fast shipping." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: homeData = { featured: [], newArrivals: [], categoryStats: [] } } = useApiHomeProducts();
  const featured = homeData.featured;
  const newArrivals = homeData.newArrivals;
  const allProducts = [...featured, ...newArrivals].slice(0, 8);
  const categoryItems: Category[] = homeData.categoryStats.map((category) => ({
    slug: category.slug,
    name: category.name,
    icon: getCategoryIcon(category.slug, category.name),
    count: category.count,
  }));

  const promotionalBanners: PromotionalBanner[] = [
    {
      id: "banner-1",
      title: "Galaxy S13 Lite",
      description: "Love The Price.",
      badge: "Big saving",
      discount: "From $429.00",
      image: heroPhoneImage,
      link: "/products",
      linkText: "Buy now",
      tone: "cream",
    },
    {
      id: "banner-2",
      title: "Smartwatch 7",
      description: "Light On Price.",
      badge: "15% off",
      discount: "From $399.00",
      image: productImage("photo-1546868871-7041f2a55e12"),
      link: "/products",
      linkText: "Learn more",
      tone: "rose",
    },
    {
      id: "banner-3",
      title: "Five Bold Colors.",
      description: "$99 Each.",
      badge: "Smart home",
      discount: "From $229.00",
      image: productImage("photo-1608043152269-423dbba4e7e1"),
      link: "/products",
      linkText: "Buy now",
      tone: "blue",
    },
    {
      id: "banner-4",
      title: "5th Generation AirPods.",
      badge: "Best price",
      discount: "From $499.00",
      image: productImage("photo-1600294037681-c80b4cb5b434"),
      link: "/products",
      linkText: "Learn more",
      tone: "white",
    },
    {
      id: "banner-5",
      title: "Headset Max 3rd Generation.",
      badge: "Flat 25% off",
      discount: "From $549.00",
      image: productImage("photo-1505740420928-5e560c06d30e"),
      link: "/products",
      linkText: "Buy now",
      tone: "blue",
    },
    {
      id: "banner-6",
      title: "Mac Book Pro. New Arrival",
      badge: "Newly added",
      discount: "From $2449",
      image: productImage("photo-1517336714731-489689fd1ca8"),
      link: "/products",
      linkText: "Learn more",
      tone: "lavender",
    },
  ];

  return (
    <div className="bg-background">
      <HeroSection
        image={heroPhoneImage}
        headline="Galaxy S13+ Ultra."
        highlightedText=""
        description="Supercharged for pros. $999.00"
        primaryCtaText="Buy now"
        primaryCtaLink="/products"
        secondaryCtaText="Learn more"
        secondaryCtaLink="/products"
      />

      {categoryItems.length > 0 && <CategoryCarousel categories={categoryItems} title="Our Top Categories" />}

      <FeaturedSection banners={promotionalBanners} title="" />

      <TrendingProducts
        allProducts={allProducts}
        newProducts={newArrivals}
        bestSellers={featured}
        featured={featured}
      />

      {newArrivals.length > 0 && (
        <section className="shop-container py-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Fresh finds</p>
              <h2 className="section-heading mt-2">New arrivals</h2>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function getCategoryIcon(slug: string, name: string): LucideIcon {
  const label = `${slug} ${name}`.toLowerCase();

  if (label.includes("tv")) return Tv;
  if (label.includes("speaker")) return Speaker;
  if (label.includes("tablet")) return Tablet;
  if (label.includes("airpod") || label.includes("headphone") || label.includes("audio")) return Headphones;
  if (label.includes("watch")) return Watch;
  if (label.includes("phone") || label.includes("mobile")) return Smartphone;
  if (label.includes("laptop") || label.includes("computer")) return Laptop;
  if (label.includes("bluetooth") || label.includes("electronics") || label.includes("gadget")) return Zap;
  if (label.includes("fashion") || label.includes("shirt") || label.includes("clothing")) return Shirt;
  if (label.includes("home") || label.includes("living")) return Home;
  if (label.includes("beauty") || label.includes("skin")) return Sparkles;
  if (label.includes("sport") || label.includes("fitness")) return Dumbbell;
  if (label.includes("book")) return BookOpen;
  if (label.includes("jewel") || label.includes("accessor")) return Gem;

  return Package;
}
