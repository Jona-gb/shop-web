import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export interface PromotionalBanner {
  id: string;
  title: string;
  description?: string;
  image: string;
  badge?: string;
  discount?: string;
  link: string;
  linkText?: string;
  layout?: "horizontal" | "vertical";
  tone?: "cream" | "rose" | "blue" | "white" | "lavender";
}

interface FeaturedSectionProps {
  banners: PromotionalBanner[];
  title?: string;
}

export function FeaturedSection({ banners, title = "Featured Collections" }: FeaturedSectionProps) {
  return (
    <section className="bg-white pb-16">
      <div className="shop-container">
        {title && (
          <div className="mb-8">
            <p className="section-kicker">Featured edit</p>
            <h2 className="section-heading mt-2">{title}</h2>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <Link
              key={banner.id}
              to={banner.link}
              className={`group relative grid min-h-[250px] overflow-hidden rounded-3xl border border-white/70 p-8 shadow-[0_18px_55px_rgba(32,25,17,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(32,25,17,0.12)] ${toneClass(banner.tone)}`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-white/80" />
              <div className="relative z-10 max-w-[58%]">
                {banner.badge && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#64748b]">{banner.badge}</p>
                )}
                {banner.discount && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2563eb]">{banner.discount}</p>
                )}
                <div className="mt-3">
                  <h3 className="font-display text-2xl font-semibold leading-tight text-[#111827]">
                    {banner.title}
                  </h3>
                  {banner.description && (
                    <p className="mt-2 text-sm font-medium text-[#4f4b45]">{banner.description}</p>
                  )}
                  <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#111827] transition group-hover:text-[#2563eb]">
                    {banner.linkText || "Shop now"}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
              <img
                src={banner.image}
                alt={banner.title}
                className="absolute bottom-0 right-0 h-full w-[56%] object-contain object-bottom drop-shadow-[0_18px_25px_rgba(32,25,17,0.16)] transition-transform duration-500 group-hover:scale-105"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function toneClass(tone: PromotionalBanner["tone"]) {
  const tones = {
    cream: "bg-[#fffaf0]",
    rose: "bg-[#fff1ed]",
    blue: "bg-[#eff6ff]",
    white: "bg-white",
    lavender: "bg-[#f5f3ff]",
  };

  return tones[tone ?? "white"];
}
