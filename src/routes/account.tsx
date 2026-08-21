import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/currency";
import { useOrders } from "@/lib/store";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your Account — Noir & Nectar" },
      { name: "description", content: "Manage your profile, hair and skin preferences, and review recent orders." },
      { property: "og:title", content: "Your Account — Noir & Nectar" },
      { property: "og:description", content: "Manage your profile and review recent orders." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { format } = useCurrency();
  const { data: orders } = useOrders();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", phone: "", hair_type: "", skin_tone: "" });

  useEffect(() => {
    if (profile)
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        hair_type: profile.hair_type ?? "",
        skin_tone: profile.skin_tone ?? "",
      });
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return <p className="p-20 label-mono text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-[90rem] px-5 py-14 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="label-mono text-accent">Your account</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">{profile?.full_name || user.email}</h1>
        </div>
        <button onClick={() => signOut()} className="label-mono text-muted-foreground">
          Sign out
        </button>
      </div>

      <div className="mt-14 grid gap-14 lg:grid-cols-[1fr_1.2fr]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <h2 className="font-display text-2xl">Profile</h2>
          {(
            [
              ["full_name", "Full name"],
              ["phone", "Phone"],
              ["hair_type", "Hair type (e.g. 4C, locs, silk press)"],
              ["skin_tone", "Skin tone / concerns"],
            ] as const
          ).map(([key, label]) => (
            <input
              key={key}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={label}
              className="w-full border border-input bg-background px-4 py-3 text-sm outline-none"
            />
          ))}
          <button
            type="submit"
            disabled={save.isPending}
            className="bg-primary px-8 py-4 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </form>

        <div>
          <h2 className="font-display text-2xl">Recent orders</h2>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {(orders ?? []).slice(0, 5).map((o) => (
              <Link
                key={o.id}
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="flex items-center justify-between gap-4 py-5"
              >
                <span>
                  <span className="block font-mono text-xs">{o.order_number}</span>
                  <span className="label-mono text-muted-foreground">{o.status.replace(/_/g, " ")}</span>
                </span>
                <span className="font-mono text-sm">{format(Number(o.total_usd))}</span>
              </Link>
            ))}
            {(orders ?? []).length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No orders yet.</p>
            )}
          </div>
          <Link to="/orders" className="label-mono mt-6 inline-block text-accent">
            View all orders →
          </Link>
        </div>
      </div>
    </div>
  );
}
