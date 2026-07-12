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
    <header className="sticky top-0 z-40 bg-slate-950 text-white shadow-sm shadow-black/20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
        <div className="h-full bg-[radial-gradient(circle_at_20%_0%,rgba(249,115,22,0.24),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(251,146,60,0.18),transparent_24%)]" />
      </div>
      <div className="relative hidden border-b border-slate-800 bg-slate-950 text-slate-300 text-[11px] backdrop-blur md:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span>English</span>
            <span className="inline-flex items-center gap-1">GH₵ <ChevronDown className="h-3 w-3" /></span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Free shipping on all orders over GH₵10000
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" search={{ redirect: "/" }} className="transition hover:text-foreground">My account</Link>
            <Link to="/products" className="transition hover:text-foreground">Compare</Link>
            <Link to="/cart" className="transition hover:text-foreground">Cart ({count})</Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-800 bg-slate-900 text-white transition hover:bg-slate-800 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_24px_rgba(249,115,22,0.22)] transition group-hover:-rotate-3 group-hover:scale-105">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Quick<span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground">Shop</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-800 bg-slate-950/95 p-1 md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
            activeProps={{ className: "bg-primary text-primary-foreground shadow-sm hover:bg-orange-600 hover:text-primary-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/products"
            activeOptions={{ includeSearch: false }}
            className="rounded-full px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
            activeProps={{ className: "bg-primary text-primary-foreground shadow-sm hover:bg-orange-600 hover:text-primary-foreground" }}
          >
            Our Store
          </Link>
          {topCats.map((c) => (
            <Link
              key={c.slug}
              to="/products"
              search={{ category: c.slug }}
              className="hidden items-center gap-1 rounded-full px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/80 hover:text-white xl:inline-flex"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Link
            to="/products"
            className="hidden min-w-0 max-w-[270px] flex-1 items-center justify-between rounded-full border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-200 shadow-sm transition hover:bg-slate-800/80 hover:text-white focus-within:ring-2 focus-within:ring-primary lg:flex"
            aria-label="Search products"
          >
            <span>Search products...</span>
            <Search className="h-4 w-4 text-primary" />
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/dashboard"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white transition hover:bg-slate-800/80 sm:inline-flex"
              aria-label="Admin"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-white transition hover:bg-slate-800/80 sm:inline-flex"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex h-10 items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 text-sm font-medium text-white transition hover:border-primary hover:bg-slate-800/80"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </button>
              {menu && (
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {user.role === "admin" && (
                    <Link
                      to="/dashboard"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition hover:bg-muted"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground transition hover:bg-muted"
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
              className="hidden h-10 items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800/80 sm:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
          )}

          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-800 bg-slate-900 text-white transition hover:bg-slate-800/80 hover:text-white"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="relative border-t border-slate-800 bg-slate-950 md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800/80"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setOpen(false)}
              className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800/80"
            >
              Our Store
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                to="/products"
                search={{ category: c.slug }}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link
                to="/dashboard"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Admin dashboard
              </Link>
            )}
            {!user && (
              <Link
                to="/login"
                search={{ redirect: "/" }}
                onClick={() => setOpen(false)}
                className="mt-2 rounded-2xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
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
