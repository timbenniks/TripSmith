"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
  autoFocus?: "confirm" | "cancel";
}

// Lightweight accessible confirmation dialog (focus trap & ESC handling)
export function ConfirmDialog({
  open,
  title = "Confirm",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  busy = false,
  autoFocus = "confirm",
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        (autoFocus === "confirm"
          ? confirmBtnRef.current
          : cancelBtnRef.current
        )?.focus();
      });
    } else if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
    }
  }, [open, autoFocus]);

  // ESC & focus trap
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            (last as HTMLElement).focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            (first as HTMLElement).focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div
          aria-modal="true"
          role="dialog"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={description ? "confirm-dialog-desc" : undefined}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={busy ? undefined : onCancel}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            className="relative w-full max-w-sm mx-4 rounded-xl bg-black/60 border border-white/20 shadow-2xl ring-1 ring-white/10 p-5 backdrop-blur-2xl focus:outline-none"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
          >
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-white mb-2"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-dialog-desc"
                className="text-sm text-white/70 mb-4"
              >
                {description}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                ref={cancelBtnRef}
                onClick={onCancel}
                disabled={busy}
                className="px-4 py-2 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={onConfirm}
                disabled={busy}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400/50 disabled:opacity-40 ${
                  variant === "danger"
                    ? "bg-red-600/80 hover:bg-red-600 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Processing...
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
