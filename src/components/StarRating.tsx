import { Star } from "lucide-react";

export function StarRating({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(value) ? "fill-accent text-accent" : "text-muted-foreground/30"}
        />
      ))}
    </span>
  );
}
