import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { aiSearchHandler, assistantHandler, orderEmailHandler } from "./ai-handlers.server";

export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ query: z.string().min(1).max(300) }).parse(data))
  .handler(async ({ data }) => aiSearchHandler(data.query));

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
          .max(20),
      })
      .parse(data),
  )
  .handler(async ({ data }) => assistantHandler(data.messages));

export const generateOrderEmail = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        kind: z.enum(["confirmation", "shipped", "delivered"]),
        orderNumber: z.string().max(40),
        customerName: z.string().max(120),
        items: z.array(z.object({ name: z.string().max(160), quantity: z.number().int().min(1) })).max(50),
        total: z.string().max(40),
      })
      .parse(data),
  )
  .handler(async ({ data }) => orderEmailHandler(data));
