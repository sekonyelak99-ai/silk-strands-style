import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send } from "lucide-react";
import { askAssistant } from "@/lib/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Welcome to the atelier — I'm Nectar. Ask me about textures, routines, delivery or an order and I'll help.",
    },
  ]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next.slice(-10) } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed bottom-24 right-5 z-50 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6"
      >
        {open ? <X width={18} height={18} /> : <MessageCircle width={18} height={18} />}
      </button>

      {open && (
        <div className="fixed bottom-40 right-5 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col border border-border bg-background shadow-xl md:bottom-22">
          <header className="border-b border-border px-4 py-3">
            <p className="label-mono text-accent">Concierge</p>
            <p className="font-display text-lg">Nectar</p>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
            {messages.map((m, i) => (
              <p
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] bg-primary px-3 py-2 text-primary-foreground"
                    : "max-w-[90%] bg-sand px-3 py-2 leading-relaxed"
                }
              >
                {m.content}
              </p>
            ))}
            {busy && <p className="label-mono text-muted-foreground">Nectar is typing…</p>}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about a product or order…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button onClick={send} aria-label="Send" className="text-accent">
              <Send width={16} height={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
