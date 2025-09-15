// Lightweight client-side error logger with subscription and analytics integration.
// Keeps errors in-memory (per session) and allows UI components to subscribe.
// Designed to stay dependency-free and silent unless a failure occurs.

import { trackError } from './analytics';

export interface LoggedError {
  id: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number; // epoch ms
  source?: string; // optional component / feature origin
}

type Listener = (errors: LoggedError[]) => void;

class ErrorStore {
  private errors: LoggedError[] = [];
  private listeners: Set<Listener> = new Set();
  private max = 50;

  log(error: unknown, context?: { source?: string; extra?: Record<string, any> }) {
    let message = 'Unknown error';
    let stack: string | undefined;
    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      try { message = JSON.stringify(error); } catch { /* ignore */ }
    }

    const entry: LoggedError = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      message,
      stack,
      context: context?.extra,
      timestamp: Date.now(),
      source: context?.source,
    };

    this.errors.push(entry);
    if (this.errors.length > this.max) this.errors.shift();
    this.emit();

    // Track error with analytics if it's an actual Error object
    if (error instanceof Error) {
      trackError(error, {
        component: context?.source,
        additional_context: context?.extra
      });
    }

    return entry.id;
  }

  getAll() { return [...this.errors]; }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => { this.listeners.delete(listener); };
  }

  private emit() { const snapshot = this.getAll(); this.listeners.forEach(l => l(snapshot)); }
}

export const errorStore = new ErrorStore();

export function logError(error: unknown, context?: { source?: string; extra?: Record<string, any> }) {
  if (process.env.NODE_ENV !== 'production') {
    // Keep original console for local visibility
    // eslint-disable-next-line no-console
    console.error('[TripSmith Error]', error, context);
  }
  return errorStore.log(error, context);
}
