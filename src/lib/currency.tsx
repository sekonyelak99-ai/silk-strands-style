import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "ZAR" | "NGN" | "KES" | "GHS" | "CAD";

export const CURRENCIES: Record<CurrencyCode, { label: string; rate: number; symbol: string }> = {
  USD: { label: "US Dollar", rate: 1, symbol: "$" },
  EUR: { label: "Euro", rate: 0.92, symbol: "€" },
  GBP: { label: "British Pound", rate: 0.79, symbol: "£" },
  ZAR: { label: "South African Rand", rate: 18.2, symbol: "R" },
  NGN: { label: "Nigerian Naira", rate: 1580, symbol: "₦" },
  KES: { label: "Kenyan Shilling", rate: 129, symbol: "KSh" },
  GHS: { label: "Ghanaian Cedi", rate: 15.2, symbol: "₵" },
  CAD: { label: "Canadian Dollar", rate: 1.37, symbol: "CA$" },
};

type CurrencyContextValue = {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  convert: (usd: number) => number;
  format: (usd: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    const stored = window.localStorage.getItem("nn-currency");
    if (stored && stored in CURRENCIES) setCurrencyState(stored as CurrencyCode);
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    window.localStorage.setItem("nn-currency", code);
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const convert = (usd: number) => usd * CURRENCIES[currency].rate;
    return {
      currency,
      setCurrency,
      convert,
      format: (usd: number) =>
        new Intl.NumberFormat("en", {
          style: "currency",
          currency,
          maximumFractionDigits: CURRENCIES[currency].rate > 100 ? 0 : 2,
        }).format(convert(usd)),
    };
  }, [currency, setCurrency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
