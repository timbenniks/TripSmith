"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, History } from "lucide-react";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemsRef = useRef<HTMLButtonElement[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const router = useRouter();

  // NOTE: Do not early-return before hooks; defer auth-based null render until after all hooks run.

  const handleTripHistory = () => {
    setIsUserMenuOpen(false);
    router.push("/trips");
  };

  // Close on outside click (more robust than backdrop alone)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!isUserMenuOpen) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  // When menu opens, focus first item
  useEffect(() => {
    if (isUserMenuOpen) {
      setFocusedIndex(0);
      // Timeout to ensure elements exist
      requestAnimationFrame(() => {
        menuItemsRef.current[0]?.focus();
      });
    } else {
      setFocusedIndex(-1);
    }
  }, [isUserMenuOpen]);

  // Only show when authenticated (placed AFTER hooks to preserve stable hook order)
  if (loading || !user) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-40"
      role="navigation"
      aria-label="User menu"
    >
      <div className="relative">
        {/* User Avatar Button */}
        <Button
          ref={triggerRef}
          onClick={() => {
            setIsUserMenuOpen(!isUserMenuOpen);
          }}
          className="w-10 h-10 p-0 rounded-full bg-black/20 backdrop-blur-2xl border-white/30 text-white hover:bg-white/10 shadow-2xl ring-1 ring-white/20"
          aria-haspopup="menu"
          aria-expanded={isUserMenuOpen}
          aria-controls="user-menu-dropdown"
        >
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={`${
                user.user_metadata?.full_name || user.email || "User"
              } profile photo`}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5" aria-hidden="true" />
          )}
        </Button>

        {/* Dropdown Menu */}
        {isUserMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[-1] cursor-pointer"
              onClick={() => setIsUserMenuOpen(false)}
            />

            {/* Menu */}
            <div
              id="user-menu-dropdown"
              role="menu"
              aria-labelledby="user-menu-button"
              className="absolute right-0 top-12 w-64 bg-black/20 backdrop-blur-2xl border border-white/30 rounded-xl shadow-2xl ring-1 ring-white/20 py-2"
              ref={menuRef}
              tabIndex={-1}
              onKeyDown={(e) => {
                const count = menuItemsRef.current.length;
                if (e.key === "Escape") {
                  e.preventDefault();
                  setIsUserMenuOpen(false);
                  triggerRef.current?.focus();
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = (focusedIndex + 1 + count) % count;
                  setFocusedIndex(next);
                  menuItemsRef.current[next]?.focus();
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = (focusedIndex - 1 + count) % count;
                  setFocusedIndex(prev);
                  menuItemsRef.current[prev]?.focus();
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setFocusedIndex(0);
                  menuItemsRef.current[0]?.focus();
                } else if (e.key === "End") {
                  e.preventDefault();
                  setFocusedIndex(count - 1);
                  menuItemsRef.current[count - 1]?.focus();
                }
              }}
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-white/20">
                <p className="text-white font-medium truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-white/60 text-sm truncate">{user.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={handleTripHistory}
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-purple-400/50"
                  ref={(el) => {
                    if (el) menuItemsRef.current[0] = el;
                  }}
                  tabIndex={-1}
                >
                  <History className="w-4 h-4" aria-hidden="true" />
                  Trip History
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-purple-400/50"
                  ref={(el) => {
                    if (el) menuItemsRef.current[1] = el;
                  }}
                  tabIndex={-1}
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  Preferences
                </button>

                <hr className="my-1 border-white/20" />

                <button
                  type="button"
                  onClick={signOut}
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors cursor-pointer focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-purple-400/50"
                  ref={(el) => {
                    if (el) menuItemsRef.current[2] = el;
                  }}
                  tabIndex={-1}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
