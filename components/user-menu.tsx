"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { User, LogOut, Settings, History } from "lucide-react";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Only show when authenticated
  if (loading || !user) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="relative">
        {/* User Avatar Button */}
        <Button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-10 h-10 p-0 rounded-full bg-black/20 backdrop-blur-2xl border-white/30 text-white hover:bg-white/10 shadow-2xl ring-1 ring-white/20"
        >
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
        </Button>

        {/* Dropdown Menu */}
        {isUserMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[-1]"
              onClick={() => setIsUserMenuOpen(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 top-12 w-64 bg-black/20 backdrop-blur-2xl border border-white/30 rounded-xl shadow-2xl ring-1 ring-white/20 py-2">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-white/20">
                <p className="text-white font-medium truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                <p className="text-white/60 text-sm truncate">{user.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                  <History className="w-4 h-4" />
                  Trip History
                </button>

                <button className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                  <Settings className="w-4 h-4" />
                  Preferences
                </button>

                <hr className="my-1 border-white/20" />

                <button
                  onClick={signOut}
                  className="w-full px-4 py-2 text-left text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
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
