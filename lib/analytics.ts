import { usePlausible } from "next-plausible";

/**
 * Analytics event types for type safety
 */
export type AnalyticsEvent =
  // Authentication events
  | "auth_signup"
  | "auth_login"
  | "auth_logout"
  | "auth_provider_selected"

  // Trip events
  | "trip_created"
  | "trip_shared"
  | "trip_export_pdf"
  | "trip_export_ics"
  | "trip_deleted"

  // Chat events
  | "chat_message_sent"
  | "chat_suggestion_clicked"
  | "chat_regenerate"

  // Suggestion events
  | "suggestion_dismissed"
  | "suggestion_form_opened"
  | "suggestion_form_submitted"

  // Navigation events
  | "page_view"
  | "external_link_clicked"

  // Error events
  | "error_occurred"
  | "export_failed";

/**
 * Analytics event properties for additional context
 */
export interface AnalyticsEventProps {
  // Authentication properties
  provider?: string;

  // Trip properties
  trip_id?: string;
  destination?: string;
  purpose?: string;
  export_format?: "pdf" | "ics";
  share_method?: "link" | "direct";

  // Chat properties
  message_type?: "user" | "ai" | "system";
  suggestion_type?: string;
  regeneration_count?: number;

  // Error properties
  error_type?: string;
  error_message?: string;
  component?: string;

  // Navigation properties
  external_domain?: string;
  link_type?: string;

  // General properties
  user_id?: string;
  session_duration?: number;
  feature_used?: string;
}

/**
 * Hook for tracking analytics events
 */
export function useAnalytics() {
  const plausible = usePlausible();

  const track = (event: AnalyticsEvent, props?: AnalyticsEventProps) => {
    try {
      // Only track in production or when explicitly enabled
      const shouldTrack = process.env.NODE_ENV === "production" ||
        process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

      if (!shouldTrack) {
        console.log(`[Analytics Debug] ${event}`, props);
        return;
      }

      // Clean props - remove undefined values
      const cleanProps = props ? Object.fromEntries(
        Object.entries(props).filter(([_, value]) => value !== undefined)
      ) : undefined;

      plausible(event, { props: cleanProps });
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  };

  return { track };
}

/**
 * Server-side analytics tracking utility
 */
export function trackServerEvent(event: AnalyticsEvent, props?: AnalyticsEventProps) {
  try {
    // For server-side tracking, we'll log the event
    // In production, you might want to use a server-side analytics service
    const shouldTrack = process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

    if (!shouldTrack) {
      console.log(`[Server Analytics Debug] ${event}`, props);
      return;
    }

    // TODO: Implement server-side tracking to Plausible API if needed
    console.log(`[Server Analytics] ${event}`, props);
  } catch (error) {
    console.error("Server analytics tracking error:", error);
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceTracker {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(analytics?: ReturnType<typeof useAnalytics>["track"]) {
    const duration = performance.now() - this.startTime;

    if (analytics) {
      analytics("page_view", {
        feature_used: this.operation,
        session_duration: Math.round(duration)
      });
    }

    // Log performance for monitoring
    if (duration > 1000) { // Log slow operations
      console.warn(`Slow operation detected: ${this.operation} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }
}

/**
 * Error tracking utility
 */
export function trackError(error: Error, context?: {
  component?: string;
  user_id?: string;
  additional_context?: Record<string, any>;
}) {
  try {
    const errorInfo = {
      error_type: error.name,
      error_message: error.message.substring(0, 100), // Limit message length
      component: context?.component,
      user_id: context?.user_id,
      ...context?.additional_context
    };

    trackServerEvent("error_occurred", errorInfo);

    // Also log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Tracked error:", error, errorInfo);
    }
  } catch (trackingError) {
    console.error("Error tracking failed:", trackingError);
  }
}
