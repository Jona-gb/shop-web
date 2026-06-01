import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { formatPrice, useCart } from "@/lib/cart";
import {
  checkoutSchema,
  createOrderNumber,
  getOrderTotal,
  getShippingCost,
  parseCheckoutErrors,
} from "@/lib/controllers/checkoutController";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — ShopEase" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { detailed, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const shipping = getShippingCost(subtotal);
  const total = getOrderTotal(subtotal);
  const hasUnavailableItems = detailed.some(({ product, qty }) => product.stock <= 0 || qty > product.stock);

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", payment: "cod" as "cod" | "mobile" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (detailed.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Your cart is empty.</h1>
      </div>
    );
  }

  function onChange<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasUnavailableItems) {
      setErrors({ form: "One or more cart items are out of stock. Update your cart before placing the order." });
      return;
    }
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parseCheckoutErrors(parsed));
      return;
    }
    setErrors({});
    setSubmitting(true);

    const payload = {
      ...form,
      items: detailed.map(({ product, qty }) => ({ productId: product.id, qty })),
    };

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    setSubmitting(false);

    if (!response.ok) {
      if (data?.errors) {
        setErrors(data.errors);
        return;
      }
      setErrors({ form: data?.error ?? "Could not complete order. Try again." });
      return;
    }

    clear();
    navigate({
      to: "/order-confirmation",
      search: { order: data.orderNumber, name: form.name, payment: form.payment, total: data.total },
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Checkout</h1>

      <form onSubmit={onSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Section title="Contact information">
            <Field label="Full name" error={errors.name}>
              <input type="text" value={form.name} onChange={(e) => onChange("name", e.target.value)} className={input} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} className={input} />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <input type="tel" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} className={input} />
              </Field>
            </div>
          </Section>

          <Section title="Shipping address">
            <Field label="Delivery address" error={errors.address}>
              <textarea rows={3} value={form.address} onChange={(e) => onChange("address", e.target.value)} className={input + " resize-none"} />
            </Field>
          </Section>

          <Section title="Payment method">
            <div className="space-y-3">
              <PaymentOption
                id="cod"
                title="Cash on Delivery"
                desc="Pay in cash when your order arrives."
                checked={form.payment === "cod"}
                onChange={() => onChange("payment", "cod")}
              />
              <PaymentOption
                id="mobile"
                title="Mobile Money (Manual)"
                desc="Pay via mobile money; instructions sent after order."
                checked={form.payment === "mobile"}
                onChange={() => onChange("payment", "mobile")}
              />
            </div>
          </Section>
        </div>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Your order</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {detailed.map(({ product, qty, lineTotal }) => (
              <li key={product.id} className="flex justify-between gap-4">
                <span className={product.stock <= 0 || qty > product.stock ? "text-destructive" : "text-muted-foreground"}>
                  {product.name} <span className="text-foreground/80">× {qty}</span>
                  {(product.stock <= 0 || qty > product.stock) && (
                    <span className="mt-1 block text-xs text-destructive">
                      {product.stock <= 0 ? "Out of stock" : `Only ${product.stock} available`}
                    </span>
                  )}
                </span>
                <span className="font-medium">{formatPrice(lineTotal)}</span>
              </li>
            ))}
          </ul>
          {errors.form && <p className="mt-4 text-sm text-destructive">{errors.form}</p>}
          <div className="my-4 border-t border-border" />
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
          </div>
          <div className="my-4 border-t border-border" />
          <div className="flex justify-between font-display text-lg font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>

          <button
            type="submit"
            disabled={submitting || hasUnavailableItems}
            className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Placing order..." : hasUnavailableItems ? "Update cart to place order" : "Place order"}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure manual payment · No card required
          </p>
        </aside>
      </form>
    </div>
  );
}

const input =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function PaymentOption({ id, title, desc, checked, onChange }: { id: string; title: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <label
      htmlFor={id}
      className={
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition " +
        (checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")
      }
    >
      <input type="radio" name="payment" id={id} checked={checked} onChange={onChange} className="mt-1 accent-[color:var(--primary)]" />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </label>
  );
}
