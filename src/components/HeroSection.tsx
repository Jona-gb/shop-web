import { Link } from "@tanstack/react-router";

interface HeroSectionProps {
  image: string;
  headline: string;
  description: string;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  highlightedText?: string;
}

export function HeroSection({
  image,
  headline,
  description,
  primaryCtaText = "Buy now",
  primaryCtaLink = "/products",
  secondaryCtaText = "Learn more",
  secondaryCtaLink = "/products",
  highlightedText,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#bfdbfe] to-transparent" />
      <div className="shop-container py-6">
        <div className="relative grid min-h-[520px] items-center overflow-hidden rounded-[2rem] border border-[#e5e7eb] bg-[#f8fbff] px-5 py-10 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:px-8 md:grid-cols-[0.86fr_1.14fr] md:py-0 lg:px-14">
          <div className="absolute left-8 top-8 h-24 w-24 rounded-full border border-white/70" />
          <div className="absolute bottom-8 right-[42%] h-16 w-16 rounded-full bg-[#ff6b5a]/20 blur-xl" />

          <div className="z-10 flex max-w-xl flex-col items-start gap-5">
            <p className="section-kicker">Curated everyday tech</p>
            <h1 className="font-display text-4xl font-semibold leading-[1.03] text-[#111827] sm:text-6xl">
              {headline}
              {highlightedText && (
                <>
                  <br />
                  <span>{highlightedText}</span>
                </>
              )}
            </h1>

            <p className="max-w-sm text-lg font-medium leading-7 text-[#4f4b45]">{description}</p>
            <p className="rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-semibold text-[#64748b]">
              From $999.00 or $41.62/mo for 24 months
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={primaryCtaLink}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#2563eb] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                {primaryCtaText}
              </Link>
              <Link
                to={secondaryCtaLink}
                className="inline-flex h-11 items-center justify-center rounded-full px-1 text-sm font-semibold text-[#111827] transition hover:text-[#2563eb]"
              >
                {secondaryCtaText}
              </Link>
            </div>
          </div>

          <div className="relative h-[300px] overflow-hidden md:h-[520px]">
            <div className="absolute inset-y-10 right-0 w-[78%] rounded-l-[4rem] bg-white/45" />
            <img
              src={image}
              alt={headline}
              className="relative h-full w-full object-contain object-center drop-shadow-[0_28px_45px_rgba(32,25,17,0.2)] md:object-right"
            />
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
              <span className="h-2 w-6 rounded-full bg-[#2563eb]" />
              <span className="h-2 w-2 rounded-full bg-[#ff6b5a]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
