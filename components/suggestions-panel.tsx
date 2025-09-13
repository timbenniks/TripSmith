"use client";

import { useState, useEffect, useCallback } from 'react';
import { Suggestion } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { logError } from '@/lib/error-logger';

interface SuggestionsPanelProps {
  tripId: string;
  destination: string;
  firstTravelDate?: string;
  daySpan?: number;
  onApply: (prompt: string, meta?: { suggestionId: string }) => void;
}

type PanelState = 'idle' | 'loading' | 'ready' | 'error';

export function SuggestionsPanel({ tripId, destination, firstTravelDate, daySpan, onApply }: SuggestionsPanelProps) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PanelState>('idle');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<number | null>(null);

  const canRegenerate = () => {
    if (!lastGeneratedAt) return true;
    return Date.now() - lastGeneratedAt > 15_000; // throttle 15s
  };

  const generate = useCallback(async () => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setState('ready');
      setLastGeneratedAt(Date.now());
    } catch (error) {
      logError(error, { source: 'SuggestionsPanel', extra: { phase: 'generate' } });
      setState('error');
    }
  }, [tripId, destination, firstTravelDate, daySpan, state]);

  useEffect(() => {
    // Auto-generate once when panel first opened if never generated
    if (open && state === 'idle') {
      generate();
    }
  }, [open, state, generate]);

  return (
    <div className="mt-3 border-t border-white/15 pt-3" aria-labelledby="suggestions-heading" role="region">
      <div className="flex items-center justify-between mb-2">
        <h4 id="suggestions-heading" className="text-xs font-medium text-contrast-secondary uppercase tracking-wide">Suggestions</h4>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-xs text-contrast-tertiary hover:text-white transition-colors underline-offset-2 hover:underline"
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {!open && suggestions.length > 0 && (
        <p className="text-contrast-tertiary text-xs mb-1">{suggestions.length} ready</p>
      )}
      {open && (
        <div className="space-y-3">
          {state === 'loading' && (
            <div className="flex items-center gap-2 text-contrast-tertiary text-xs">
              <LoadingSpinner size="sm" /> Generating smart suggestions…
            </div>
          )}
          {state === 'error' && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2 flex items-center justify-between gap-3">
              <span>Could not generate suggestions.</span>
              <button
                onClick={() => canRegenerate() && generate()}
                disabled={!canRegenerate()}
                className="underline hover:no-underline disabled:opacity-40"
              >Retry generation</button>
            </div>
          )}
          {state === 'ready' && suggestions.length === 0 && (
            <div className="text-xs text-contrast-tertiary">No suggestions available right now.</div>
          )}
          {state === 'ready' && suggestions.length > 0 && (
            <ul className="space-y-2">
              {suggestions.map(s => (
                <li key={s.id} className="group border border-white/20 bg-black/20 backdrop-blur-xl rounded-md p-3 text-xs flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-contrast-secondary leading-snug pr-2">{s.title}</div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-white/20 bg-white/5 text-contrast-tertiary group-hover:text-white group-hover:border-white/40 transition-colors"
                      aria-label={`Source: ${s.source}`}
                    >{s.source === 'deterministic' ? 'Seed' : s.source === 'ai' ? 'AI' : 'Hybrid'}</span>
                  </div>
                  <p className="text-contrast-tertiary leading-relaxed">{s.detail}</p>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => onApply(s.actionPrompt, { suggestionId: s.id })}
                      className="text-[11px] font-medium px-2 py-1 rounded-md bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 hover:text-white transition-colors"
                    >Apply</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {open && state === 'ready' && (
            <div className="pt-1 flex items-center justify-end">
              <button
                onClick={() => canRegenerate() && generate()}
                disabled={!canRegenerate()}
                className="text-[11px] text-contrast-tertiary hover:text-white underline-offset-2 hover:underline disabled:opacity-40"
              >Generate again</button>
            </div>
          )}
        </div>
      )}
      {!open && state === 'idle' && (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 text-[11px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/15 text-contrast-tertiary hover:text-white transition-colors"
        >Generate Suggestions</button>
      )}
    </div>
  );
}
