import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2, X, Tag, Package, Save, Lock } from "lucide-react";
import {
  useCategories,
  useProducts,
  saveCategories,
  saveProducts,
  seedCategories,
  seedProducts,
  newId,
  slugify,
  categoryName,
  type Category,
  type Product,
} from "@/lib/products";
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

type Tab = "products" | "categories";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("products");
  const products = useProducts();
  const categories = useCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Admin</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your store. Changes save instantly to this browser.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm("Reset all products and categories to defaults?")) {
                saveCategories(seedCategories);
                saveProducts(seedProducts);
              }
            }}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium hover:border-destructive hover:text-destructive"
          >
            Reset to defaults
          </button>
          <Link to="/" className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium hover:border-primary hover:text-primary">
            View storefront
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Products" value={products.length} />
        <Stat label="Categories" value={categories.length} />
        <Stat label="Featured" value={products.filter((p) => p.isFeatured).length} />
      </div>

      <div className="mt-8 flex gap-2 border-b border-border">
        <TabBtn active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="h-4 w-4" />}>
          Products
        </TabBtn>
        <TabBtn active={tab === "categories"} onClick={() => setTab("categories")} icon={<Tag className="h-4 w-4" />}>
          Categories
        </TabBtn>
      </div>

      <div className="mt-8">
        {tab === "products" ? <ProductsTab products={products} categories={categories} /> : <CategoriesTab categories={categories} products={products} />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
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

function CategoriesTab({ categories, products }: { categories: Category[]; products: Product[] }) {
  const [name, setName] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function add() {
    const n = name.trim();
    if (!n) return;
    const slug = slugify(n);
    if (!slug || categories.some((c) => c.slug === slug)) {
      alert("Category already exists or has invalid name.");
      return;
    }
    saveCategories([...categories, { slug, name: n }]);
    setName("");
  }

  function remove(slug: string) {
    const inUse = products.filter((p) => p.category === slug).length;
    if (inUse > 0 && !confirm(`${inUse} product(s) use this category. Delete anyway?`)) return;
    saveCategories(categories.filter((c) => c.slug !== slug));
  }

  function saveEdit() {
    if (!editingSlug) return;
    const n = editingName.trim();
    if (!n) return;
    saveCategories(categories.map((c) => (c.slug === editingSlug ? { ...c, name: n } : c)));
    setEditingSlug(null);
    setEditingName("");
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

function ProductsTab({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    saveProducts(products.filter((p) => p.id !== id));
  }

  function upsert(p: Product) {
    const exists = products.some((x) => x.id === p.id);
    saveProducts(exists ? products.map((x) => (x.id === p.id ? p : x)) : [...products, p]);
    setEditing(null);
    setCreating(false);
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
