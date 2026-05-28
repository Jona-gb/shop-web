import { Link } from "@tanstack/react-router";
import { LucideIcon } from "lucide-react";

export interface Category {
  slug: string;
  name: string;
  icon: LucideIcon;
  count: number;
}

interface CategoryCarouselProps {
  categories: Category[];
  title?: string;
}

export function CategoryCarousel({ categories, title = "Shop by Category" }: CategoryCarouselProps) {
  return (
    <section className="bg-white">
      <div className="shop-container py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Browse simply</p>
            <h2 className="section-heading mt-2">{title}</h2>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.slug}
                to="/products"
                search={{ category: category.slug }}
                className="group soft-panel flex min-h-36 flex-col items-center justify-center rounded-2xl p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-[#bfdbfe] hover:bg-[#f8fbff]"
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f8fbff] shadow-sm transition group-hover:bg-[#2563eb] group-hover:shadow-md">
                  <Icon className="h-7 w-7 text-[#111827] transition group-hover:text-white" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[#111827]">{category.name}</h3>
                <p className="mt-1 text-[11px] font-medium text-[#64748b]">{category.count} items</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
