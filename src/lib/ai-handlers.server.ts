import { createClient } from "@supabase/supabase-js";
import { callAI, parseJsonBlock } from "./ai.server";

const BRAND = `Noir & Nectar is a luxury beauty and hair house created for Black women: raw bundles, HD lace systems, botanical scalp and curl care, melanin-focused skincare and mulberry silk goods. Tone: warm, elevated, knowledgeable, never clinical.`;

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { apikey: key } },
  });
}

async function catalogue() {
  const supabase = publicClient();
  const { data } = await supabase.from("products").select("slug, name, category, tagline, description, price_usd, tags");
  return data ?? [];
}

export async function aiSearchHandler(query: string) {
  const products = await catalogue();
  const raw = await callAI([
    {
      role: "system",
      content: `${BRAND}\nYou are the store's search assistant. Given a shopper's request and the catalogue JSON, choose the best matching products (max 4, ordered best first).\nRespond ONLY with JSON: {"answer": "one or two warm sentences explaining the pick", "slugs": ["slug", ...]}`,
    },
    { role: "user", content: `Catalogue:\n${JSON.stringify(products)}\n\nShopper asks: ${query}` },
  ]);

  return parseJsonBlock<{ answer: string; slugs: string[] }>(raw, {
    answer: "Here are a few pieces from the atelier that may suit.",
    slugs: products.slice(0, 3).map((p) => p.slug as string),
  });
}

export async function assistantHandler(messages: { role: "user" | "assistant"; content: string }[]) {
  const products = await catalogue();
  const reply = await callAI([
    {
      role: "system",
      content: `${BRAND}\nYou are "Nectar", the concierge for the store. Help with product advice, hair and skin routines, order tracking guidance, shipping, returns and checkout troubleshooting.\nFacts you may use: orders can be tracked from the Orders page; shoppers can save items for later on the Wishlist; a shopper can share an order as a payment link so a friend can pay; currency can be switched in the header before checkout; standard delivery is 3-7 business days, returns accepted within 30 days on unopened items (hair extensions must be in original bundle ties).\nKeep replies under 120 words. Recommend real catalogue products by name when relevant.\nCatalogue: ${JSON.stringify(products)}`,
    },
    ...messages,
  ]);
  return { reply };
}

export async function orderEmailHandler(input: {
  kind: "confirmation" | "shipped" | "delivered";
  orderNumber: string;
  customerName: string;
  items: { name: string; quantity: number }[];
  total: string;
}) {
  const intent = {
    confirmation: "confirm the order was received and payment succeeded, and set expectations for dispatch",
    shipped: "announce the order has shipped and is on its way, with tracking guidance",
    delivered: "confirm delivery, give a short care tip and invite a review",
  }[input.kind];

  const raw = await callAI([
    {
      role: "system",
      content: `${BRAND}\nYou write transactional emails for the store. Write one email that will ${intent}.\nRespond ONLY with JSON: {"subject": "...", "body": "plain text email body with greeting, short paragraphs and a sign-off from the Noir & Nectar atelier"}`,
    },
    {
      role: "user",
      content: `Order ${input.orderNumber} for ${input.customerName}. Items: ${input.items
        .map((i) => `${i.quantity}x ${i.name}`)
        .join(", ")}. Total: ${input.total}.`,
    },
  ]);

  return parseJsonBlock<{ subject: string; body: string }>(raw, {
    subject: `Your Noir & Nectar order ${input.orderNumber}`,
    body: `Hi ${input.customerName},\n\nThank you for your order ${input.orderNumber}. Total: ${input.total}.\n\nThe Noir & Nectar atelier`,
  });
}
