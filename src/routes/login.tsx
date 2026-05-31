import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ShopEase" }] }),
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
    <div className="min-h-[calc(100vh-8rem)] bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto grid min-h-full max-w-6xl lg:grid-cols-[1.1fr_0.9fr] px-4 py-12 sm:px-6">
        <section className="relative hidden overflow-hidden rounded-[2rem] bg-sky-600 px-10 py-14 text-white shadow-lg lg:block">
          <div className="absolute -right-20 top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute left-12 bottom-0 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative z-10 max-w-lg">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-200">Adventure starts here</p>
            <h1 className="mt-6 text-5xl font-display font-semibold leading-tight">
              Welcome back to ShopEase
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-sky-100/95">
              Sign in and continue shopping the styles you love with fast checkout, saved favorites, and order tracking.
            </p>
          </div>
        </section>

        <main className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-border bg-white p-10 shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="mb-8 flex flex-col items-center gap-4 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-semibold">Hello! Welcome back</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Enter your credentials to access your account.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              New here?{' '}
              <Link to="/signup" className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
                Create Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
