import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Plus, Pencil, Trash2, X, Tag, Package, List, Save, Lock, LayoutDashboard } from "lucide-react";
import {
  useApiCategories,
  useApiProducts,
  useApiOrders,
  fetchCreateCategory,
  fetchUpdateCategory,
  fetchDeleteCategory,
  fetchCreateProduct,
  fetchUpdateProduct,
  fetchDeleteProduct,
  fetchResetStore,
  newId,
  slugify,
  categoryName,
  type Category,
  type Product,
  type OrderRecord,
} from "@/lib/products";
import { useApiUsers, promoteUser, removeUser } from "@/lib/adminClient";
import { Users, BarChart, FileText } from "lucide-react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPrice } from "@/lib/cart";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — ShopEase" }] }),
  component: AdminGate,
});

function AdminGate() {
  const { user } = useAuth();
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in with an admin account to access the dashboard.</p>
        <Link to="/login" search={{ redirect: "/admin" }} className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Sign in
        </Link>
      </div>
    );
  }
  if (user.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have access to this area.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Back to store
        </Link>
      </div>
    );
  }
  return <AdminPage />;
}

type Tab = "overview" | "products" | "categories" | "orders" | "users" | "analytics";

function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const productsQuery = useApiProducts();
  const categoriesQuery = useApiCategories();
  const ordersQuery = useApiOrders();
  const usersQuery = useApiUsers();
  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const loading = productsQuery.isLoading || categoriesQuery.isLoading || ordersQuery.isLoading || usersQuery.isLoading;
  const queryClient = useQueryClient();

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalUsers = users.length;
  const totalVisitors = Math.max(totalUsers * 3, 12487);
  const revenueByDay = buildRevenueSeries(orders, "day", 7);
  const ordersByDay = buildOrderSeries(orders, "day", 7);
  const topCategories = buildCategoryStats(products, 4);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const customerGrowth = [
    { label: "United States", value: 2417, trend: "+8.4%", color: "bg-blue-500/10 text-blue-200" },
    { label: "Germany", value: 812, trend: "+4.2%", color: "bg-emerald-500/10 text-emerald-200" },
    { label: "Australia", value: 2281, trend: "+5.9%", color: "bg-violet-500/10 text-violet-200" },
    { label: "France", value: 287, trend: "-1.0%", color: "bg-rose-500/10 text-rose-200" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[32px] border border-border bg-card/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-lg">
            <div className="mb-8 flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-sky-500/15 text-sky-200 shadow-inner shadow-sky-500/10">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">DealDeck</p>
                <p className="mt-1 text-lg font-semibold text-white">Admin panel</p>
              </div>
            </div>
            <div className="space-y-1">
              <SidebarLink active={tab === "overview"} onClick={() => setTab("overview")} icon={<Activity className="h-4 w-4" />}>
                Dashboard
              </SidebarLink>
              <SidebarLink active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="h-4 w-4" />}>
                Products
              </SidebarLink>
              <SidebarLink active={tab === "categories"} onClick={() => setTab("categories")} icon={<Tag className="h-4 w-4" />}>
                Categories
              </SidebarLink>
              <SidebarLink active={tab === "orders"} onClick={() => setTab("orders")} icon={<List className="h-4 w-4" />}>
                Orders
              </SidebarLink>
              <SidebarLink active={tab === "users"} onClick={() => setTab("users")} icon={<Users className="h-4 w-4" />}>
                Customers
              </SidebarLink>
              <SidebarLink active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<BarChart className="h-4 w-4" />}>
                Analytics
              </SidebarLink>
            </div>

            <div className="mt-10 rounded-[28px] border border-border bg-card/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Need help?</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Check the documentation or reach out to support for setup and dashboard questions.</p>
              <button className="mt-4 w-full rounded-full border border-border bg-card/5 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-slate-100/80 dark:hover:bg-white/10">
                Support center
              </button>
            </div>
          </aside>

          <main className="space-y-6">
            <div className="rounded-[32px] border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-lg">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-sky-400/70">Sales Report</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Store performance dashboard</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card/5 px-4 py-2 text-sm text-muted-foreground">
                  <span className="grid h-10 w-10 place-items-center rounded-3xl bg-card/10 text-foreground">
                    {user?.name?.charAt(0) ?? "A"}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                    <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{user?.role}</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="overflow-hidden rounded-[28px] border border-border bg-card/80 p-5 animate-pulse">
                    <div className="h-4 w-32 bg-muted/40 rounded mb-4" />
                    <div className="h-8 w-20 bg-muted/40 rounded" />
                    <div className="mt-4 h-3 w-40 bg-muted/40 rounded" />
                  </div>
                  <div className="overflow-hidden rounded-[28px] border border-border bg-card/80 p-5 animate-pulse">
                    <div className="h-4 w-32 bg-muted/40 rounded mb-4" />
                    <div className="h-8 w-20 bg-muted/40 rounded" />
                    <div className="mt-4 h-3 w-40 bg-muted/40 rounded" />
                  </div>
                  <div className="overflow-hidden rounded-[28px] border border-border bg-card/80 p-5 animate-pulse">
                    <div className="h-4 w-32 bg-muted/40 rounded mb-4" />
                    <div className="h-8 w-20 bg-muted/40 rounded" />
                    <div className="mt-4 h-3 w-40 bg-muted/40 rounded" />
                  </div>
                  <div className="overflow-hidden rounded-[28px] border border-border bg-card/80 p-5 animate-pulse">
                    <div className="h-4 w-32 bg-muted/40 rounded mb-4" />
                    <div className="h-8 w-20 bg-muted/40 rounded" />
                    <div className="mt-4 h-3 w-40 bg-muted/40 rounded" />
                  </div>
                </div>
              ) : (
                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    title="Total Sales"
                    value={formatPrice(Number(totalRevenue.toFixed(0)))}
                    delta="+2.0%"
                    description="Products vs last month"
                    accent="from-sky-500 to-cyan-400"
                  />
                  <MetricCard
                    title="Total Orders"
                    value={totalOrders}
                    delta="+12.4%"
                    description="Orders vs last month"
                    accent="from-emerald-500 to-lime-400"
                  />
                  <MetricCard
                    title="Visitors"
                    value={totalVisitors}
                    delta="-2.0%"
                    description="Users vs last month"
                    accent="from-rose-500 to-fuchsia-400"
                  />
                  <MetricCard
                    title="Total Products"
                    value={totalProducts}
                    delta="+12.1%"
                    description="Products vs last month"
                    accent="from-violet-500 to-indigo-400"
                  />
                </div>
              )}
            </div>

            {tab === "overview" ? (
              <div className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
                <section className="rounded-[32px] border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-lg">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Customer habits</p>
                      <h2 className="mt-3 text-2xl font-semibold text-foreground">Track your customer habits</h2>
                    </div>
                    <div className="inline-flex items-center rounded-full border border-border bg-card/5 px-3 py-2 text-sm text-muted-foreground">
                      <span className="mr-2 inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" /> Seen product
                    </div>
                  </div>
                  <div className="mt-8 h-[360px] rounded-[28px] border border-border bg-card/80 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart data={ordersByDay} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip wrapperStyle={{ backgroundColor: "#0f172a", borderRadius: 12, border: "none" }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 12 }} labelStyle={{ color: "#fff" }} itemStyle={{ color: "#fff" }} />
                        <Bar dataKey="value" fill="#60a5fa" radius={[12, 12, 0, 0]} />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="rounded-[32px] border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Product statistic</p>
                        <h3 className="mt-3 text-lg font-semibold text-foreground">Track your product sales</h3>
                      </div>
                      <div className="rounded-full bg-card/80 px-3 py-1 text-xs uppercase tracking-[0.35em] text-muted-foreground">Today</div>
                    </div>
                    <div className="mt-7 flex items-center justify-center">
                      <div className="relative grid h-48 w-48 place-items-center rounded-full bg-card/80">
                        <div className="absolute inset-4 rounded-full border border-border bg-card/90" />
                        <div className="absolute inset-8 rounded-full bg-card" />
                        <div className="relative grid h-40 w-40 place-items-center rounded-full bg-card text-center">
                          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground">9.829</p>
                          <p className="mt-2 text-xs text-muted-foreground">Product sales</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-7 space-y-4">
                      {topCategories.map((category, index) => (
                        <div key={category.slug} className="flex items-center justify-between rounded-3xl border border-border bg-card/80 px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{category.slug}</p>
                            <p className="text-xs text-muted-foreground">{category.count} products</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${index % 2 === 0 ? "bg-emerald-500/10 text-emerald-200" : "bg-sky-500/10 text-sky-200"}`}>
                            +{Math.round((category.count / (totalProducts || 1)) * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-border bg-card/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Customer growth</p>
                        <h3 className="mt-3 text-lg font-semibold text-foreground">Track customer by locations</h3>
                      </div>
                      <div className="rounded-full bg-card/80 px-3 py-1 text-xs uppercase tracking-[0.35em] text-muted-foreground">Today</div>
                    </div>
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {customerGrowth.slice(0, 2).map((item) => (
                          <div key={item.label} className="rounded-[28px] border border-border bg-card/80 p-4">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.trend}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {customerGrowth.slice(2).map((item) => (
                          <div key={item.label} className="rounded-[28px] border border-border bg-card/80 p-4">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="mt-2 text-xl font-semibold text-foreground">{item.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.trend}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            ) : tab === "products" ? (
              <ProductsTab products={products} categories={categories} loading={loading} />
            ) : tab === "categories" ? (
              <CategoriesTab categories={categories} products={products} loading={loading} />
            ) : tab === "orders" ? (
              <OrdersTab orders={orders} loading={loading} />
            ) : tab === "users" ? (
              <UsersTab loading={loading} />
            ) : (
              <AnalyticsTab orders={orders} products={products} users={users} loading={loading} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  description,
  accent,
}: {
  title: string;
  value: string | number;
  delta: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-card/80 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`inline-flex rounded-full bg-gradient-to-r ${accent} px-3 py-1 text-sm font-semibold text-white/90`}>{delta}</div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function SidebarLink({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left text-sm font-medium transition ${
        active ? "bg-white/10 text-white shadow-[0_10px_30px_rgba(255,255,255,0.08)]" : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition " +
        (active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------------- Categories ---------------- */

function CategoriesTab({ categories, products, loading }: { categories: Category[]; products: Product[]; loading: boolean }) {
  const [name, setName] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const queryClient = useQueryClient();

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
          <div className="h-4 w-40 rounded bg-muted/40 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-muted/40" />
            ))}
          </div>
        </div>
        <div className="h-fit rounded-2xl border border-border bg-card p-5 animate-pulse">
          <div className="h-4 w-36 rounded bg-muted/40 mb-4" />
          <div className="h-12 rounded-2xl bg-muted/40" />
        </div>
      </div>
    );
  }

  async function add() {
    const n = name.trim();
    if (!n) return;
    const slug = slugify(n);
    if (!slug || categories.some((c) => c.slug === slug)) {
      alert("Category already exists or has invalid name.");
      return;
    }

    try {
      await fetchCreateCategory(n);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  async function remove(slug: string) {
    const inUse = products.filter((p) => p.category === slug).length;
    if (inUse > 0 && !confirm(`${inUse} product(s) use this category. Delete anyway?`)) return;

    try {
      await fetchDeleteCategory(slug);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveEdit() {
    if (!editingSlug) return;
    const n = editingName.trim();
    if (!n) return;

    try {
      await fetchUpdateCategory(editingSlug, n);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingSlug(null);
      setEditingName("");
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">All categories</h2>
        </div>
        {categories.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No categories yet. Add your first one →</p>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((c) => {
              const count = products.filter((p) => p.category === c.slug).length;
              const editing = editingSlug === c.slug;
              return (
                <li key={c.slug} className="flex items-center gap-3 px-5 py-3">
                  {editing ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      className={inputCls + " flex-1"}
                    />
                  ) : (
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">/{c.slug} · {count} product{count === 1 ? "" : "s"}</p>
                    </div>
                  )}
                  <div className="flex gap-1">
                    {editing ? (
                      <>
                        <IconBtn onClick={saveEdit} title="Save"><Save className="h-4 w-4" /></IconBtn>
                        <IconBtn onClick={() => { setEditingSlug(null); setEditingName(""); }} title="Cancel"><X className="h-4 w-4" /></IconBtn>
                      </>
                    ) : (
                      <>
                        <IconBtn onClick={() => { setEditingSlug(c.slug); setEditingName(c.name); }} title="Edit"><Pencil className="h-4 w-4" /></IconBtn>
                        <IconBtn onClick={() => remove(c.slug)} title="Delete" danger><Trash2 className="h-4 w-4" /></IconBtn>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold">Add a category</h3>
        <p className="mt-1 text-sm text-muted-foreground">Categories let customers filter your products.</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="e.g. Toys & Games"
          className={inputCls + " mt-4"}
        />
        <button onClick={add} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add category
        </button>
      </div>
    </div>
  );
}

/* ---------------- Products ---------------- */

function ProductsTab({ products, categories, loading }: { products: Product[]; categories: Category[]; loading: boolean }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
          <div className="h-4 w-40 rounded bg-muted/40 mb-4" />
          <div className="h-4 w-32 rounded bg-muted/40 mb-4" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await fetchDeleteProduct(id);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  async function upsert(p: Product) {
    try {
      const exists = products.some((x) => x.id === p.id);
      if (exists) {
        await fetchUpdateProduct(p);
      } else {
        await fetchCreateProduct(p);
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(null);
      setCreating(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  if (creating || editing) {
    return (
      <ProductForm
        initial={editing ?? blankProduct(categories[0]?.slug ?? "")}
        categories={categories}
        onCancel={() => { setEditing(null); setCreating(false); }}
        onSave={upsert}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
        <button
          onClick={() => setCreating(true)}
          disabled={categories.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New product
        </button>
      </div>
      {categories.length === 0 && (
        <p className="mt-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          Add a category first to create products.
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                <img src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{categoryName(p.category, categories)} · {formatPrice(p.price)}</p>
                </div>
                <div className="hidden gap-1 sm:flex">
                  {p.isFeatured && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Featured</span>}
                  {p.isNew && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">New</span>}
                </div>
                <div className="flex gap-1">
                  <IconBtn onClick={() => setEditing(p)} title="Edit"><Pencil className="h-4 w-4" /></IconBtn>
                  <IconBtn onClick={() => remove(p.id)} title="Delete" danger><Trash2 className="h-4 w-4" /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders, loading }: { orders: OrderRecord[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 rounded-2xl border border-border bg-card/80 p-4 animate-pulse" />
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 animate-pulse">
          {[...Array(5)].map((index) => (
            <div key={index} className="mb-3 h-14 rounded-2xl bg-muted/40 last:mb-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted-foreground">Showing {orders.length} order{orders.length === 1 ? "" : "s"}</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No orders have been placed yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Paid</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.email}</td>
                    <td className="px-4 py-3 text-foreground">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.payment.toUpperCase()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersTab({ loading }: { loading: boolean }) {
  const queryClient = useQueryClient();
  const { data: users = [] } = useApiUsers();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 rounded-2xl border border-border bg-card/80 p-4 animate-pulse" />
        <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
          {[...Array(5)].map((index) => (
            <div key={index} className="mb-3 h-14 rounded-2xl bg-muted/40 last:mb-0" />
          ))}
        </div>
      </div>
    );
  }

  async function setRole(email: string, role: "admin" | "customer") {
    try {
      await promoteUser(email, role);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function del(email: string) {
    if (!confirm(`Delete user ${email}?`)) return;
    try {
      await removeUser(email);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <div className="flex justify-between gap-3">
        <p className="text-sm text-muted-foreground">Users ({users.length})</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email} className="border-b border-border hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.role !== "admin" && <button onClick={() => setRole(u.email, "admin")} className="mr-2 text-xs text-primary">Make admin</button>}
                      {u.role === "admin" && <button onClick={() => setRole(u.email, "customer")} className="mr-2 text-xs text-muted-foreground">Demote</button>}
                      <button onClick={() => del(u.email)} className="text-xs text-destructive">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ orders, products, users, loading }: { orders: OrderRecord[]; products: Product[]; users: { email: string }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((index) => (
            <div key={index} className="h-28 rounded-2xl border border-border bg-card p-4 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="h-80 rounded-2xl border border-border bg-card p-6 animate-pulse" />
          <div className="space-y-6">
            <div className="h-64 rounded-2xl border border-border bg-card p-5 animate-pulse" />
            <div className="h-64 rounded-2xl border border-border bg-card p-5 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalUsers = users.length;
  const revenueByDay = buildRevenueSeries(orders, "day", 7);
  const topCategories = buildCategoryStats(products, 4);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Revenue" value={formatPrice(Number(totalRevenue.toFixed(0)))} />
        <Stat label="Orders" value={totalOrders} />
        <Stat label="Products" value={totalProducts} />
        <Stat label="Users" value={totalUsers} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue last 7 days</p>
              <h2 className="mt-2 text-2xl font-semibold">Store performance</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted p-4 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Orders</p>
                <p className="mt-2 text-xl font-semibold">{totalOrders}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue</p>
                <p className="mt-2 text-xl font-semibold">{formatPrice(Number(totalRevenue.toFixed(0)))}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Products</p>
                <p className="mt-2 text-xl font-semibold">{totalProducts}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatPrice(Number(value)), "Revenue"]} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Top categories</h3>
                <p className="mt-1 text-xs text-muted-foreground">Most stocked categories</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Catalog</span>
            </div>
            <div className="mt-5 space-y-4">
              {topCategories.map((category) => (
                <div key={category.slug} className="flex items-center justify-between rounded-2xl border border-border bg-card/80 px-4 py-3">
                  <div>
                    <p className="font-medium">{category.slug}</p>
                    <p className="text-xs text-muted-foreground">{category.count} products</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Top</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Recent orders</h3>
                <p className="mt-1 text-xs text-muted-foreground">Latest customer activity</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Live</span>
            </div>
            <div className="mt-5 space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-border bg-card/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatPrice(order.total || 0)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{order.name} · {order.email}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildOrderSeries(orders: OrderRecord[], period: "day" | "month" | "year", length: number) {
  const countMap = new Map<string, number>();
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const key =
      period === "day"
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : period === "month"
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : `${date.getFullYear()}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  });

  const now = new Date();
  const series = [] as { label: string; value: number }[];

  for (let index = length - 1; index >= 0; index--) {
    const date = new Date(now);
    if (period === "day") {
      date.setDate(now.getDate() - index);
    } else if (period === "month") {
      date.setMonth(now.getMonth() - index);
      date.setDate(1);
    } else {
      date.setFullYear(now.getFullYear() - index);
      date.setMonth(0);
      date.setDate(1);
    }

    const key =
      period === "day"
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : period === "month"
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : `${date.getFullYear()}`;

    const label =
      period === "day"
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : period === "month"
        ? date.toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : date.getFullYear().toString();

    series.push({ label, value: countMap.get(key) ?? 0 });
  }

  return series;
}

function buildRevenueSeries(orders: OrderRecord[], period: "day" | "month" | "year", length: number) {
  const revenueMap = new Map<string, number>();
  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const key =
      period === "day"
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : period === "month"
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : `${date.getFullYear()}`;
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + (order.total || 0));
  });

  const now = new Date();
  const series = [] as { label: string; value: number }[];

  for (let index = length - 1; index >= 0; index--) {
    const date = new Date(now);
    if (period === "day") {
      date.setDate(now.getDate() - index);
    } else if (period === "month") {
      date.setMonth(now.getMonth() - index);
      date.setDate(1);
    } else {
      date.setFullYear(now.getFullYear() - index);
      date.setMonth(0);
      date.setDate(1);
    }

    const key =
      period === "day"
        ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        : period === "month"
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : `${date.getFullYear()}`;

    const label =
      period === "day"
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : period === "month"
        ? date.toLocaleDateString(undefined, { month: "short", year: "numeric" })
        : date.getFullYear().toString();

    series.push({ label, value: revenueMap.get(key) ?? 0 });
  }

  return series;
}

function buildCategoryStats(products: Product[], limit: number) {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function AnalyticsTab({ orders, products, users, loading }: { orders: OrderRecord[]; products: Product[]; users: { email: string }[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
          <div className="h-80 rounded-2xl border border-border bg-card p-6 animate-pulse" />
          <div className="h-80 rounded-2xl border border-border bg-card p-6 animate-pulse" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="h-64 rounded-2xl border border-border bg-card p-5 animate-pulse" />
          <div className="h-64 rounded-2xl border border-border bg-card p-5 animate-pulse" />
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalUsers = users.length;
  const ordersByDay = buildOrderSeries(orders, "day", 7);
  const revenueByDay = buildRevenueSeries(orders, "day", 7);
  const ordersByMonth = buildOrderSeries(orders, "month", 6);
  const revenueByMonth = buildRevenueSeries(orders, "month", 6);
  const topCategories = buildCategoryStats(products, 4);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue overview</p>
              <h2 className="mt-2 text-3xl font-semibold">Sales performance</h2>
              <p className="mt-2 text-sm text-muted-foreground">Track revenue, orders, and product activity in one view.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-muted p-4 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue</p>
                <p className="mt-2 text-xl font-semibold">{formatPrice(Number(totalRevenue.toFixed(0)))}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Orders</p>
                <p className="mt-2 text-xl font-semibold">{totalOrders}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-4 text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Avg order</p>
                <p className="mt-2 text-xl font-semibold">{formatPrice(Number(avgOrder.toFixed(0)))}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatPrice(Number(value)), "Revenue"]} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">Top categories</h3>
                <p className="mt-1 text-xs text-muted-foreground">Products per category</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Catalog</span>
            </div>
            <div className="mt-5 space-y-4">
              {topCategories.map((category) => (
                <div key={category.slug} className="flex items-center justify-between rounded-2xl border border-border bg-card/80 px-4 py-3">
                  <div>
                    <p className="font-medium">{category.slug}</p>
                    <p className="text-xs text-muted-foreground">{category.count} products</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Top</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold">User growth</h3>
                <p className="mt-1 text-xs text-muted-foreground">Active users and signup trends</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Live</span>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total users</p>
                <p className="mt-2 text-2xl font-semibold">{totalUsers}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">New orders in 7d</p>
                <p className="mt-2 text-2xl font-semibold">{ordersByDay.reduce((sum, point) => sum + point.value, 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Revenue by month</h3>
              <p className="mt-1 text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Monthly</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={revenueByMonth} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatPrice(Number(value)), "Revenue"]} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Recent orders</h3>
              <p className="mt-1 text-xs text-muted-foreground">Latest customer activity</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Live</span>
          </div>
          <div className="mt-5 space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-border bg-card/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(order.total || 0)}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{order.name} · {order.email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function blankProduct(category: string): Product {
  return {
    id: newId(),
    name: "",
    category,
    price: 0,
    image: "",
    description: "",
    isFeatured: false,
    isNew: true,
  };
}

function ProductForm({
  initial,
  categories,
  onCancel,
  onSave,
}: {
  initial: Product;
  categories: Category[];
  onCancel: () => void;
  onSave: (p: Product) => void;
}) {
  const [p, setP] = useState<Product>(initial);
  const [err, setErr] = useState<string | null>(null);

  function update<K extends keyof Product>(k: K, v: Product[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) return setErr("Name is required.");
    if (!p.category) return setErr("Category is required.");
    if (p.price < 0) return setErr("Price must be ≥ 0.");
    if (!p.image.trim()) return setErr("Image URL is required.");
    onSave({ ...p, name: p.name.trim(), description: p.description.trim(), image: p.image.trim() });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">{initial.name ? "Edit product" : "New product"}</h2>

        <FieldRow label="Name">
          <input value={p.name} onChange={(e) => update("name", e.target.value)} className={inputCls} placeholder="e.g. Wireless Earbuds" />
        </FieldRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label="Category">
            <select value={p.category} onChange={(e) => update("category", e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Price (USD)">
            <input type="number" min={0} step={1} value={p.price} onChange={(e) => update("price", Number(e.target.value))} className={inputCls} />
          </FieldRow>
        </div>

        <FieldRow label="Image URL">
          <input value={p.image} onChange={(e) => update("image", e.target.value)} className={inputCls} placeholder="https://..." />
        </FieldRow>

        <FieldRow label="Description">
          <textarea rows={4} value={p.description} onChange={(e) => update("description", e.target.value)} className={inputCls + " resize-none"} />
        </FieldRow>

        <div className="flex flex-wrap gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!p.isFeatured} onChange={(e) => update("isFeatured", e.target.checked)} className="accent-[color:var(--primary)]" />
            Featured
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!p.isNew} onChange={(e) => update("isNew", e.target.checked)} className="accent-[color:var(--primary)]" />
            Mark as new
          </label>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Save product
          </button>
          <button type="button" onClick={onCancel} className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold hover:border-foreground/30">
            Cancel
          </button>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
        <div className="mt-3 overflow-hidden rounded-xl bg-muted">
          {p.image ? (
            <img src={p.image} alt="" className="aspect-square w-full object-cover" />
          ) : (
            <div className="grid aspect-square place-items-center text-xs text-muted-foreground">No image</div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{categoryName(p.category, categories)}</p>
        <p className="text-sm font-semibold">{p.name || "Untitled"}</p>
        <p className="text-sm font-bold">{formatPrice(p.price || 0)}</p>
      </aside>
    </form>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={
        "grid h-8 w-8 place-items-center rounded-lg border border-border bg-background transition " +
        (danger ? "hover:border-destructive hover:text-destructive" : "hover:border-primary hover:text-primary")
      }
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

