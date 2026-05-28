export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#e5e7eb] bg-[#111827] text-white">
      <div className="shop-container py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[#ff6b5a] font-display text-lg font-bold text-white">
                S
              </span>
              <span className="font-display text-lg font-bold text-white">QuickShop</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">
              Everything you need, all in one place. Fast shipping, easy returns.
            </p>
          </div>
          <FooterCol title="Shop" links={["New Arrivals", "Best Sellers", "All Products", "Gift Cards"]} />
          <FooterCol title="Support" links={["Contact", "Shipping", "Returns", "FAQ"]} />
          <FooterCol title="Company" links={["About", "Careers", "Press", "Sustainability"]} />
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} QuickShop. All rights reserved.</p>
          <p>Made with care.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm text-white/60">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="transition-colors hover:text-[#93c5fd]">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
