import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { StarRating } from "@/components/StarRating";
import { useCartActions, useProduct, useProducts, useReviews, useWishlistActions } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => {
    const title = `${params.slug.replace(/-/g, " ")} — Noir & Nectar`;
    return {
      meta: [
        { title },
        { name: "description", content: "Luxury hair and beauty crafted for Black women by Noir & Nectar." },
        { property: "og:title", content: title },
        { property: "og:description", content: "Luxury hair and beauty crafted for Black women." },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading } = useProduct(slug);
  const { data: products } = useProducts();
  const { data: reviews } = useReviews(product?.id);
  const { format } = useCurrency();
  const { add } = useCartActions();
  const { toggle } = useWishlistActions();
  const [qty, setQty] = useState(1);

  if (isLoading) return <p className="p-20 label-mono text-muted-foreground">Loading…</p>;
  if (!product)
    return (
      <div className="p-20 text-center">
        <h1 className="font-display text-3xl">Product not found</h1>
        <Link to="/shop" search={{}} className="label-mono mt-4 inline-block text-accent">
          Back to the shop
        </Link>
      </div>
    );

  const list = reviews ?? [];
  const average = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 5;
  const related = (products ?? []).filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-12 md:px-10">
      <div className="grid gap-12 lg:grid-cols-2">
        <img
          src={product.image_url}
          alt={product.name}
          width={1000}
          height={1333}
          className="w-full bg-sand object-cover"
        />

        <div className="lg:py-6">
          <p className="label-mono text-accent">{product.category}</p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">{product.name}</h1>
          {product.tagline && <p className="mt-3 text-sm italic text-muted-foreground">{product.tagline}</p>}

          <div className="mt-5 flex items-center gap-3">
            <StarRating value={average} size={14} />
            <span className="label-mono text-muted-foreground">
              {list.length} review{list.length === 1 ? "" : "s"}
            </span>
          </div>

          <p className="mt-8 font-mono text-2xl">{format(Number(product.price_usd))}</p>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          <div className="mt-10 flex flex-wrap items-stretch gap-3">
            <div className="flex items-center border border-input">
              <button className="px-4 py-4" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                –
              </button>
              <span className="w-8 text-center font-mono text-sm">{qty}</span>
              <button className="px-4 py-4" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                +
              </button>
            </div>
            <button
              onClick={() => add.mutate({ productId: product.id, quantity: qty })}
              className="flex-1 bg-primary px-10 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground"
            >
              Add to bag
            </button>
            <button
              onClick={() => toggle.mutate(product.id)}
              aria-label="Save for later"
              className="grid w-14 place-items-center border border-input text-accent"
            >
              <Heart width={16} height={16} />
            </button>
          </div>

          <ul className="mt-10 space-y-2 border-t border-border pt-6 label-mono text-muted-foreground">
            <li>Worldwide delivery 3–7 business days</li>
            <li>30-day returns on unopened items</li>
            <li>{product.stock} in stock</li>
          </ul>
        </div>
      </div>

      <ReviewsSection productId={product.id} reviews={list} />

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-10 border-b border-border pb-5 font-display text-3xl">You may also like</h2>
          <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewsSection({
  productId,
  reviews,
}: {
  productId: string;
  reviews: { id: string; author_name: string; rating: number; title: string | null; body: string; created_at: string }[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to leave a review.");
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: user.id,
        author_name: (user.user_metadata?.["full_name"] as string) || user.email?.split("@")[0] || "Verified buyer",
        rating,
        title: title || null,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["review-summaries"] });
      toast.success("Thank you — your review is live");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-24 grid gap-14 border-t border-border pt-14 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <h2 className="mb-8 font-display text-3xl">Community reviews</h2>
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>}
        <div className="space-y-8">
          {reviews.map((r) => (
            <article key={r.id} className="border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <StarRating value={r.rating} />
                <span className="label-mono">{r.author_name}</span>
                <span className="label-mono text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.title && <h3 className="mt-3 font-display text-xl">{r.title}</h3>}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="bg-sand p-8">
        <h3 className="font-display text-2xl">Write a review</h3>
        {!user ? (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to="/auth" className="text-accent underline">
              Sign in
            </Link>{" "}
            to share your experience.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (body.trim()) submit.mutate();
            }}
          >
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`size-9 border text-sm ${n <= rating ? "border-accent text-accent" : "border-input text-muted-foreground"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Headline (optional)"
              className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={5}
              placeholder="How did it wear, wash and last?"
              className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={submit.isPending}
              className="w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
            >
              {submit.isPending ? "Posting…" : "Post review"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
