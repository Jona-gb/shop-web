import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in - ShopEase" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate({ to: user.role === "admin" ? "/admin" : redirectTo });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8fb] text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.88fr] lg:items-center lg:py-10">
        <BrandPanel mode="login" />

        <main className="flex justify-center lg:justify-end">
          <section className="w-full max-w-[440px] rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Account</p>
                <h1 className="mt-3 font-display text-3xl font-semibold tracking-normal text-slate-950 dark:text-white">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Sign in to continue shopping with your saved details.
                </p>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <ShoppingBag className="h-5 w-5" />
              </span>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full bg-transparent pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Password" icon={<Lock className="h-4 w-4" />}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full bg-transparent pr-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </Field>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(15,23,42,0.20)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">New to ShopEase?</span>
              <Link
                to="/signup"
                search={{ redirect: redirectTo }}
                className="font-semibold text-slate-950 transition hover:text-primary dark:text-white"
              >
                Create account
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/10 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:bg-slate-900">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}

function BrandPanel({ mode }: { mode: "login" | "signup" }) {
  return (
    <aside className="relative hidden min-h-[620px] overflow-hidden rounded-lg bg-slate-950 text-white shadow-[0_28px_90px_rgba(15,23,42,0.22)] lg:block">
      <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,0.78)_44%,rgba(15,23,42,0.30)_100%),url('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center" />
      <div className="relative flex h-full min-h-[620px] flex-col justify-between p-10">
        <Link to="/" className="inline-flex w-fit items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-slate-950">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">ShopEase</span>
        </Link>

        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            Secure checkout ready
          </p>
          <h2 className="mt-6 font-display text-5xl font-semibold leading-[1.03]">
            {mode === "login" ? "Your next find is waiting." : "A sharper way to shop starts here."}
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/75">
            Curated essentials, quick checkout, and account tools built for a smoother store experience.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["Fast", "Curated", "Secure"].map((item) => (
            <div key={item} className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">{item}</p>
              <p className="mt-1 text-sm font-semibold text-white">Shopping</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
