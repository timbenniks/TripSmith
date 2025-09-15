"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { useAnalytics } from "@/lib/analytics";

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
  const { track } = useAnalytics();

  // Track auth events
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "SIGNED_IN":
          track("auth_login", {
            provider: session?.user?.app_metadata?.provider,
            user_id: session?.user?.id,
          });
          break;
        case "SIGNED_OUT":
          track("auth_logout");
          break;
        case "USER_UPDATED":
          // Track successful signup (new user)
          if (session?.user && !session.user.last_sign_in_at) {
            track("auth_signup", {
              provider: session.user.app_metadata?.provider,
              user_id: session.user.id,
            });
          }
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, [track]);

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
          :global(.supabase-auth-ui_ui button[data-provider="google"] svg) {
            filter: none;
          }
          :global(.supabase-auth-ui_ui button[data-provider="google"]) {
            background: rgba(255, 255, 255, 0.9) !important;
            color: #1f2937 !important;
            border: rgba(255, 255, 255, 0.3) !important;
          }
          :global(.supabase-auth-ui_ui button[data-provider="google"]:hover) {
            background: rgba(255, 255, 255, 1) !important;
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
          providers={["google", "github"]}
          onlyThirdPartyProviders={true}
          redirectTo={
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined
          }
        />

        {/* Legal Links */}
        <div className="mt-4 text-center text-sm text-white/60">
          By signing in, you agree to our{" "}
          <Link
            href="/terms"
            className="text-purple-300 hover:text-purple-200 underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-purple-300 hover:text-purple-200 underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    );
  }

  // Modal variant (original behavior)
  // Focus trap & accessibility setup for modal variant
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element after mount
    requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    });
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md bg-black/20 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl ring-1 ring-white/20 p-6"
      >
        <style jsx>{`
          :global(.supabase-auth-ui_ui button[data-provider="github"] svg) {
            filter: brightness(0) invert(1);
          }
          :global(
              .supabase-auth-ui_ui button[data-provider="github"] svg path
            ) {
            fill: white !important;
          }
          :global(.supabase-auth-ui_ui button[data-provider="google"] svg) {
            filter: none;
          }
          :global(.supabase-auth-ui_ui button[data-provider="google"]) {
            background: rgba(255, 255, 255, 0.9) !important;
            color: #1f2937 !important;
            border: rgba(255, 255, 255, 0.3) !important;
          }
          :global(.supabase-auth-ui_ui button[data-provider="google"]:hover) {
            background: rgba(255, 255, 255, 1) !important;
          }
        `}</style>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="Close authentication dialog"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Title */}
        <div className="mb-6">
          <h2
            id="auth-modal-title"
            className="text-2xl font-bold text-white mb-2"
          >
            Welcome to TripSmith
          </h2>
          <p id="auth-modal-description" className="text-white/70">
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
          providers={["google", "github"]}
          onlyThirdPartyProviders={true}
          redirectTo={
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined
          }
        />

        {/* Legal Links */}
        <div className="mt-6 text-center text-sm text-white/60">
          By signing in, you agree to our{" "}
          <Link
            href="/terms"
            className="text-purple-300 hover:text-purple-200 underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-purple-300 hover:text-purple-200 underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
