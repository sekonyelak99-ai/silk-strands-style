import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { useCartActions, useWishlistActions, type Product } from "@/lib/store";
import { StarRating } from "./StarRating";

export function ProductCard({
  product,
  rating,
  reviewCount,
}: {
  product: Product;
  rating?: number;
  reviewCount?: number;
}) {
  const { format } = useCurrency();
  const { add } = useCartActions();
  const { toggle } = useWishlistActions();

  return (
    <article className="group">
      <div className="relative mb-6 aspect-[3/4] overflow-hidden bg-sand">
        <Link to="/product/$slug" params={{ slug: product.slug }} aria-label={product.name}>
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            width={800}
            height={1066}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-105"
          />
        </Link>
        <button
          onClick={() => toggle.mutate(product.id)}
          aria-label="Save for later"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-background/80 text-accent backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Heart width={15} height={15} />
        </button>
        <button
          onClick={() => add.mutate({ productId: product.id })}
          className="absolute bottom-0 left-0 w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus:opacity-100"
        >
          Quick add — {format(Number(product.price_usd))}
        </button>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="mb-1 font-body text-sm font-medium uppercase tracking-wider">
            <Link to="/product/$slug" params={{ slug: product.slug }} className="rule-underline">
              {product.name}
            </Link>
          </h3>
          <div className="flex items-center gap-2">
            <StarRating value={rating ?? 5} />
            <span className="label-mono text-muted-foreground">({reviewCount ?? 0})</span>
          </div>
        </div>
        <span className="font-mono text-xs">{format(Number(product.price_usd))}</span>
      </div>
    </article>
  );
}
