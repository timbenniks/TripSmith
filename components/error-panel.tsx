"use client";

import { useEffect, useState } from "react";
import { errorStore, LoggedError } from "@/lib/error-logger";
import { AlertTriangle, X } from "lucide-react";

// Subtle floating error indicator that expands to show recent errors.
// Hidden until at least one error is logged.
export function ErrorPanel() {
  const [errors, setErrors] = useState<LoggedError[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = errorStore.subscribe(setErrors);
    return () => unsub();
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] text-xs">
      {/* Indicator Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 px-3 py-1.5 shadow-lg ring-1 ring-white/10 text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400/50"
          aria-expanded={open}
          aria-controls="error-panel"
        >
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-300 drop-shadow"
            aria-hidden="true"
          />
          <span>
            {errors.length} error{errors.length > 1 ? "s" : ""}
          </span>
        </button>
      )}

      {open && (
        <div
          id="error-panel"
          className="w-[340px] max-h-[50vh] flex flex-col rounded-xl bg-black/60 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/15 bg-white/5">
            <div className="flex items-center gap-2 text-white/80">
              <AlertTriangle
                className="h-4 w-4 text-amber-300"
                aria-hidden="true"
              />
              <span className="font-medium tracking-wide">Recent Errors</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/50 hover:text-white transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50 rounded"
              aria-label="Close error panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="divide-y divide-white/10 overflow-auto text-white/70">
            {errors
              .slice()
              .reverse()
              .map((err) => (
                <li key={err.id} className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[11px] leading-relaxed text-white/90 break-words">
                      {err.message}
                    </p>
                    <span className="shrink-0 text-[10px] text-white/40 tracking-wide tabular-nums">
                      {new Date(err.timestamp).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  {err.source && (
                    <p className="text-[10px] uppercase tracking-wider text-white/40">
                      {err.source}
                    </p>
                  )}
                  {err.context && (
                    <pre className="mt-1 rounded bg-white/5 p-2 text-[10px] leading-snug whitespace-pre-wrap max-h-32 overflow-auto">
                      {JSON.stringify(err.context, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
