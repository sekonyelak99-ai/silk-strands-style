import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  description: string;
  price_usd: number;
  image_url: string;
  tags: string[];
  stock: number;
  featured: boolean;
};

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from("products").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return (data as unknown as Product) ?? null;
    },
  });
}

export function useReviews(productId?: string) {
  return useQuery({
    queryKey: ["reviews", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReviewSummaries() {
  return useQuery({
    queryKey: ["review-summaries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("product_id, rating");
      if (error) throw error;
      const map: Record<string, { count: number; average: number }> = {};
      for (const row of data ?? []) {
        const entry = (map[row.product_id] ??= { count: 0, average: 0 });
        entry.average = (entry.average * entry.count + row.rating) / (entry.count + 1);
        entry.count += 1;
      }
      return map;
    },
  });
}

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, product:products(*)")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; quantity: number; product: Product }[];
    },
  });
}

export function useWishlist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product:products(*)")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; product: Product }[];
    },
  });
}

export function useCartActions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["cart", user?.id] });

  const add = useMutation({
    mutationFn: async ({ productId, quantity = 1 }: { productId: string; quantity?: number }) => {
      if (!user) throw new Error("Please sign in to start a bag.");
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("product_id", productId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: productId, quantity });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Added to your bag");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity < 1) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast("Removed from bag");
    },
  });

  return { add, setQuantity, remove };
}

export function useWishlistActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Please sign in to save items for later.");
      const { data: existing } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("product_id", productId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("wishlist_items").delete().eq("id", existing.id);
        if (error) throw error;
        return "removed" as const;
      }
      const { error } = await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      return "added" as const;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["wishlist", user?.id] });
      toast(result === "added" ? "Saved for later" : "Removed from saved items");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { toggle };
}

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
