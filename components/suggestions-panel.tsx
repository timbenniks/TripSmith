"use client";

import { useState, useEffect, useCallback } from "react";
import { Suggestion } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { logError } from "@/lib/error-logger";

interface SuggestionsPanelProps {
  tripId: string;
  destination: string;
  firstTravelDate?: string;
  daySpan?: number;
  onApply: (prompt: string, meta?: { suggestionId: string }) => void;
}

type PanelState = "idle" | "loading" | "ready" | "error";

export function SuggestionsPanel({
  tripId,
  destination,
  firstTravelDate,
  daySpan,
  onApply,
}: SuggestionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PanelState>("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);

  const canRegenerate = () => {
    if (!lastGeneratedAt) return true;
    return Date.now() - lastGeneratedAt > 15_000; // throttle 15s
  };

  const generate = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          context: {
            destination,
            firstTravelDate,
            daySpan,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setState("ready");
      setLastGeneratedAt(Date.now());
    } catch (error) {
      logError(error, {
        source: "SuggestionsPanel",
        extra: { phase: "generate" },
      });
      setState("error");
    }
  }, [tripId, destination, firstTravelDate, daySpan, state]);

  useEffect(() => {
    // Auto-generate once when panel first opened if never generated
    if (open && state === "idle") {
      generate();
    }
  }, [open, state, generate]);

  return (
    <div className="mt-6" aria-labelledby="suggestions-heading" role="region">
      <div className="flex items-center justify-between mb-3">
        <h4
          id="suggestions-heading"
          className="text-[11px] font-semibold tracking-wide text-white/80 uppercase"
        >
          Smart Suggestions
        </h4>
        <div className="flex items-center gap-3">
          {suggestions.length > 0 && !open && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-white/50">
              {suggestions.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-[11px] px-2 py-1 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
            aria-expanded={open}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {!open && state === "idle" && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left group relative overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/[0.04] backdrop-blur-xl px-4 py-3 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        >
          <span className="block text-[12px] font-medium text-white/80 mb-1">
            Generate Suggestions
          </span>
          <span className="block text-[11px] text-white/50">
            Get contextual ideas to refine flights, lodging and schedule.
          </span>
        </button>
      )}
      {open && (
        <div className="rounded-xl border border-white/15 bg-black/25 backdrop-blur-2xl ring-1 ring-white/10 p-4 space-y-4">
          {state === "loading" && (
            <div className="flex items-center gap-3 text-[12px] text-white/60">
              <LoadingSpinner size="sm" />
              <span>Generating smart suggestions…</span>
            </div>
          )}
          {state === "error" && (
            <div className="text-[12px] rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 flex items-center justify-between">
              <span className="text-red-200/90">
                Failed to generate suggestions.
              </span>
              <button
                type="button"
                onClick={() => canRegenerate() && generate()}
                disabled={!canRegenerate()}
                className="text-[11px] underline decoration-dotted hover:decoration-solid text-red-200/80 hover:text-red-100 disabled:opacity-40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/50 rounded disabled:cursor-not-allowed"
              >
                Retry
              </button>
            </div>
          )}
          {state === "ready" && suggestions.length === 0 && (
            <div className="text-[12px] text-white/55">
              No suggestions available right now.
            </div>
          )}
          {state === "ready" && suggestions.length > 0 && (
            <ul className="grid md:grid-cols-2 gap-3" role="list">
              {suggestions.map((s) => (
                <li
                  key={s.id}
                  className="group relative flex flex-col rounded-lg border border-white/15 bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/[0.05] transition-colors p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className="text-[12px] font-medium text-white/85 leading-snug pr-4">
                      {s.title}
                    </h5>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] tracking-wide uppercase border border-white/15 bg-white/5 text-white/45 group-hover:text-white/80 group-hover:border-white/30 transition-colors"
                      aria-label={`Source: ${s.source}`}
                    >
                      {s.source === "deterministic"
                        ? "Seed"
                        : s.source === "ai"
                        ? "AI"
                        : "Hybrid"}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed mb-2 line-clamp-3">
                    {s.detail}
                  </p>
                  <div className="flex items-center justify-end mt-auto pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onApply(s.actionPrompt, { suggestionId: s.id })
                      }
                      className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-purple-600/25 hover:bg-purple-600/45 border border-purple-400/30 text-purple-200 hover:text-white transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                    >
                      Apply
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {open && state === "ready" && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-[10px] text-white/35">
                Adaptive set · {suggestions.length} item
                {suggestions.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() => canRegenerate() && generate()}
                disabled={!canRegenerate()}
                className="text-[11px] text-white/55 hover:text-white/90 underline decoration-dotted hover:decoration-solid disabled:opacity-30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50 rounded disabled:cursor-not-allowed"
              >
                Generate again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
