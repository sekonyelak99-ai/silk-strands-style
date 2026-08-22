import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useCart } from "@/lib/store";
import { generateOrderEmail } from "@/lib/ai.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Noir & Nectar" },
      {
        name: "description",
        content: "Confirm your delivery details, choose a currency and complete your Noir & Nectar order.",
      },
      { property: "og:title", content: "Checkout — Noir & Nectar" },
      { property: "og:description", content: "Confirm delivery details and complete your order." },
    ],
  }),
  component: Checkout,
});

type Mode = "pay" | "share";

function Checkout() {
  const { user } = useAuth();
  const { data: cart } = useCart();
  const { format, currency, convert } = useCurrency();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const writeEmail = useServerFn(generateOrderEmail);

  const [address, setAddress] = useState({ line1: "", city: "", country: "", postcode: "" });
  const lines = cart ?? [];
  const subtotal = lines.reduce((s, l) => s + Number(l.product.price_usd) * l.quantity, 0);
  const shipping = subtotal >= 150 ? 0 : 12;
  const total = subtotal + shipping;

  const place = useMutation({
    mutationFn: async (mode: Mode) => {
      if (!user) throw new Error("Please sign in to check out.");
      if (lines.length === 0) throw new Error("Your bag is empty.");

      const orderNumber = `NN-${Date.now().toString(36).toUpperCase()}`;
      const shareToken =
        mode === "share" ? crypto.randomUUID().replace(/-/g, "").slice(0, 24) : null;
      const status = mode === "share" ? "awaiting_payment" : "confirmed";

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status,
          total_usd: total,
          currency,
          display_total: Number(convert(total).toFixed(2)),
          email: user.email!,
          shipping_address: address,
          share_token: shareToken,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: order.id,
          product_id: l.product.id,
          product_name: l.product.name,
          image_url: l.product.image_url,
          unit_price_usd: Number(l.product.price_usd),
          quantity: l.quantity,
        })),
      );
      if (itemsError) throw itemsError;

      await supabase.from("order_events").insert({
        order_id: order.id,
        status,
        message:
          mode === "share"
            ? "Order created and waiting for a friend to complete payment."
            : "Payment received. Your order is confirmed.",
      });

      if (mode === "pay") {
        try {
          const email = await writeEmail({
            data: {
              kind: "confirmation",
              orderNumber,
              customerName: user.email?.split("@")[0] ?? "there",
              items: lines.map((l) => ({ name: l.product.name, quantity: l.quantity })),
              total: format(total),
            },
          });
          await supabase.from("order_emails").insert({
            order_id: order.id,
            user_id: user.id,
            kind: "confirmation",
            subject: email.subject,
            body: email.body,
          });
        } catch {
          /* email generation is non-blocking */
        }
      }

      for (const l of lines) await supabase.from("cart_items").delete().eq("id", l.id);
      return order;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["cart", user?.id] });
      qc.invalidateQueries({ queryKey: ["orders", user?.id] });
      toast.success("Order placed");
      navigate({ to: "/orders/$orderId", params: { orderId: order.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user)
    return (
      <div className="mx-auto max-w-md px-5 py-32 text-center">
        <h1 className="font-display text-3xl">Sign in to check out</h1>
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
      <h1 className="font-display text-4xl md:text-5xl">Checkout</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <h2 className="font-display text-2xl">Delivery</h2>
          {(
            [
              ["line1", "Street address"],
              ["city", "City"],
              ["postcode", "Postal code"],
              ["country", "Country"],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              value={address[key]}
              onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
              placeholder={label}
              className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
            />
          ))}
        </form>

        <aside className="h-fit bg-sand p-8">
          <h2 className="font-display text-2xl">Order summary</h2>
          <ul className="mt-6 space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.id} className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {l.quantity} × {l.product.name}
                </span>
                <span className="font-mono">{format(Number(l.product.price_usd) * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-mono">{shipping === 0 ? "Complimentary" : format(shipping)}</dd>
            </div>
            <div className="flex justify-between text-base">
              <dt>Total ({currency})</dt>
              <dd className="font-mono">{format(total)}</dd>
            </div>
          </dl>

          <button
            onClick={() => place.mutate("pay")}
            disabled={place.isPending || lines.length === 0}
            className="mt-8 w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
          >
            {place.isPending ? "Processing…" : `Pay ${format(total)}`}
          </button>
          <button
            onClick={() => place.mutate("share")}
            disabled={place.isPending || lines.length === 0}
            className="mt-3 w-full border border-input py-4 text-xs uppercase tracking-[0.2em] disabled:opacity-60"
          >
            Create a “pay for me” link
          </button>
          <p className="label-mono mt-4 leading-relaxed text-muted-foreground">
            Share the link with a partner, friend or family member and they can settle the bag for you.
          </p>
        </aside>
      </div>
    </div>
  );
}
