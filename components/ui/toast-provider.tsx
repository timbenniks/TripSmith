"use client";

import * as Toast from '@radix-ui/react-toast';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AppToast {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
  variant?: 'default' | 'success' | 'error';
}

interface ToastContextValue {
  push: (toast: Omit<AppToast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useAppToast must be used within <AppToastProvider>');
  return ctx;
}

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AppToast[]>([]);

  const push = useCallback((toast: Omit<AppToast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const newToast: AppToast = { id, duration: 3000, variant: (toast as any).variant ?? 'default', ...toast };
      const next = [...prev, newToast];
      // Queue cap of 4: drop oldest
      if (next.length > 4) next.shift();
      return next;
    });
  }, []);

  const remove = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  const baseGlass = 'relative mb-3 w-[300px] overflow-hidden rounded-xl border border-white/15 bg-white/[0.10] before:absolute before:inset-0 before:bg-[linear-gradient(140deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.12)_32%,rgba(255,255,255,0)_70%)] before:pointer-events-none px-4 py-3 shadow-[0_4px_28px_-6px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl ring-1 ring-white/10 text-sm text-white/90 transition-[transform,opacity,background-color] will-change-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60';
  // Neutral monochrome variants (slight tint shifts only)
  const variantStyles: Record<string, string> = {
    success: 'after:absolute after:inset-0 after:bg-emerald-300/5 after:pointer-events-none',
    error: 'after:absolute after:inset-0 after:bg-rose-300/5 after:pointer-events-none',
    default: ''
  };

  return (
    <ToastContext.Provider value={{ push }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => {
          const variantClass = variantStyles[t.variant || 'default'];
          return (
            <Toast.Root
              key={t.id}
              duration={t.duration}
              className={`${baseGlass} data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:animate-toast-swipe-cancel data-[swipe=end]:animate-toast-swipe-out`}
              onOpenChange={(open) => { if (!open) remove(t.id); }}
            >
              <div className={`relative z-10 pr-5 ${variantClass}`}>
                {t.title && <Toast.Title className="font-semibold tracking-wide drop-shadow-sm mb-1 leading-none">{t.title}</Toast.Title>}
                {t.description && (
                  <Toast.Description className="text-[11px] leading-relaxed text-contrast-tertiary text-white/70">
                    {t.description}
                  </Toast.Description>
                )}
              </div>
              <Toast.Close
                aria-label="Close"
                className="absolute right-2 top-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-[11px] font-medium text-white/60 backdrop-blur-sm transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                ✕
              </Toast.Close>
            </Toast.Root>
          );
        })}
        <Toast.Viewport className="fixed top-4 right-4 z-[100] flex max-h-screen w-[320px] flex-col outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
