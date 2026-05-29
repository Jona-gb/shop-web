import { Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useApiCategories } from "@/lib/products";
import { useAuth } from "@/lib/auth";

export function Header() {
  const { count } = useCart();
  const { data: categories = [] } = useApiCategories();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const topCats = categories.slice(0, 4);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = storedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    setMenu(false);
    navigate({ to: "/" });
  };

  return (
    <header className={`sticky top-0 z-40 ${theme === "dark" ? "bg-[#111827] text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]" : "bg-white text-slate-900 shadow-sm"}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
        <div className="h-full bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,107,90,0.18),transparent_24%)]" />
      </div>
      <div className={`relative hidden border-b ${theme === "dark" ? "border-white/10 bg-[#1f2937]/80 text-white/75" : "border-border bg-card text-muted-foreground"} text-[11px] backdrop-blur md:block`}>
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span>English</span>
            <span className="inline-flex items-center gap-1">USD <ChevronDown className="h-3 w-3" /></span>
            <span className={`inline-flex items-center gap-1.5 ${theme === "dark" ? "text-white" : "text-muted-foreground"}`}>
              <Sparkles className="h-3 w-3 text-[#ff6b5a]" />
              Free shipping on all orders over $100
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" search={{ redirect: "/" }} className={theme === "dark" ? "hover:text-white" : "hover:text-foreground"}>My account</Link>
            <Link to="/products" className={theme === "dark" ? "hover:text-white" : "hover:text-foreground"}>Compare</Link>
            <Link to="/cart" className={theme === "dark" ? "hover:text-white" : "hover:text-foreground"}>Cart ({count})</Link>
          </div>
        </div>
      </div>

      <div className={`relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 ${theme === "dark" ? "" : ""}`}>
        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/85 transition hover:bg-white/10 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-[#111827] shadow-[0_12px_24px_rgba(0,0,0,0.16)] transition group-hover:-rotate-3 group-hover:scale-105">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Quick<span className="ml-1 rounded-full bg-[#ff6b5a] px-1.5 py-0.5 text-[11px] text-white">Shop</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3.5 py-2 text-xs font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
            activeProps={{ className: "bg-[#2563eb] text-white shadow-sm hover:bg-[#2563eb] hover:text-white" }}
          >
            Home
          </Link>
          <Link
            to="/products"
            activeOptions={{ includeSearch: false }}
            className="rounded-full px-3.5 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
            activeProps={{ className: "bg-[#2563eb] text-white shadow-sm hover:bg-[#2563eb] hover:text-white" }}
          >
            Our Store
          </Link>
          {topCats.map((c) => (
            <Link
              key={c.slug}
              to="/products"
              search={{ category: c.slug }}
              className="hidden items-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/10 hover:text-white xl:inline-flex"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Link
            to="/products"
            className="hidden min-w-0 max-w-[270px] flex-1 items-center justify-between rounded-full border border-white/10 bg-white/95 px-4 py-2.5 text-xs font-medium text-[#64748b] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition hover:bg-white focus-within:ring-2 focus-within:ring-[#93c5fd] lg:flex"
            aria-label="Search products"
          >
            <span>Search products...</span>
            <Search className="h-4 w-4 text-[#2563eb]" />
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-[#93c5fd] sm:inline-flex"
              aria-label="Admin"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 sm:inline-flex"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-sm font-medium text-white/85 transition hover:border-[#93c5fd] hover:bg-white/10 hover:text-white"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </button>
              {menu && (
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              search={{ redirect: "/" }}
              className="hidden h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
          )}

          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white/85 transition hover:bg-white hover:text-[#111827]"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#ff6b5a] px-1 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="relative border-t border-white/10 bg-[#111827] md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setOpen(false)}
              className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
            >
              Our Store
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/products"
                search={{ category: c.slug }}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-[#111827]"
              >
                Admin dashboard
              </Link>
            )}
            {!user && (
              <Link
                to="/login"
                search={{ redirect: "/" }}
                onClick={() => setOpen(false)}
                className="mt-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-[#111827]"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
