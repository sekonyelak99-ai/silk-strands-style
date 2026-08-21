import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useOrders } from "@/lib/store";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Your Orders — Noir & Nectar" },
      { name: "description", content: "Track every Noir & Nectar order in real time, from confirmation to delivery." },
      { property: "og:title", content: "Your Orders — Noir & Nectar" },
      { property: "og:description", content: "Track every order in real time, from confirmation to delivery." },
    ],
  }),
  component: OrdersPage,
});

export const STATUS_FLOW = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"] as const;

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const { format } = useCurrency();

  if (!user)
    return (
      <div className="mx-auto max-w-md px-5 py-32 text-center">
        <h1 className="font-display text-3xl">Sign in to track your orders</h1>
        <Link
          to="/auth"
          className="mt-8 inline-block bg-primary px-8 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 md:px-10">
      <p className="label-mono text-accent">Order management</p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">Your orders</h1>

      {isLoading ? (
        <p className="mt-10 label-mono text-muted-foreground">Loading…</p>
      ) : (orders ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="mt-12 divide-y divide-border border-y border-border">
          {(orders ?? []).map((o) => (
            <Link
              key={o.id}
              to="/orders/$orderId"
              params={{ orderId: o.id }}
              className="flex flex-wrap items-center justify-between gap-4 py-6"
            >
              <div>
                <p className="font-mono text-sm">{o.order_number}</p>
                <p className="label-mono mt-1 text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()} · {o.status.replace(/_/g, " ")}
                </p>
              </div>
              <p className="font-mono text-sm">{format(Number(o.total_usd))}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
