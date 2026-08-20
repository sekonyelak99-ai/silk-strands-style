import { createFileRoute, Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { Section } from "@/components/SiteChrome";
import { AISearch } from "@/components/AISearch";
import { useProducts, useReviewSummaries } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Noir & Nectar — Luxury Hair & Beauty for Black Women" },
      {
        name: "description",
        content:
          "Raw hair bundles, HD lace systems, botanical scalp care and melanin-first skincare, made for Black women and shipped worldwide.",
      },
      { property: "og:title", content: "Noir & Nectar — Luxury Hair & Beauty for Black Women" },
      {
        property: "og:description",
        content: "An atelier of raw hair, botanical care and melanin-first skincare.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: products } = useProducts();
  const { data: summaries } = useReviewSummaries();
  const featured = (products ?? []).filter((p) => p.featured).slice(0, 6);
  const categories = Array.from(new Set((products ?? []).map((p) => p.category)));

  return (
    <>
      <section className="relative flex min-h-[82vh] items-end overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="Editorial portrait of a Black woman with a sculpted silk-press, styled in warm neutral light"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/25 to-transparent" />
        <div className="animate-fade-up relative mx-auto w-full max-w-[90rem] px-5 pb-16 md:px-10 md:pb-24">
          <p className="label-mono mb-5 text-accent">Est. 2026 — Atelier of hair & skin</p>
          <h1 className="max-w-3xl font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] text-primary-foreground">
            Made for us,<span className="block italic text-accent">finished by hand.</span>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-primary-foreground/85">
            Single-donor raw bundles, HD lace tinted for deep complexions, and botanical formulas built around 4A–4C
            texture and melanin-rich skin.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="bg-background px-8 py-4 text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-accent"
            >
              Shop the collection
            </Link>
            <Link
              to="/shop"
              search={{ category: "Raw Bundles" }}
              className="border border-primary-foreground/40 px-8 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground"
            >
              Raw bundles
            </Link>
          </div>
        </div>
      </section>

      <div className="border-b border-border bg-sand">
        <div className="mx-auto max-w-[90rem] px-5 py-10 md:px-10">
          <AISearch />
        </div>
      </div>

      <Section eyebrow="The selection" title="Pieces the atelier is known for">
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              rating={summaries?.[p.id]?.average}
              reviewCount={summaries?.[p.id]?.count}
            />
          ))}
        </div>
      </Section>

      <Section eyebrow="Categories" title="Browse by ritual">
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c}
              to="/shop"
              search={{ category: c }}
              className="group bg-background p-10 transition-colors hover:bg-sand"
            >
              <p className="label-mono mb-3 text-accent">Collection</p>
              <p className="font-display text-2xl">{c}</p>
              <p className="mt-6 label-mono text-muted-foreground group-hover:text-foreground">Explore →</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Why Noir & Nectar">
        <div className="grid gap-12 md:grid-cols-3">
          {[
            {
              t: "Tinted for every undertone",
              d: "Lace pre-tinted across a spectrum of deep complexions, so knots disappear without bleaching.",
            },
            {
              t: "Formulated for 4A–4C",
              d: "Every botanical formula is tested on coily, protective-styled and heat-pressed hair before it ships.",
            },
            {
              t: "Concierge & shared checkout",
              d: "Track orders in real time, ask our concierge anything, or share a bag as a link so someone else can pay.",
            },
          ].map((b) => (
            <div key={b.t}>
              <h3 className="font-display text-2xl">{b.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
