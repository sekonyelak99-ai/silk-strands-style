import { CURRENCIES, useCurrency, type CurrencyCode } from "@/lib/currency";

export function CurrencySelect({ className = "" }: { className?: string }) {
  const { currency, setCurrency } = useCurrency();
  return (
    <label className={`label-mono flex items-center gap-1 text-muted-foreground ${className}`}>
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className="label-mono cursor-pointer bg-transparent text-foreground outline-none"
      >
        {Object.entries(CURRENCIES).map(([code, meta]) => (
          <option key={code} value={code}>
            {code} {meta.symbol}
          </option>
        ))}
      </select>
    </label>
  );
}
