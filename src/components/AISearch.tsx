import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { aiSearch } from "@/lib/ai.functions";
import { useProducts } from "@/lib/store";
import { useCurrency } from "@/lib/currency";

export function AISearch() {
  const run = useServerFn(aiSearch);
  const { data: products } = useProducts();
  const { format } = useCurrency();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ answer: string; slugs: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await run({ data: { query: query.trim() } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  const matches = (result?.slugs ?? [])
    .map((s) => (products ?? []).find((p) => p.slug === s))
    .filter(Boolean)
    .slice(0, 4);

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-3 border-b border-foreground/30 pb-3">
        <Sparkles width={16} height={16} className="text-accent" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what you need — “something for edges after braids”"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" disabled={busy} className="label-mono text-accent disabled:opacity-50">
          {busy ? "Searching…" : "Ask"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-6">
          <p className="mb-5 max-w-2xl text-sm leading-relaxed">{result.answer}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {matches.map((p) => (
              <Link
                key={p!.id}
                to="/product/$slug"
                params={{ slug: p!.slug }}
                className="group flex gap-4 bg-background p-3"
              >
                <img src={p!.image_url} alt={p!.name} className="size-20 shrink-0 object-cover" loading="lazy" />
                <span>
                  <span className="block text-xs uppercase tracking-wider">{p!.name}</span>
                  <span className="label-mono mt-2 block text-muted-foreground">
                    {format(Number(p!.price_usd))}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
