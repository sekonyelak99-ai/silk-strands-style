import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { generateOrderEmail } from "@/lib/ai.functions";

const FLOW = ["confirmed", "processing", "shipped", "out_for_delivery", "delivered"] as const;

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order Tracking — Noir & Nectar" },
      { name: "description", content: "Follow your order in real time from confirmation through to delivery." },
      { property: "og:title", content: "Order Tracking — Noir & Nectar" },
      { property: "og:description", content: "Follow your order from confirmation through to delivery." },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { user } = useAuth();
  const { format } = useCurrency();
  const qc = useQueryClient();
  const writeEmail = useServerFn(generateOrderEmail);
  const [copied, setCopied] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), order_events(*)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: emails } = useQuery({
    queryKey: ["order-emails", orderId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_emails")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () => {
        qc.invalidateQueries({ queryKey: ["order", orderId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, qc]);

  const advance = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const index = FLOW.indexOf(order.status as (typeof FLOW)[number]);
      const next = FLOW[Math.min(index + 1, FLOW.length - 1)]!;
      if (next === order.status) throw new Error("This order is already delivered.");

      const { error } = await supabase
        .from("orders")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;

      await supabase.from("order_events").insert({
        order_id: orderId,
        status: next,
        message: `Order status updated to ${next.replace(/_/g, " ")}.`,
      });

      if (next === "shipped" || next === "delivered") {
        try {
          const email = await writeEmail({
            data: {
              kind: next === "shipped" ? "shipped" : "delivered",
              orderNumber: order.order_number,
              customerName: order.email.split("@")[0] ?? "there",
              items: (order.order_items ?? []).map((i) => ({ name: i.product_name, quantity: i.quantity })),
              total: format(Number(order.total_usd)),
            },
          });
          await supabase.from("order_emails").insert({
            order_id: orderId,
            user_id: user!.id,
            kind: next,
            subject: email.subject,
            body: email.body,
          });
        } catch {
          /* non-blocking */
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", orderId] });
      qc.invalidateQueries({ queryKey: ["order-emails", orderId] });
      qc.invalidateQueries({ queryKey: ["orders", user?.id] });
      toast.success("Tracking updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-20 label-mono text-muted-foreground">Loading order…</p>;
  if (!order)
    return (
      <div className="p-20 text-center">
        <h1 className="font-display text-3xl">Order not found</h1>
        <Link to="/orders" className="label-mono mt-4 inline-block text-accent">
          Back to orders
        </Link>
      </div>
    );

  const events = [...(order.order_events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const stageIndex = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const shareUrl = order.share_token ? `${typeof window === "undefined" ? "" : window.location.origin}/pay/${order.share_token}` : null;

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 md:px-10">
      <p className="label-mono text-accent">Order {order.order_number}</p>
      <h1 className="mt-3 font-display text-4xl capitalize md:text-5xl">{order.status.replace(/_/g, " ")}</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="flex gap-1">
            {FLOW.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 ${i <= stageIndex ? "bg-accent" : "bg-border"}`} />
                <p className="label-mono mt-2 text-muted-foreground">{s.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-14 font-display text-2xl">Timeline</h2>
          <ol className="mt-6 space-y-5 border-l border-border pl-6">
            {events.map((e) => (
              <li key={e.id}>
                <p className="label-mono text-accent">{new Date(e.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm">{e.message}</p>
              </li>
            ))}
          </ol>

          {order.status !== "delivered" && order.status !== "awaiting_payment" && (
            <button
              onClick={() => advance.mutate()}
              disabled={advance.isPending}
              className="mt-10 border border-input px-6 py-3 text-xs uppercase tracking-[0.2em] disabled:opacity-60"
            >
              {advance.isPending ? "Updating…" : "Advance tracking (demo fulfilment)"}
            </button>
          )}

          {(emails ?? []).length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-2xl">Notifications sent</h2>
              <div className="mt-6 space-y-5">
                {(emails ?? []).map((e) => (
                  <article key={e.id} className="bg-sand p-6">
                    <p className="label-mono text-accent">{e.kind}</p>
                    <p className="mt-2 text-sm font-medium">{e.subject}</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{e.body}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-8">
          <div className="bg-sand p-8">
            <h2 className="font-display text-2xl">Items</h2>
            <ul className="mt-6 space-y-4">
              {(order.order_items ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-4">
                  <img src={i.image_url} alt={i.product_name} className="size-16 object-cover" />
                  <span className="flex-1 text-sm">{i.product_name}</span>
                  <span className="font-mono text-xs">
                    {i.quantity} × {format(Number(i.unit_price_usd))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex justify-between border-t border-border pt-4 text-base">
              <span>Total</span>
              <span className="font-mono">{format(Number(order.total_usd))}</span>
            </p>
          </div>

          {shareUrl && (
            <div className="border border-accent p-8">
              <h2 className="font-display text-2xl">Pay-for-me link</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Send this to someone who offered to treat you — they can check out on your behalf.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  toast.success("Link copied");
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-5 flex w-full items-center justify-center gap-2 bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
