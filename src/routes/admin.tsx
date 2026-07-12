import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { Activity, Plus, Minus, Pencil, Trash2, X, Tag, Package, List, Save, Lock, LayoutDashboard, Search, Bell, MessageSquare, Settings, LogOut, ChevronRight, Users, BarChart, FileText, MoreVertical, CalendarDays, Globe2, ShoppingBag, ShoppingCart, ReceiptText, PackageSearch, ImagePlus } from "lucide-react";
import {
  fetchCreateCategory,
  fetchUpdateCategory,
  fetchDeleteCategory,
  fetchCreateProduct,
  fetchUpdateProduct,
  fetchDeleteProduct,
  fetchUploadProductImage,
  fetchResetStore,
  newId,
  slugify,
  categoryName,
  type Category,
  type Product,
  type OrderRecord,
  type OrderDetails,
  type OrderStatus,
  type AdminDashboardData,
  type HomePageData,
  orderStatuses,
  fetchOrderDetails,
  fetchUpdateOrderStatus,
  useApiAdminDashboard,
  fetchAdminDashboard,
} from "@/lib/products";
import { useApiUsers, promoteUser, removeUser } from "@/lib/adminClient";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatPrice } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { calculateInventoryValue, getInventoryLabel, getInventoryStatus, getInventoryStatusClass, type InventoryStatus } from "@/lib/inventory";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin â€” ShopEase" }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["admin-dashboard"],
      queryFn: fetchAdminDashboard,
    }),
  component: AdminGate,
});

function AdminGate() {
  const { user, logout } = useAuth();
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

type Tab = "overview" | "products" | "inventory" | "categories" | "orders" | "users" | "analytics";

function updateProductListCache(old: Product[] | undefined, product?: Product, deletedId?: string) {
  if (!old) return old;
  if (deletedId) return old.filter((item) => item.id !== deletedId);
  if (!product) return old;

  let replaced = false;
  const next = old.map((item) => {
    if (item.id !== product.id) return item;
    replaced = true;
    return product;
  });
  return replaced ? next : old;
}

async function refreshProductQueries(queryClient: QueryClient, product?: Product, deletedId?: string) {
  if (product) {
    queryClient.setQueryData(["product", product.id], product);
  }

  queryClient.setQueriesData<Product[]>({ queryKey: ["products"] }, (old) => updateProductListCache(old, product, deletedId));
  queryClient.setQueriesData<Product[]>({ queryKey: ["products-by-ids"] }, (old) => updateProductListCache(old, product, deletedId));
  queryClient.setQueriesData<Product[]>({ queryKey: ["related-products"] }, (old) => updateProductListCache(old, product, deletedId));
  queryClient.setQueryData<AdminDashboardData>(["admin-dashboard"], (old) => {
    if (!old) return old;
    const products = deletedId
      ? old.products.filter((item) => item.id !== deletedId)
      : product
      ? old.products.some((item) => item.id === product.id)
        ? old.products.map((item) => (item.id === product.id ? product : item))
        : [...old.products, product]
      : old.products;
    return { ...old, products };
  });
  queryClient.setQueryData<HomePageData>(["home-page-data"], (old) => {
    if (!old) return old;
    return {
      ...old,
      featured: updateProductListCache(old.featured, product, deletedId) ?? old.featured,
      newArrivals: updateProductListCache(old.newArrivals, product, deletedId) ?? old.newArrivals,
    };
  });

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["products"] }),
    queryClient.invalidateQueries({ queryKey: ["product"] }),
    queryClient.invalidateQueries({ queryKey: ["products-by-ids"] }),
    queryClient.invalidateQueries({ queryKey: ["home-page-data"] }),
    queryClient.invalidateQueries({ queryKey: ["related-products"] }),
    queryClient.invalidateQueries({ queryKey: ["categories"] }),
  ]);
}

export function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const dashboardQuery = useApiAdminDashboard();
  const usersQuery = useApiUsers();
  const products = dashboardQuery.data?.products ?? [];
  const categories = dashboardQuery.data?.categories ?? [];
  const orders = dashboardQuery.data?.orders ?? [];
  const users = usersQuery.data ?? [];
  // Always use actual database data, never fall back to seed data
  const displayProducts = products;
  const displayCategories = categories;
  // Loading is when fetching AND we only have placeholder data or no data yet
  const dashboardLoading = dashboardQuery.isFetching && (dashboardQuery.isPlaceholderData || !dashboardQuery.data);
  const productsLoading = dashboardLoading;
  const categoriesLoading = dashboardLoading;
  const ordersLoading = dashboardQuery.isFetching && dashboardQuery.isPlaceholderData;
  const usersLoading = usersQuery.isFetching && usersQuery.isPlaceholderData;
  const productsError = dashboardQuery.isError;

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = displayProducts.length;
  const totalUsers = users.length;
  const revenueStat = totalRevenue;
  const customerCount = totalUsers;
  const orderCount = totalOrders;
  const inventoryValue = calculateInventoryValue(displayProducts);
  const chartSource = buildRevenueSeries(orders, "month", 6);
  const orderChartSource = buildOrderSeries(orders, "month", 6);
  const orderScale = totalOrders > 0 && totalRevenue > 0 ? Math.max(totalRevenue / totalOrders, 1) : 1;
  const chartData = chartSource.map((point, index) => ({
    label: point.label.split(" ")[0],
    revenue: Math.round(point.value),
    orders: Math.round((orderChartSource[index]?.value ?? 0) * orderScale),
    orderCount: orderChartSource[index]?.value ?? 0,
  }));
  const revenuePercent = totalRevenue > 0 ? 100 : 0;
  const orderPercent = Math.min(Math.round((totalOrders / Math.max(totalOrders + totalProducts, 1)) * 100), 100);
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);
  const transactions =
    recentOrders.length > 0
      ? recentOrders.map((order, index) => ({
          id: order.id,
          title: order.name || `Order ${order.orderNumber}`,
          detail: `${order.orderNumber} - ${new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
          amount: `+${formatPrice(order.total || 0)}`,
          icon: index % 2 === 0 ? <ShoppingCart className="h-3.5 w-3.5" /> : <ReceiptText className="h-3.5 w-3.5" />,
        }))
      : [
          { id: "empty-orders", title: "No recent orders", detail: "Orders will appear here", amount: formatPrice(0), icon: <ReceiptText className="h-3.5 w-3.5" /> },
        ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "products", label: "Products", icon: <Package className="h-4 w-4" /> },
    { id: "inventory", label: "Inventory", icon: <PackageSearch className="h-4 w-4" /> },
    { id: "categories", label: "Categories", icon: <Tag className="h-4 w-4" /> },
    { id: "orders", label: "Orders", icon: <List className="h-4 w-4" /> },
    { id: "users", label: "Customers", icon: <Users className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen overflow-hidden bg-background">
        <div className="grid min-h-screen lg:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="flex flex-col border-b border-border bg-slate-950 p-5 text-white lg:border-b-0 lg:border-r lg:border-slate-800">
            <div className="mb-7 flex items-center gap-3 px-2">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold">QuickShop</span>
            </div>
            <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2 lg:overflow-visible">
              <Link
                to="/"
                className="flex shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white lg:w-full"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Back to website
              </Link>
              {tabs.map((item) => (
                <SidebarLink key={item.id} active={tab === item.id} onClick={() => setTab(item.id)} icon={item.icon}>
                  {item.label}
                </SidebarLink>
              ))}
            </nav>

            <div className="mt-6 hidden rounded-[18px] bg-slate-900 p-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.28)] lg:mt-auto lg:block">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Store status</p>
                <span className="text-accent">*</span>
              </div>
              <p className="text-xs leading-5 text-white/68">Live catalog, orders, and customer data.</p>
              <button onClick={logout} className="mt-4 inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-orange-600">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </aside>

          <main className="min-w-0 bg-slate-50 p-4 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs text-muted-foreground md:max-w-[360px]">
                <Search className="h-4 w-4" />
                <input className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Search" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-foreground">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  29.05.2026
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-foreground">
                  <Globe2 className="h-3.5 w-3.5" />
                  EN
                </button>
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-white text-foreground" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-white px-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{user?.name?.charAt(0) ?? "A"}</span>
                  <span className="max-w-[120px] truncate text-xs font-semibold">{user?.name ?? "Admin"}</span>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {tab === "overview" ? (
              <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.7fr)]">
                <section className="space-y-5">
                  <div className="relative overflow-hidden rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_18px_42px_rgba(15,23,42,0.24)]">
                    <div className="absolute -right-8 top-10 h-28 w-28 rounded-full bg-accent/35 blur-2xl" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">Store revenue</p>
                        <h1 className="mt-3 font-display text-3xl font-bold">{ordersLoading ? "Loading..." : formatPrice(revenueStat)}</h1>
                        <p className="mt-1 text-xs text-white/60">{ordersLoading ? "Syncing order totals" : `${orderCount} order${orderCount === 1 ? "" : "s"} processed`}</p>
                      </div>
                      <MoreVertical className="h-5 w-5 text-white/80" />
                    </div>
                    <div className="relative mt-9">
                      <p className="text-[11px] text-white/64">Admin account</p>
                      <p className="mt-2 text-xs tracking-[0.08em] text-white/90">{user?.email ?? "admin@quickshop.local"}</p>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-border bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.08em]">Recent orders</h2>
                      <button className="text-xs font-semibold text-primary">See all</button>
                    </div>
                    <div className="space-y-2">
                      {transactions.map((item) => (
                        <TransactionRow key={item.id} {...item} />
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="rounded-[18px] border border-border bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.08em]">Store statistics</h2>
                      <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold">1 month</button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_72px]">
                      <SpendingCard title="Revenue" value={ordersLoading ? "Loading..." : formatPrice(totalRevenue)} detail={ordersLoading ? "Syncing orders" : `${totalOrders} order${totalOrders === 1 ? "" : "s"} processed`} percent={revenuePercent} color="#f97316" />
                      <SpendingCard title="Catalog value" value={formatPrice(inventoryValue)} detail={`${totalProducts} product${totalProducts === 1 ? "" : "s"}`} percent={orderPercent} color="#fb923c" />
                      <button onClick={() => setTab("products")} className="grid min-h-24 place-items-center rounded-[18px] border border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary">
                        <span className="grid gap-1 text-center">
                          <Plus className="mx-auto h-4 w-4" />
                          Product
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-border bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xs font-bold uppercase tracking-[0.08em]">Sales overview</h2>
                      <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-semibold">6 months</button>
                    </div>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(value) => formatPrice(Number(value))} />
                          <Tooltip
                            formatter={(value, name, props) => {
                              if (name === "orders") return [props.payload.orderCount, "Orders"];
                              return [formatPrice(Number(value)), "Revenue"];
                            }}
                          />
                          <Bar dataKey="revenue" fill="#f97316" radius={[5, 5, 0, 0]} barSize={9} />
                          <Bar dataKey="orders" fill="#fb923c" radius={[5, 5, 0, 0]} barSize={9} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-full bg-primary" />Revenue</span>
                      <span className="inline-flex items-center gap-2"><i className="h-2 w-4 rounded-full bg-accent" />Orders</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <DashboardMetric label="Customers" value={usersLoading ? "Loading..." : customerCount} detail="Registered accounts" />
                    <DashboardMetric label="Orders" value={ordersLoading ? "Loading..." : orderCount} detail={ordersLoading ? "Syncing revenue" : formatPrice(totalRevenue)} />
                    <DashboardMetric label="Categories" value={displayCategories.length} detail={`${totalProducts} products`} />
                  </div>
                </section>
              </div>
            ) : tab === "products" ? (
              <ProductsTab products={products} categories={categories} loading={productsLoading} hasError={productsError} />
            ) : tab === "inventory" ? (
              <InventoryTab products={products} loading={productsLoading} hasError={productsError} />
            ) : tab === "categories" ? (
              <CategoriesTab categories={categories} products={products} loading={categoriesLoading} />
            ) : tab === "orders" ? (
              <OrdersTab orders={orders} loading={ordersLoading} />
            ) : tab === "users" ? (
              <UsersTab loading={usersLoading} />
            ) : (
              <AnalyticsTab orders={orders} products={products} users={users} loading={ordersLoading || productsLoading || usersLoading} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ title, detail, amount, icon }: { title: string; detail: string; amount: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-1.5 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <span className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </span>
      </div>
      <span className={`shrink-0 text-sm font-semibold ${amount.startsWith("+") ? "text-primary" : "text-foreground"}`}>{amount}</span>
    </div>
  );
}

function SpendingCard({ title, value, detail, percent, color }: { title: string; value: string; detail: string; percent: number; color: string }) {
  return (
    <div className="flex min-h-24 items-center justify-between gap-3 rounded-[18px] bg-slate-50 p-4">
      <div>
        <p className="text-xs font-bold text-foreground">* {title}</p>
        <p className="mt-3 text-2xl font-bold text-primary">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <div
        className="grid h-14 w-14 place-items-center rounded-full text-xs font-bold text-foreground"
        style={{ background: `conic-gradient(${color} ${percent}%, #e5e7eb 0)` }}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-50">{percent}%</span>
      </div>
    </div>
  );
}

function DashboardMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-[16px] border border-border bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  delta,
  description,
}: {
  title: string;
  value: string | number;
  delta: string;
  description: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border bg-card/80 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold text-white/90">{delta}</div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{description}</p>
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
      className={`flex shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-semibold transition lg:w-full ${
        active ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(249,115,22,0.22)]" : "text-slate-300 hover:bg-slate-800 hover:text-white"
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
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  async function remove(slug: string, inUse: number) {
    if (inUse > 0) {
      alert(
        `This category cannot be deleted because ${inUse} product${inUse === 1 ? "" : "s"} still use it. ` +
        "Remove or reassign those products first."
      );
      return;
    }

    try {
      await fetchDeleteCategory(slug);
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
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
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No categories yet. Add your first one â†’</p>
        ) : (
          <ul className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0 xl:grid-cols-3">
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
                        <IconBtn
                          onClick={() => remove(c.slug, count)}
                          title={count > 0 ? `Cannot delete category while ${count} product${count === 1 ? "" : "s"} belong to it` : "Delete"}
                          danger
                          disabled={count > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
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

function ProductsTab({ products, categories, loading, hasError }: { products: Product[]; categories: Category[]; loading: boolean; hasError: boolean }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  if (loading) {
    return (
      <div className="mt-5">
        <div className="rounded-[18px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="h-3 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-7 w-44 rounded bg-slate-200" />
            </div>
            <div className="h-10 w-32 rounded-full bg-slate-200" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-36 rounded-[18px] bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="mt-5 rounded-[18px] border border-destructive/30 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <h2 className="font-display text-xl font-semibold text-foreground">Products could not load</h2>
        <p className="mt-2 text-sm text-muted-foreground">Check that the API/database is running, then refresh the dashboard.</p>
        <button
          type="button"
          onClick={() => {
            void refreshProductQueries(queryClient);
          }}
          className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-orange-600"
        >
          Retry
        </button>
      </div>
    );
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await fetchDeleteProduct(id);
      await refreshProductQueries(queryClient, undefined, id);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  async function upsert(p: Product) {
    try {
      const exists = products.some((x) => x.id === p.id);
      let saved: Product;
      if (exists) {
        saved = await fetchUpdateProduct(p);
      } else {
        saved = await fetchCreateProduct(p);
      }
      await refreshProductQueries(queryClient, saved);
      setEditing(null);
      setCreating(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  }

  if (creating || editing) {
    return (
      <div className="mt-5">
        <ProductForm
          initial={editing ?? blankProduct(categories[0]?.slug ?? "")}
          categories={categories}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={upsert}
        />
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-col gap-4 rounded-[18px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Catalog</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} product{products.length === 1 ? "" : "s"} across {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={categories.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New product
        </button>
      </div>
      {categories.length === 0 && (
        <p className="rounded-[18px] border border-border bg-white p-4 text-sm text-muted-foreground shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          Add a category first to create products.
        </p>
      )}

      <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        {products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No products yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {products.map((p) => (
              <li key={p.id} className="flex min-w-0 flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                <img src={p.image} alt={p.name} className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="truncate">{categoryName(p.category, categories)} · {formatPrice(p.price)}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.isFeatured && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Featured</span>}
                      {p.isNew && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">New</span>}
                    </div>
                  </div>
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
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(orders[0]?.id ?? null);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (!orders.some((order) => order.id === selectedId)) {
      setSelectedId(orders[0]?.id ?? null);
    }
  }, [orders, selectedId]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setDetails(null);
      return;
    }

    setDetailsLoading(true);
    fetchOrderDetails(selectedId)
      .then((order) => {
        if (!cancelled) setDetails(order);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetails(null);
          alert(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function updateStatus(status: OrderStatus) {
    if (!details) return;
    setSavingStatus(true);
    try {
      const updated = await fetchUpdateOrderStatus(details.id, status);
      setDetails(updated);
      queryClient.setQueryData<AdminDashboardData>(["admin-dashboard"], (old) =>
        old
          ? {
              ...old,
              orders: old.orders.map((order) =>
                order.id === updated.id ? { ...order, status: updated.status } : order,
              ),
            }
          : old,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingStatus(false);
    }
  }

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
    <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
      <div>
        <div className="flex justify-between gap-3">
          <p className="text-sm text-muted-foreground">Showing {orders.length} order{orders.length === 1 ? "" : "s"}</p>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
          {orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No orders have been placed yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`block w-full px-4 py-4 text-left transition hover:bg-muted/50 ${
                    selectedId === order.id ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{order.orderNumber}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{order.name} · {order.email}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{formatPrice(order.total)}</span>
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    <OrderStatusBadge status={order.status ?? "pending"} />
                    <span className="text-xs text-muted-foreground">{order.payment.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        {!selectedId ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Select an order to see details.</p>
        ) : detailsLoading ? (
          <div className="space-y-3">
            <div className="h-6 w-44 rounded bg-muted" />
            <div className="h-20 rounded-2xl bg-muted" />
            <div className="h-40 rounded-2xl bg-muted" />
          </div>
        ) : details ? (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Order details</p>
                <h2 className="mt-1 font-display text-xl font-bold">{details.orderNumber}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(details.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={details.status ?? "pending"} />
                <select
                  value={details.status ?? "pending"}
                  onChange={(event) => void updateStatus(event.target.value as OrderStatus)}
                  disabled={savingStatus}
                  className="h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold outline-none focus:border-primary"
                >
                  {orderStatuses.map((status) => (
                    <option key={status} value={status}>{formatOrderStatus(status)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <OrderInfoBlock title="Customer" lines={[details.name, details.email, details.phone]} />
              <OrderInfoBlock title="Shipping" lines={[details.address]} />
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-border">
              <div className="border-b border-border bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Items
              </div>
              <div className="divide-y divide-border">
                {details.items.map((item) => (
                  <div key={item.productId} className="flex gap-3 p-4">
                    <img src={item.image ?? ""} alt={item.name ?? item.productId} className="h-14 w-14 shrink-0 rounded-xl bg-muted object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name ?? item.productId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Qty {item.qty} · {item.category ?? "Uncategorized"}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{formatPrice(item.lineTotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-muted p-4">
              <OrderTotalRow label="Subtotal" value={formatPrice(details.subtotal)} />
              <OrderTotalRow label="Shipping" value={details.shipping === 0 ? "Free" : formatPrice(details.shipping)} />
              <OrderTotalRow label="Total" value={formatPrice(details.total)} emphasis />
            </div>
          </div>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">Order details could not be loaded.</p>
        )}
      </div>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusClass(status)}`}>
      {formatOrderStatus(status)}
    </span>
  );
}

function formatOrderStatus(status: string) {
  return status.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderStatusClass(status: string) {
  if (status === "cancelled") return "bg-destructive/10 text-destructive";
  if (status === "delivered") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  if (status === "shipped") return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  if (status === "processing") return "bg-primary/10 text-primary";
  if (status === "paid") return "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200";
  return "bg-muted text-muted-foreground";
}

function OrderInfoBlock({ title, lines }: { title: string; lines: Array<string | undefined> }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-1">
        {lines.filter(Boolean).map((line) => (
          <p key={line} className="text-sm text-foreground">{line}</p>
        ))}
      </div>
    </div>
  );
}

function OrderTotalRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={emphasis ? "font-semibold" : "text-sm text-muted-foreground"}>{label}</span>
      <span className={emphasis ? "font-display text-lg font-bold" : "text-sm font-medium"}>{value}</span>
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

type InventoryFilter = "all" | InventoryStatus;

function InventoryTab({ products, loading, hasError }: { products: Product[]; loading: boolean; hasError: boolean }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const inventoryValue = calculateInventoryValue(products);
  const lowStockCount = products.filter((product) => getInventoryStatus(product.stock) === "low-stock").length;
  const outOfStockCount = products.filter((product) => getInventoryStatus(product.stock) === "out-of-stock").length;
  const totalUnits = products.reduce((sum, product) => sum + Math.max(0, product.stock), 0);
  const filteredProducts = products
    .filter((product) => filter === "all" || getInventoryStatus(product.stock) === filter)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

  async function saveStock(product: Product, stock: number) {
    const nextStock = Math.max(0, Math.floor(Number.isFinite(stock) ? stock : product.stock));
    if (nextStock === product.stock) return;
    const updated = { ...product, stock: nextStock };
    setSavingId(product.id);
    queryClient.setQueryData<AdminDashboardData>(["admin-dashboard"], (old) =>
      old ? { ...old, products: old.products.map((item) => (item.id === product.id ? updated : item)) } : old,
    );
    try {
      const saved = await fetchUpdateProduct(updated);
      await refreshProductQueries(queryClient, saved);
    } catch (error) {
      await refreshProductQueries(queryClient);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-5 rounded-[18px] border border-border bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="h-6 w-44 rounded bg-slate-200" />
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, index) => <div key={index} className="h-20 rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="mt-5 rounded-[18px] border border-destructive/30 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <h2 className="font-display text-xl font-semibold">Inventory could not load</h2>
        <p className="mt-2 text-sm text-muted-foreground">Check that the API/database is running, then retry.</p>
        <button onClick={() => void refreshProductQueries(queryClient)} className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-orange-600">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-[18px] border border-border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Inventory</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Stock control</h2>
            <p className="mt-1 text-sm text-muted-foreground">Quickly adjust stock and spot low inventory.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "All"],
              ["in-stock", "In stock"],
              ["low-stock", "Low stock"],
              ["out-of-stock", "Out"],
            ] as Array<[InventoryFilter, string]>).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  filter === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <InventoryMetric label="Total units" value={totalUnits} />
          <InventoryMetric label="Low stock" value={lowStockCount} />
          <InventoryMetric label="Out of stock" value={outOfStockCount} />
          <InventoryMetric label="Inventory value" value={formatPrice(inventoryValue)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-border bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        {filteredProducts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">No products match this inventory filter.</p>
        ) : (
          <div className="divide-y divide-border">
            {filteredProducts.map((product) => (
              <InventoryRow key={product.id} product={product} saving={savingId === product.id} onSaveStock={saveStock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InventoryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary">{value}</p>
    </div>
  );
}

function InventoryRow({ product, saving, onSaveStock }: { product: Product; saving: boolean; onSaveStock: (product: Product, stock: number) => Promise<void> }) {
  const [draftStock, setDraftStock] = useState(String(product.stock));
  const status = getInventoryStatus(product.stock);

  useEffect(() => {
    setDraftStock(String(product.stock));
  }, [product.stock]);

  const parsedStock = Number(draftStock);
  const canSave = Number.isInteger(parsedStock) && parsedStock >= 0 && parsedStock !== product.stock;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(260px,1fr)_140px_220px] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <img src={product.image} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{product.id} · {product.category}</p>
        </div>
      </div>
      <div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getInventoryStatusClass(status)}`}>
          {getInventoryLabel(product.stock, true)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <button
          onClick={() => void onSaveStock(product, product.stock - 1)}
          disabled={saving || product.stock <= 0}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Decrease ${product.name} stock`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          min={0}
          step={1}
          value={draftStock}
          onChange={(event) => setDraftStock(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canSave) void onSaveStock(product, parsedStock);
          }}
          className="h-9 w-20 rounded-lg border border-border bg-white px-2 text-center text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={() => void onSaveStock(product, product.stock + 1)}
          disabled={saving}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-white text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Increase ${product.name} stock`}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={() => void onSaveStock(product, parsedStock)}
          disabled={saving || !canSave}
          className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving" : "Save"}
        </button>
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
                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
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
                <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
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
    stock: 0,
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
  const [uploading, setUploading] = useState(false);

  function update<K extends keyof Product>(k: K, v: Product[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
    setErr(null);
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Choose an image file.");
      return;
    }

    setUploading(true);
    setErr(null);
    try {
      const { url } = await fetchUploadProductImage(file);
      update("image", url);
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) return setErr("Name is required.");
    if (!p.category) return setErr("Category is required.");
    if (p.price < 0) return setErr("Price must be â‰¥ 0.");
    if (p.stock < 0) return setErr("Stock must be â‰¥ 0.");
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
          <FieldRow label="Price (GH₵)">
            <input type="number" min={0} step={1} value={p.price} onChange={(e) => update("price", Number(e.target.value))} className={inputCls} />
          </FieldRow>
        </div>

        <FieldRow label="Stock">
          <input type="number" min={0} step={1} value={p.stock} onChange={(e) => update("stock", Number(e.target.value))} className={inputCls} />
        </FieldRow>

        <FieldRow label="Image">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={p.image} onChange={(e) => update("image", e.target.value)} className={inputCls} placeholder="https://... or /uploads/products/image.jpg" />
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary">
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Uploading" : "Upload"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  void uploadImage(e.target.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
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
          <button type="submit" disabled={uploading} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
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

function IconBtn({ children, onClick, title, danger, disabled }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={
        "grid h-8 w-8 place-items-center rounded-lg border border-border bg-background transition " +
        (disabled
          ? "cursor-not-allowed opacity-50"
          : danger
          ? "hover:border-destructive hover:text-destructive"
          : "hover:border-primary hover:text-primary")
      }
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
