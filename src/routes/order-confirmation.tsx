import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { formatPrice } from "@/lib/cart";

type Search = { order: string; name: string; payment: "cod" | "mobile"; total: number };

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    order: String(s.order ?? ""),
    name: String(s.name ?? ""),
    payment: (s.payment === "mobile" ? "mobile" : "cod"),
    total: Number(s.total ?? 0),
  }),
  head: () => ({ meta: [{ title: "Order confirmed — ShopEase" }] }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { order, name, payment, total } = Route.useSearch();
  const paymentLabel = payment === "mobile" ? "Mobile Money (Manual)" : "Cash on Delivery";

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15">
        <Check className="h-8 w-8 text-success" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight md:text-4xl">
        Thank you{name ? `, ${name.split(" ")[0]}` : ""}!
      </h1>
      <p className="mt-3 text-muted-foreground">
        Your order has been placed. We've sent confirmation details to your email.
      </p>

      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border bg-card p-6 text-left">
        <Row label="Order number" value={order} />
        <div className="my-4 border-t border-border" />
        <Row label="Payment method" value={paymentLabel} />
        <Row label="Order total" value={formatPrice(total)} emphasis />
        {payment === "mobile" && (
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
            Mobile money instructions will be sent to your email within a few minutes. Your order will be confirmed upon receipt of payment.
          </p>
        )}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link to="/" className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Return home
        </Link>
        <Link to="/products" className="rounded-full border border-border bg-card px-8 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={emphasis ? "font-display text-lg font-bold" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}
