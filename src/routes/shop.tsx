import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ProductCard } from "@/components/ProductCard";
import { AISearch } from "@/components/AISearch";
import { useProducts, useReviewSummaries } from "@/lib/store";

const searchSchema = z.object({ category: z.string().optional() });

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop All — Noir & Nectar" },
      {
        name: "description",
        content:
          "Browse raw hair bundles, HD lace systems, botanical scalp care, melanin-first skincare and mulberry silk goods.",
      },
      { property: "og:title", content: "Shop All — Noir & Nectar" },
      { property: "og:description", content: "Raw bundles, HD lace, botanical care and melanin-first skincare." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { category } = Route.useSearch();
  const { data: products, isLoading } = useProducts();
  const { data: summaries } = useReviewSummaries();

  const all = products ?? [];
  const categories = Array.from(new Set(all.map((p) => p.category)));
  const shown = category ? all.filter((p) => p.category === category) : all;

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 md:px-10">
      <p className="label-mono text-accent">The collection</p>
      <h1 className="mt-3 font-display text-4xl md:text-6xl">{category ?? "Everything in the atelier"}</h1>

      <div className="mt-10 border-y border-border py-8">
        <AISearch />
      </div>

      <div className="my-10 flex flex-wrap gap-x-6 gap-y-3">
        <Link to="/shop" search={{}} className={`label-mono ${!category ? "text-accent" : "text-muted-foreground"}`}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            to="/shop"
            search={{ category: c }}
            className={`label-mono ${category === c ? "text-accent" : "text-muted-foreground"}`}
          >
            {c}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <p className="label-mono text-muted-foreground">Loading the collection…</p>
      ) : (
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              rating={summaries?.[p.id]?.average}
              reviewCount={summaries?.[p.id]?.count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
