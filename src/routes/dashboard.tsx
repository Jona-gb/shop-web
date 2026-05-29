import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AdminPage } from "./admin";
import { fetchAdminDashboard } from "@/lib/products";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard â€” ShopEase" }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["admin-dashboard"],
      queryFn: fetchAdminDashboard,
    }),
  component: DashboardGate,
});

function DashboardGate() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please sign in with an admin account to access the dashboard.</p>
        <Link to="/login" search={{ redirect: "/dashboard" }} className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
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
