import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useCartActions, useWishlist, useWishlistActions } from "@/lib/store";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Saved for Later — Noir & Nectar" },
      { name: "description", content: "The pieces you've saved to revisit, ready to move into your bag." },
      { property: "og:title", content: "Saved for Later — Noir & Nectar" },
      { property: "og:description", content: "The pieces you've saved to revisit." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const { data: items } = useWishlist();
  const { add } = useCartActions();
  const { toggle } = useWishlistActions();
  const { format } = useCurrency();

  if (!user)
    return (
      <div className="mx-auto max-w-md px-5 py-32 text-center">
        <h1 className="font-display text-3xl">Sign in to see saved items</h1>
        <Link
          to="/auth"
          className="mt-8 inline-block bg-primary px-8 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground"
        >
          Sign in
        </Link>
      </div>
    );

  const list = items ?? [];

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 md:px-10">
      <h1 className="font-display text-4xl md:text-5xl">Saved for later</h1>
      {list.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nothing saved yet — tap the heart on any product.</p>
      ) : (
        <div className="mt-12 divide-y divide-border border-y border-border">
          {list.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-5 py-6">
              <img src={item.product.image_url} alt={item.product.name} className="size-24 object-cover" />
              <div className="flex-1">
                <Link
                  to="/product/$slug"
                  params={{ slug: item.product.slug }}
                  className="text-sm uppercase tracking-wider"
                >
                  {item.product.name}
                </Link>
                <p className="label-mono mt-1 text-muted-foreground">{format(Number(item.product.price_usd))}</p>
              </div>
              <button
                onClick={() => add.mutate({ productId: item.product.id })}
                className="bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                Move to bag
              </button>
              <button onClick={() => toggle.mutate(item.product.id)} className="label-mono text-muted-foreground">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
