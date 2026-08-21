import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Noir & Nectar" },
      { name: "description", content: "Sign in to track orders, save items and check out faster at Noir & Nectar." },
      { property: "og:title", content: "Sign In — Noir & Nectar" },
      { property: "og:description", content: "Sign in to track orders and save your favourites." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/account" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/account`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to the atelier");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[90rem] gap-0 md:grid-cols-2">
      <div className="relative hidden min-h-[70vh] md:block">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-primary/40" />
      </div>

      <div className="flex items-center justify-center px-5 py-20 md:px-16">
        <div className="w-full max-w-sm">
          <p className="label-mono text-accent">{mode === "signin" ? "Welcome back" : "Join the atelier"}</p>
          <h1 className="mt-3 font-display text-4xl">{mode === "signin" ? "Sign in" : "Create an account"}</h1>

          <form onSubmit={submit} className="mt-10 space-y-4">
            {mode === "signup" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-primary py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
            >
              {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="label-mono mt-6 text-muted-foreground"
          >
            {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
