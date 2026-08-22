import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/currency";

export const Route = createFileRoute("/pay/$token")({
  head: () => ({
    meta: [
      { title: "Complete a Shared Bag — Noir & Nectar" },
      {
        name: "description",
        content: "Someone shared their Noir & Nectar bag with you. Review the items and settle the order for them.",
      },
      { property: "og:title", content: "Complete a Shared Bag — Noir & Nectar" },
      { property: "og:description", content: "Review a shared bag and settle the order." },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const { token } = Route.useParams();
  const { format } = useCurrency();
  const qc = useQueryClient();
  const [payer, setPayer] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["shared-order", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total_usd, share_token, order_items(*)")
        .eq("share_token", token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!order) return;
      const { error } = await supabase.rpc("pay_shared_order", {
        _share_token: token,
        _paid_by: payer.trim() || "A friend",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shared-order", token] });
      toast.success("Thank you — the order is paid");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-20 label-mono text-muted-foreground">Loading the shared bag…</p>;
  if (!order)
    return (
      <div className="p-20 text-center">
        <h1 className="font-display text-3xl">This link is no longer active</h1>
        <Link to="/shop" search={{}} className="label-mono mt-4 inline-block text-accent">
          Shop the collection
        </Link>
      </div>
    );

  const paid = order.status !== "awaiting_payment";

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <p className="label-mono text-accent">Shared bag · {order.order_number}</p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">
        {paid ? "This bag is already settled" : "Someone would love you to treat them"}
      </h1>

      <ul className="mt-12 divide-y divide-border border-y border-border">
        {(order.order_items ?? []).map((i) => (
          <li key={i.id} className="flex items-center gap-4 py-5">
            <img src={i.image_url} alt={i.product_name} className="size-16 object-cover" />
            <span className="flex-1 text-sm">{i.product_name}</span>
            <span className="font-mono text-xs">
              {i.quantity} × {format(Number(i.unit_price_usd))}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 flex justify-between text-lg">
        <span>Total</span>
        <span className="font-mono">{format(Number(order.total_usd))}</span>
      </p>

      {!paid && (
        <div className="mt-10">
          <input
            value={payer}
            onChange={(e) => setPayer(e.target.value)}
            placeholder="Your name (shown on the order)"
            className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
          />
          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending}
            className="mt-4 w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
          >
            {pay.isPending ? "Processing…" : `Pay ${format(Number(order.total_usd))}`}
          </button>
        </div>
      )}
    </div>
  );
}
