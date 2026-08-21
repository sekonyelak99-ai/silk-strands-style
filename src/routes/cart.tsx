import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useCart, useCartActions, useWishlistActions } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Bag — Noir & Nectar" },
      { name: "description", content: "Review the pieces in your bag and continue to a secure checkout." },
      { property: "og:title", content: "Your Bag — Noir & Nectar" },
      { property: "og:description", content: "Review your bag and continue to checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { user } = useAuth();
  const { data: items, isLoading } = useCart();
  const { setQuantity, remove } = useCartActions();
  const { toggle } = useWishlistActions();
  const { format } = useCurrency();

  const lines = items ?? [];
  const subtotal = lines.reduce((s, l) => s + Number(l.product.price_usd) * l.quantity, 0);

  if (!user)
    return (
      <Empty
        title="Sign in to see your bag"
        cta={{ to: "/auth", label: "Sign in" }}
        text="Your bag follows you across devices once you're signed in."
      />
    );

  if (isLoading) return <p className="p-20 label-mono text-muted-foreground">Loading your bag…</p>;

  if (lines.length === 0)
    return <Empty title="Your bag is empty" cta={{ to: "/shop", label: "Shop the collection" }} text="Nothing saved here yet." />;

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 md:px-10">
      <h1 className="font-display text-4xl md:text-5xl">Your bag</h1>

      <div className="mt-12 grid gap-14 lg:grid-cols-[1.5fr_1fr]">
        <div className="divide-y divide-border border-y border-border">
          {lines.map((line) => (
            <div key={line.id} className="flex gap-5 py-6">
              <img src={line.product.image_url} alt={line.product.name} className="size-28 shrink-0 object-cover" />
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link
                      to="/product/$slug"
                      params={{ slug: line.product.slug }}
                      className="text-sm uppercase tracking-wider"
                    >
                      {line.product.name}
                    </Link>
                    <p className="label-mono mt-1 text-muted-foreground">{line.product.category}</p>
                  </div>
                  <span className="font-mono text-sm">
                    {format(Number(line.product.price_usd) * line.quantity)}
                  </span>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex items-center border border-input">
                    <button
                      className="px-3 py-1"
                      onClick={() => setQuantity.mutate({ id: line.id, quantity: line.quantity - 1 })}
                      aria-label="Decrease quantity"
                    >
                      –
                    </button>
                    <span className="w-7 text-center font-mono text-xs">{line.quantity}</span>
                    <button
                      className="px-3 py-1"
                      onClick={() => setQuantity.mutate({ id: line.id, quantity: line.quantity + 1 })}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className="label-mono text-muted-foreground"
                    onClick={() => {
                      toggle.mutate(line.product.id);
                      remove.mutate(line.id);
                    }}
                  >
                    Save for later
                  </button>
                  <button onClick={() => remove.mutate(line.id)} aria-label="Remove" className="text-muted-foreground">
                    <Trash2 width={14} height={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit bg-sand p-8">
          <h2 className="font-display text-2xl">Summary</h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-mono">{format(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-mono">{subtotal >= 150 ? "Complimentary" : format(12)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt>Total</dt>
              <dd className="font-mono">{format(subtotal + (subtotal >= 150 ? 0 : 12))}</dd>
            </div>
          </dl>
          <p className="label-mono mt-4 text-muted-foreground">Prices convert at checkout using the header currency.</p>
          <Link
            to="/checkout"
            className="mt-8 block bg-primary py-4 text-center text-xs uppercase tracking-[0.2em] text-primary-foreground"
          >
            Continue to checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Empty({ title, text, cta }: { title: string; text: string; cta: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-md px-5 py-32 text-center">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      <Link
        to={cta.to as "/shop"}
        search={cta.to === "/shop" ? ({} as never) : undefined}
        className="mt-8 inline-block bg-primary px-8 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground"
      >
        {cta.label}
      </Link>
    </div>
  );
}
