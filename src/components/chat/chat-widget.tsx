"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [aiProvider, setAiProvider] = useState<"gemini" | "claude" | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/ai-provider")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.provider) {
          setAiProvider(data.provider);
        } else {
          setNotConfigured(true);
        }
      })
      .catch(() => {
        // provider fetch failure is non-fatal
      });

    fetch("/api/chat/history")
      .then((res) => {
        if (res.status === 503) {
          setNotConfigured(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {
        // history fetch failure is non-fatal
      });
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503 && data.error === "Agent IA non configuré") {
          setNotConfigured(true);
        } else {
          setError(data.error ?? "Une erreur est survenue");
        }
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch {
      setError("Service temporairement indisponible");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant potager"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#2D5A3D] text-white shadow-lg flex items-center justify-center text-2xl hover:bg-[#3D7A52] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A3D] focus-visible:ring-offset-2"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span aria-hidden="true">🌱</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant Potager"
          className="fixed bottom-[5.5rem] right-6 z-50 w-[calc(100vw-3rem)] sm:w-96 h-[500px] bg-white rounded-2xl shadow-lg border border-[#E8E4DE] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DE] flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2
                className="text-base font-semibold text-[#2A2622]"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                Assistant Potager
              </h2>
              {aiProvider === "gemini" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E6F4EA] text-[#2D5A3D]">
                  Gemini
                </span>
              )}
              {aiProvider === "claude" && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#5B21B6]">
                  Claude
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7D766E] hover:text-[#2A2622] hover:bg-[#F5F2EE] transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {notConfigured ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                <span className="text-3xl">🌱</span>
                <p className="text-sm text-[#3D3832] text-center font-medium">
                  L&apos;assistant potager n&apos;est pas encore activé.
                </p>
                <p className="text-xs text-[#7D766E] text-center">
                  Configurez-le en 3 minutes!
                </p>
                <Link
                  href="/guide"
                  className="text-sm font-medium text-[#2D5A3D] underline underline-offset-2 hover:text-[#3D7A52] transition-colors"
                >
                  Voir le guide de configuration
                </Link>
              </div>
            ) : messages.length === 0 && !loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[#A9A29A] text-center px-4">
                  Posez une question sur votre potager et je vous répondrai avec
                  des conseils personnalisés.
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={msg.id ? `db-${msg.id}` : `local-${i}-${msg.role}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#2D5A3D] text-white rounded-br-sm"
                        : "bg-[#F5F2EE] text-[#3D3832] rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#F5F2EE] text-[#A9A29A] px-3 py-2 rounded-xl rounded-bl-sm text-sm">
                  <span className="inline-flex gap-1 items-center">
                    <span
                      className="w-1.5 h-1.5 bg-[#A9A29A] rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#A9A29A] rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#A9A29A] rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <p className="text-xs text-[#C4463A] bg-[#C4463A]/10 border border-[#C4463A]/20 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {!notConfigured && (
            <div className="flex-shrink-0 border-t border-[#E8E4DE] px-3 py-3 flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Posez votre question…"
                disabled={loading}
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-[#E8E4DE] bg-[#FAF8F5] text-[#2A2622] placeholder-[#A9A29A] focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 focus:border-[#2D5A3D] disabled:opacity-50 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                aria-label="Envoyer"
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg bg-[#2D5A3D] text-white hover:bg-[#3D7A52] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
