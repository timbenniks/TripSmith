"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tripService, Trip } from "@/lib/trip-service";
import { logError } from "@/lib/error-logger";
import { Message } from "@/components/message-bubble";
import { TripActionsHeader } from "./trip-actions-header";
import { TripChatSidebar } from "./trip-chat-sidebar";
import { TripItineraryDisplay } from "./trip-itinerary-display";
import { UserMenu } from "@/components/user-menu";
// Note: Itinerary extraction handled inside streaming-utils when handleItineraryGeneration=true
import {
  handleStreamingResponse,
  createAssistantMessage,
  makeChatRequest,
} from "@/lib/streaming-utils";
import { UiDirectivesPayload } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { ManageSharesDialog } from "@/components/manage-shares-dialog";

interface TripDetails {
  timezone: string;
  destination: string;
  travelDates: string;
  purpose: string;
}

interface MatureTripPageProps {
  tripId: string;
  initialTrip: Trip;
  tripDetails: TripDetails;
}

export function MatureTripPage({
  tripId,
  initialTrip,
  tripDetails,
}: MatureTripPageProps) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip>(initialTrip);
  const [messages, setMessages] = useState<Message[]>(
    initialTrip.chat_history || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState(
    initialTrip.itinerary_data
  );
  const [showItinerary, setShowItinerary] = useState(
    // Default to chat on mobile if no itinerary, otherwise show itinerary
    initialTrip.itinerary_data ? true : false
  );
  const [autoCompleteChecked, setAutoCompleteChecked] = useState(false);
  const [showCompleteSuggestion, setShowCompleteSuggestion] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showManageShares, setShowManageShares] = useState(false);
  const [shareExpiry, setShareExpiry] = useState<string>(""); // YYYY-MM-DD
  const [createdShareExpiresAt, setCreatedShareExpiresAt] = useState<
    string | null
  >(null);

  // (Removed PDF test: deprecated PDF export layer)

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Make chat request using utility
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          tripDetails: tripDetails,
          tripId: tripId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create assistant message
      const assistantMessageObj = createAssistantMessage();
      setMessages((prev) => [...prev, assistantMessageObj]);

      // Handle streaming with utility
      // Detect explicit regenerate intent in the user message
      const regenerateIntentRegex =
        /(regenerate itinerary|full updated itinerary|return the full itinerary|complete itinerary now|full itinerary json)/i;
      const expectFull = regenerateIntentRegex.test(userMessage.content);

      const {
        content: finalContent,
        itineraryData,
        uiDirectives,
      } = await handleStreamingResponse(response, assistantMessageObj.id, {
        handleItineraryGeneration: true,
        expectFullItinerary: expectFull,
        onMessageUpdate: (messageId, content) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId ? { ...msg, content } : msg
            )
          );
        },
      });

      // Create final messages array
      const finalAssistant = {
        ...assistantMessageObj,
        content: finalContent,
        itineraryData: itineraryData,
        uiDirectives: uiDirectives,
      } as typeof assistantMessageObj & { uiDirectives?: UiDirectivesPayload };
      const finalMessages = updatedMessages.concat([finalAssistant]);

      // Update current itinerary if we got new data
      if (itineraryData) {
        setCurrentItinerary(itineraryData);
        // Auto-switch to itinerary panel on mobile for visibility
        setShowItinerary(true);
        // Persist itinerary
        await tripService.updateTripItineraryData(tripId, itineraryData);
      }

      // Save chat history to database
      await tripService.updateTripChatHistory(tripId, finalMessages);
      setMessages(finalMessages);
    } catch (error) {
      console.error("Error sending message:", error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-complete status 24h after end date (client-side heuristic)
  useEffect(() => {
    if (autoCompleteChecked) return; // run once per mount
    if (!trip) return;
    if (trip.status === "completed") return;
    const toDateStr = trip.travel_dates?.to;
    if (!toDateStr) return;
    const endDate = new Date(toDateStr + "T23:59:59");
    const now = new Date();
    const threshold = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // +24h
    if (now >= threshold) {
      // Mark completed silently
      (async () => {
        const previousStatus = trip.status;
        setTrip((prev) => ({ ...prev, status: "completed" }));
        const ok = await tripService.updateTripStatus(trip.id, "completed");
        if (!ok) {
          // Revert if failed
          setTrip((prev) => ({ ...prev, status: previousStatus }));
        } else {
        }
        setAutoCompleteChecked(true);
      })();
    } else {
      // If within 24h past end date window approaching, show suggestion when now > endDate
      if (now >= endDate) {
        setShowCompleteSuggestion(true);
      }
      setAutoCompleteChecked(true);
    }
  }, [trip, autoCompleteChecked]);

  const handleDeleteConfirmed = async () => {
    setIsDeleting(true);
    try {
      const ok = await tripService.deleteTrip(tripId);
      if (ok) {
        router.push("/trips");
      } else {
        alert("Failed to delete trip. Please try again.");
      }
    } catch (error) {
      console.error("Failed to delete trip:", error);
      logError(error, {
        source: "MatureTripPage",
        extra: { action: "deleteTrip", tripId },
      });
      alert("Failed to delete trip. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    // Open the share dialog in "pre-create" mode so user can set expiry first
    setShareUrl(null);
    setShareExpiry("");
    setShowShareDialog(true);
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleItineraryUpdate = (itinerary: any) => {
    setCurrentItinerary(itinerary);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
        {/* Content overlay */}
        <div className="relative z-10 h-screen flex flex-col">
          {/* User Menu */}
          <UserMenu />

          {showCompleteSuggestion && trip.status !== "completed" && (
            <div className="mx-3 sm:mx-4 lg:mx-6 mt-2 mb-1 bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border border-white/20 rounded-md px-3 py-2 text-xs flex items-center justify-between gap-3">
              <div className="text-contrast-secondary">
                Trip has ended. Mark as{" "}
                <span className="font-semibold text-green-300">Completed</span>?
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const previousStatus = trip.status;
                    setTrip((prev) => ({ ...prev, status: "completed" }));
                    const ok = await tripService.updateTripStatus(
                      trip.id,
                      "completed"
                    );
                    if (!ok) {
                      setTrip((prev) => ({ ...prev, status: previousStatus }));
                      alert("Failed to update status.");
                    }
                    setShowCompleteSuggestion(false);
                  }}
                  className="px-2 py-1 rounded-md bg-green-500/20 hover:bg-green-500/30 text-green-300 text-[11px] font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400/50"
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompleteSuggestion(false)}
                  className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[11px] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <TripActionsHeader
            tripId={trip.id}
            tripName={trip.name}
            destination={trip.destination}
            status={trip.status}
            onStatusChange={async (newStatus) => {
              // Optimistic state update
              setTrip((prev) => ({ ...prev, status: newStatus }));
              const ok = await tripService.updateTripStatus(trip.id, newStatus);
              if (!ok) {
                // Revert if failed
                setTrip((prev) => ({ ...prev, status: trip.status }));
                alert("Failed to update status.");
              }
            }}
            onDelete={() => setShowDeleteDialog(true)}
            onShare={handleShare}
            onBackToTrips={() => router.push("/trips")}
          />

          {/* Main Content - Two Panel Layout with proper height management */}
          <div className="flex-1 flex min-h-0 relative w-full">
            <div className="flex w-full max-w-[1700px] 2xl:max-w-[1800px] mx-auto min-h-0 gap-4 xl:gap-6">
              {/* Left Sidebar - Chat */}
              <div
                className={`
                ${showItinerary ? "hidden lg:block" : "block"}
                lg:w-[500px] xl:w-[600px] 2xl:w-[660px]
                lg:min-w-[440px] lg:max-w-[700px] lg:flex-shrink-0
                w-full
                
                h-full overflow-hidden
              `}
                role="complementary"
                aria-label="Trip chat sidebar"
              >
                <TripChatSidebar
                  tripId={tripId}
                  messages={messages}
                  onNewMessage={handleNewMessage}
                  onItineraryUpdate={handleItineraryUpdate}
                  tripDetails={tripDetails}
                  isLoading={isLoading}
                  onSendMessage={sendMessage}
                  currentItinerary={currentItinerary}
                />
              </div>

              {/* Right Panel - Itinerary Display */}
              <div
                className={`
                ${showItinerary ? "block" : "hidden lg:block"}
                lg:flex-1 lg:min-w-0 flex flex-col min-h-0
                w-full h-full
                overflow-hidden
              `}
                role="main"
                aria-label="Trip itinerary display"
              >
                <TripItineraryDisplay
                  itineraryData={currentItinerary}
                  tripDetails={tripDetails}
                  loading={isLoading}
                  hasMessages={messages.length > 0}
                  tripId={tripId}
                />
              </div>
            </div>

            {/* Mobile Toggle Button */}
            {(currentItinerary || messages.length > 0) && (
              <button
                type="button"
                onClick={() => setShowItinerary(!showItinerary)}
                className="lg:hidden fixed bottom-4 right-4 z-30 bg-purple-600/90 hover:bg-purple-700/90 text-white p-3 rounded-full shadow-xl transition-all duration-200 cursor-pointer backdrop-blur-sm border border-white/20 ring-2 ring-purple-400/20 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                aria-label={showItinerary ? "Show chat" : "Show itinerary"}
              >
                <span
                  className="text-lg"
                  role="img"
                  aria-label={showItinerary ? "Chat" : "Itinerary"}
                >
                  {showItinerary ? "💬" : "📋"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Trip"
        description="This will permanently delete the trip and its chat history. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        busy={isDeleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => (!isDeleting ? setShowDeleteDialog(false) : null)}
      />
      <ConfirmDialog
        open={showShareDialog}
        title={shareUrl ? "Trip shared" : "Share trip"}
        description={
          shareUrl
            ? "Share this read-only link. It shows a snapshot of your trip."
            : "Optionally set an expiry date, then create your share link."
        }
        confirmLabel={
          shareUrl ? "Copy link" : isSharing ? "Creating…" : "Create link"
        }
        cancelLabel="Close"
        busy={isSharing}
        onConfirm={async () => {
          if (shareUrl) {
            try {
              await navigator.clipboard.writeText(shareUrl);
            } catch {}
            setShowShareDialog(false);
            return;
          }
          // Create the share with optional expiry
          if (isSharing) return;
          setIsSharing(true);
          try {
            let expiresAt: string | null = null;
            if (shareExpiry) {
              const [y, m, d] = shareExpiry
                .split("-")
                .map((v) => parseInt(v, 10));
              if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                const end = new Date(y, m - 1, d, 23, 59, 59, 999);
                expiresAt = end.toISOString();
              }
            }
            const res = await fetch("/api/share", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId, expiresAt }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(
                data?.error || `Share failed (status ${res.status})`
              );
            }
            const data = (await res.json()) as {
              url: string;
              token: string;
              expiresAt?: string | null;
            };
            setShareUrl(data.url);
            setCreatedShareExpiresAt(data.expiresAt ?? null);
          } catch (err) {
            console.error("Share failed", err);
            alert("Failed to create share link. Please try again.");
          } finally {
            setIsSharing(false);
          }
        }}
        onCancel={() => setShowShareDialog(false)}
      >
        <div className="space-y-3">
          {/* Expiry selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="share-expiry" className="sr-only">
              Expiry date
            </label>
            <input
              id="share-expiry"
              type="date"
              value={shareExpiry}
              onChange={(e) => setShareExpiry(e.target.value)}
              className="bg-white/10 text-white/80 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400/50 border border-white/20"
              aria-label="Expiry date"
            />
            {shareExpiry && (
              <button
                type="button"
                onClick={() => setShareExpiry("")}
                className="px-3 py-2 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Link field (placeholder before creation) */}
          <div>
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl || ""}
                placeholder="Link will appear here after creating"
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="text-sm"
                aria-label="Share link"
              />
              <button
                type="button"
                disabled={!shareUrl}
                onClick={async () => {
                  if (!shareUrl) return;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                  } catch {}
                }}
                className="px-3 py-2 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              >
                Copy
              </button>
            </div>
            {/* Expiry hint */}
            <p className="text-xs text-white/50 mt-1">
              {shareUrl
                ? createdShareExpiresAt
                  ? `Expires on ${new Date(
                      createdShareExpiresAt
                    ).toLocaleDateString()}`
                  : "No expiry"
                : shareExpiry
                ? "If created now, link will expire at the end of that day"
                : "Leave empty for no expiry"}
            </p>
          </div>

          {/* Manage links entry */}
          {shareUrl && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowShareDialog(false);
                  setTimeout(() => setShowManageShares(true), 50);
                }}
                className="text-sm text-white/70 hover:text-white underline underline-offset-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400/50 rounded"
              >
                Manage links
              </button>
            </div>
          )}
        </div>
      </ConfirmDialog>

      <ManageSharesDialog
        tripId={tripId}
        open={showManageShares}
        onClose={() => setShowManageShares(false)}
      />
    </>
  );
}
