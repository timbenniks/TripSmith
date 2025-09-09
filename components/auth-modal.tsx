"use client";

import { useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: "modal" | "inline";
}

export function AuthModal({
  isOpen,
  onClose,
  variant = "modal",
}: AuthModalProps) {
  if (!isOpen) return null;

  // Inline variant - no modal wrapper
  if (variant === "inline") {
    return (
      <div className="w-full">
        <style jsx>{`
          :global(.supabase-auth-ui_ui button[data-provider="github"] svg) {
            filter: brightness(0) invert(1);
          }
          :global(
              .supabase-auth-ui_ui button[data-provider="github"] svg path
            ) {
            fill: white !important;
          }
        `}</style>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#8b5cf6",
                  brandAccent: "#7c3aed",
                  brandButtonText: "white",
                  defaultButtonBackground: "rgba(255, 255, 255, 0.1)",
                  defaultButtonBackgroundHover: "rgba(255, 255, 255, 0.2)",
                  defaultButtonBorder: "rgba(255, 255, 255, 0.3)",
                  defaultButtonText: "white",
                  dividerBackground: "rgba(255, 255, 255, 0.2)",
                  inputBackground: "rgba(255, 255, 255, 0.1)",
                  inputBorder: "rgba(255, 255, 255, 0.3)",
                  inputBorderHover: "rgba(255, 255, 255, 0.4)",
                  inputBorderFocus: "#8b5cf6",
                  inputText: "white",
                  inputLabelText: "rgba(255, 255, 255, 0.8)",
                  inputPlaceholder: "rgba(255, 255, 255, 0.5)",
                  messageText: "white",
                  messageTextDanger: "#ef4444",
                  anchorTextColor: "#a78bfa",
                  anchorTextHoverColor: "#8b5cf6",
                },
              },
            },
            className: {
              container: "space-y-4",
              label: "text-white/80 font-medium",
              button: "rounded-lg font-medium transition-all duration-200",
              input: "rounded-lg backdrop-blur-sm",
              message: "text-sm",
              anchor: "font-medium hover:underline transition-colors",
            },
          }}
          providers={["github"]}
          onlyThirdPartyProviders={true}
        />
      </div>
    );
  }

  // Modal variant (original behavior)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-black/20 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl ring-1 ring-white/20 p-6">
        <style jsx>{`
          :global(.supabase-auth-ui_ui button[data-provider="github"] svg) {
            filter: brightness(0) invert(1);
          }
          :global(
              .supabase-auth-ui_ui button[data-provider="github"] svg path
            ) {
            fill: white !important;
          }
        `}</style>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to TripSmith
          </h2>
          <p className="text-white/70">
            Sign in to save your trips and preferences
          </p>
        </div>

        {/* Auth UI */}
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#8b5cf6",
                  brandAccent: "#7c3aed",
                  brandButtonText: "white",
                  defaultButtonBackground: "rgba(255, 255, 255, 0.1)",
                  defaultButtonBackgroundHover: "rgba(255, 255, 255, 0.2)",
                  defaultButtonBorder: "rgba(255, 255, 255, 0.3)",
                  defaultButtonText: "white",
                  dividerBackground: "rgba(255, 255, 255, 0.2)",
                  inputBackground: "rgba(255, 255, 255, 0.1)",
                  inputBorder: "rgba(255, 255, 255, 0.3)",
                  inputBorderHover: "rgba(255, 255, 255, 0.4)",
                  inputBorderFocus: "#8b5cf6",
                  inputText: "white",
                  inputLabelText: "rgba(255, 255, 255, 0.8)",
                  inputPlaceholder: "rgba(255, 255, 255, 0.5)",
                  messageText: "white",
                  messageTextDanger: "#ef4444",
                  anchorTextColor: "#a78bfa",
                  anchorTextHoverColor: "#8b5cf6",
                },
              },
            },
            className: {
              container: "space-y-4",
              label: "text-white/80 font-medium",
              button: "rounded-lg font-medium transition-all duration-200",
              input: "rounded-lg backdrop-blur-sm",
              message: "text-sm",
              anchor: "font-medium hover:underline transition-colors",
            },
          }}
          providers={["github"]}
          onlyThirdPartyProviders={true}
        />
      </div>
    </div>
  );
}
