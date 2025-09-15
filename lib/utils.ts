import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Standard glass morphism classes for consistent UI styling
 */
export const glassStyles = {
  card: "bg-gradient-to-br from-purple-950/30 to-slate-950/30 bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20",
  panel: "bg-black/30 backdrop-blur-xl border-white/20 shadow-xl ring-1 ring-white/10",
  modal: "bg-black/40 backdrop-blur-3xl border-white/30 shadow-2xl ring-1 ring-white/20",
  hover: "hover:border-purple-400/50 transition-all duration-300"
} as const;

/**
 * Simple time formatter to replace date-fns dependency
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
}
