import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { CurrencySelect } from "./CurrencySelect";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/store";

function NavLinks({ onNavigate, className }: { onNavigate?: () => void; className: string }) {
  return (
    <>
      <Link to="/shop" search={{}} onClick={onNavigate} className={className}>
        Shop
      </Link>
      <Link to="/shop" search={{ category: "Raw Bundles" }} onClick={onNavigate} className={className}>
        Hair
      </Link>
      <Link to="/shop" search={{ category: "Melanin Care" }} onClick={onNavigate} className={className}>
        Skin
      </Link>
      <Link to="/orders" onClick={onNavigate} className={className}>
        Orders
      </Link>
    </>
  );
}

export function Header() {
  const { user } = useAuth();
  const { data: cart } = useCart();
  const [open, setOpen] = useState(false);
  const count = (cart ?? []).reduce((n, i) => n + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-6 px-5 py-4 md:px-10">
        <button className="md:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <Menu width={18} height={18} /> : <Menu width={18} height={18} />}
        </button>

        <nav className="hidden flex-1 items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              search={"search" in l ? (l.search as never) : undefined}
              className="label-mono rule-underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link to="/" className="font-display text-xl tracking-[0.18em] uppercase md:text-2xl">
          Noir <span className="text-accent">&</span> Nectar
        </Link>

        <div className="flex flex-1 items-center justify-end gap-5">
          <CurrencySelect className="hidden sm:flex" />
          <Link to="/wishlist" aria-label="Saved items">
            <Heart width={17} height={17} />
          </Link>
          <Link to={user ? "/account" : "/auth"} aria-label="Account">
            <User width={17} height={17} />
          </Link>
          <Link to="/cart" aria-label="Bag" className="relative">
            <ShoppingBag width={17} height={17} />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-accent font-mono text-[9px] text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-5 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                search={"search" in l ? (l.search as never) : undefined}
                onClick={() => setOpen(false)}
                className="label-mono"
              >
                {l.label}
              </Link>
            ))}
            <CurrencySelect />
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-28 border-t border-border bg-sand">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-16 md:grid-cols-4 md:px-10">
        <div className="md:col-span-2">
          <p className="font-display text-2xl uppercase tracking-[0.18em]">
            Noir <span className="text-accent">&</span> Nectar
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            An atelier of raw hair, botanical care and melanin-first skincare — made for Black women, finished by hand,
            shipped worldwide.
          </p>
        </div>
        <div>
          <p className="label-mono mb-4 text-accent">Shop</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop">All products</Link>
            </li>
            <li>
              <Link to="/wishlist">Saved for later</Link>
            </li>
            <li>
              <Link to="/orders">Track an order</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="label-mono mb-4 text-accent">Care</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Delivery 3–7 business days</li>
            <li>30-day returns</li>
            <li>Concierge available 24/7</li>
          </ul>
        </div>
      </div>
      <p className="label-mono border-t border-border px-5 py-6 text-center text-muted-foreground md:px-10">
        © {new Date().getFullYear()} Noir & Nectar
      </p>
    </footer>
  );
}

export function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[90rem] px-5 py-16 md:px-10 md:py-24">
      {(eyebrow || title) && (
        <div className="mb-12 flex flex-col gap-3 border-b border-border pb-6">
          {eyebrow && <p className="label-mono text-accent">{eyebrow}</p>}
          {title && <h2 className="font-display text-3xl md:text-5xl">{title}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}
