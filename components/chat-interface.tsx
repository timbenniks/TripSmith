"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TripForm, type TripDetails } from "@/components/trip-form";
import { HybridResponse } from "@/lib/types";
import { MessageBubble } from "@/components/message-bubble";
import { ChatInput } from "@/components/chat-input";
// Replaced legacy vertical SuggestionsPanel with compact bubble bar
import { SuggestionBubblesBar } from "@/components/suggestion-bubbles-bar";
import { AnimatedBackground } from "@/components/animated-background";
import { EarthVisualization } from "@/components/earth-visualization";
import { useDelayedIndicator } from "@/hooks/useDelayedIndicator";
import { UserMenu } from "@/components/user-menu";
import { generateWelcomeMessage, type Message } from "@/lib/chat-utils";
import { tripService } from "@/lib/trip-service";
import { logError } from "@/lib/error-logger";
import { useAuth } from "@/components/auth-provider";
import { AuthModal } from "@/components/auth-modal";
import { useAnalytics } from "@/lib/analytics";
import {
  extractItineraryData,
  hasCompleteItinerary,
  getPreJsonContent,
} from "@/lib/itinerary-utils";
import { parseUiDirectives } from "@/lib/ui-directives-utils"; // ensure hidden ui_directives blocks are stripped

interface ChatInterfaceProps {
  tripDetails?: TripDetails;
  resumeTripId?: string | null;
}

export function ChatInterface({ resumeTripId }: ChatInterfaceProps) {
  const { user, loading } = useAuth();
  const { track } = useAnalytics();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(!resumeTripId); // Hide form if resuming a trip
  const [formData, setFormData] = useState<TripDetails>({
    timezone: "",
    destination: "",
    travelDates: "",
    purpose: "",
  });
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [tripDaySpan, setTripDaySpan] = useState<number | undefined>(undefined);
  const [firstTravelDate, setFirstTravelDate] = useState<string | undefined>(
    undefined
  );
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState(""); // For urgent/error announcements
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  });
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const showSendDelay = useDelayedIndicator(isLoading, 1500);

  useEffect(() => {
    setMounted(true);
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Effect to load trip when resumeTripId is provided
  useEffect(() => {
    const loadTrip = async () => {
      if (resumeTripId && user && !loading) {
        try {
          console.log("Loading trip:", resumeTripId);
          const trip = await tripService.getTripById(resumeTripId);

          if (trip) {
            // Set the trip details
            setFormData({
              timezone: "",
              destination: trip.destination,
              travelDates: trip.travel_dates?.formatted || "",
              purpose: trip.purpose,
            });

            // Set current trip
            setCurrentTripId(trip.id);

            // Load chat history
            if (trip.chat_history && trip.chat_history.length > 0) {
              setMessages(trip.chat_history);
            } else {
              // If no chat history, start with welcome message
              const welcomeMessage = generateWelcomeMessage({
                timezone: "",
                destination: trip.destination,
                travelDates: trip.travel_dates?.formatted || "",
                purpose: trip.purpose,
              });
              setMessages([welcomeMessage]);
            }

            // Hide the form since we're resuming
            setShowForm(false);

            console.log("Trip loaded successfully:", trip.name);
          } else {
            console.error("Trip not found:", resumeTripId);
          }
        } catch (error) {
          console.error("Error loading trip:", error);
          logError(error, {
            source: "ChatInterface",
            extra: { action: "loadTrip", resumeTripId },
          });
          setAssertiveMessage(
            "Error loading trip data. Some information may be missing."
          );
        }
      }
    };

    loadTrip();
  }, [resumeTripId, user, loading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Track chat message sent
    track("chat_message_sent", {
      message_type: "user",
      user_id: user?.id,
      trip_id: currentTripId || undefined,
    });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setLiveMessage("Assistant is generating a response");

    try {
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
          tripDetails: formData,
          tripId: currentTripId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      let assistantMessage = "";
      const decoder = new TextDecoder();

      const assistantMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessageObj]);

      // Handle streaming response - improved UX for JSON generation
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        if (chunk) {
          assistantMessage += chunk;

          // Check if we're generating JSON for an itinerary
          const hasJsonStart = assistantMessage.includes("```json");
          const isCompleteItinerary = hasCompleteItinerary(assistantMessage);

          if (hasJsonStart && !isCompleteItinerary) {
            // We're in the middle of JSON generation - show loading animation
            const preJsonContent = getPreJsonContent(assistantMessage);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageObj.id
                  ? {
                      ...msg,
                      content: preJsonContent || "Generating your itinerary...",
                      isGeneratingItinerary: true,
                    }
                  : msg
              )
            );
            setLiveMessage("Generating itinerary details");
          } else if (!hasJsonStart) {
            // Normal text streaming - show content as usual
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageObj.id
                  ? { ...msg, content: assistantMessage }
                  : msg
              )
            );
          }
          // If hasJsonStart && isCompleteItinerary, we'll let the final processing handle it
        }
      }

      // After streaming is complete, first strip any ui_directives control block so end users never see it
      const {
        cleanedContent: contentWithoutDirectives,
        uiDirectives: _uiDirectives, // currently unused in legacy chat-interface
      } = parseUiDirectives(assistantMessage);

      // Then check for itinerary data on the cleaned content
      const itineraryResult = extractItineraryData(contentWithoutDirectives);

      if (itineraryResult.hasItinerary) {
        // This is an itinerary response - create a special message with the data
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageObj.id
              ? {
                  ...msg,
                  content: itineraryResult.displayContent,
                  itineraryData: itineraryResult.itineraryData,
                  isItinerary: true,
                  isGeneratingItinerary: false, // Clear loading state
                }
              : msg
          )
        );
        setLiveMessage("Itinerary generated");

        // Save structured data to database
        if (currentTripId) {
          await tripService.updateTripItineraryData(
            currentTripId,
            itineraryResult.itineraryData
          );
        }
      } else {
        // Regular response - show final content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageObj.id
              ? {
                  ...msg,
                  content: contentWithoutDirectives,
                  isGeneratingItinerary: false,
                }
              : msg
          )
        );
        setLiveMessage("Response received");
      }

      // Legacy handling for old hybrid format (can be removed later)
      let structuredData: any = null;
      let displayContent = contentWithoutDirectives; // work from already-cleaned content

      try {
        // Look for JSON blocks in the complete response
        const jsonMatch = contentWithoutDirectives.match(
          /```json\s*(\{[\s\S]*?\})\s*```/
        );
        if (jsonMatch) {
          console.log("Found JSON block, attempting to parse...");
          const jsonString = jsonMatch[1];
          const hybridResponse: HybridResponse = JSON.parse(jsonString);

          if (hybridResponse.markdown && hybridResponse.structured) {
            console.log("Successfully parsed hybrid response");
            displayContent = hybridResponse.markdown;
            structuredData = hybridResponse.structured;

            // Update the displayed message to show markdown instead of JSON
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageObj.id
                  ? { ...msg, content: displayContent }
                  : msg
              )
            );
          }
        }
      } catch (jsonError) {
        console.log(
          "Response is not hybrid JSON format, treating as plain text:",
          jsonError
        );
        // If JSON parsing fails, just show the original response
        displayContent = contentWithoutDirectives;
      }

      // After streaming is complete, show the full content (including any buffered tables)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageObj.id
            ? { ...msg, content: displayContent }
            : msg
        )
      );

      // Save the complete conversation to database
      console.log("Attempting to save messages. currentTripId:", currentTripId);
      if (currentTripId) {
        const finalMessages = updatedMessages.concat({
          ...assistantMessageObj,
          content: displayContent, // Save the markdown version (no ui_directives)
        });
        console.log(
          "Saving messages to trip:",
          currentTripId,
          "Messages count:",
          finalMessages.length
        );
        const saved = await tripService.updateTripChatHistory(
          currentTripId,
          finalMessages
        );

        // If we have structured data, save it separately
        if (structuredData) {
          console.log("Saving structured itinerary data...");
          await tripService.updateTripItineraryData(
            currentTripId,
            structuredData
          );
        }

        console.log("Messages saved successfully:", saved);
        if (saved) {
          setLiveMessage("Trip saved successfully");
          router.push(`/trips/${currentTripId}`);
        }
      } else {
        console.log("No currentTripId - messages not saved");
      }
    } catch (error) {
      console.error("Chat error:", error);
      logError(error, {
        source: "ChatInterface",
        extra: { action: "chatSend", currentTripId },
      });
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setAssertiveMessage(
        "Chat error. Assistant is temporarily unavailable. Try again."
      );
    } finally {
      setIsLoading(false);
      setLiveMessage("");
    }
  };

  const handleFormSubmit = async (data: TripDetails, tripId?: string) => {
    setFormData(data);
    setCurrentTripId(tripId || null);
    // Parse travelDates string for first date and span (expects format like: Sep 9, 2025 - Sep 12, 2025 OR Sep 9-12, 2025)
    try {
      if (data.travelDates) {
        // Attempt to extract dates using simple patterns
        // Normalize separators
        const raw = data.travelDates.replace(/\u2013|\u2014/g, "-").trim();
        // Patterns: "Sep 9, 2025 - Sep 12, 2025" OR "Sep 9-12, 2025"
        let start: Date | null = null;
        let end: Date | null = null;
        const months = [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ];
        const monthRegex = /([A-Za-z]{3,})/;
        if (raw.match(/,\s*\d{4}\s*-\s*/)) {
          // Form: Sep 9, 2025 - Sep 12, 2025
          const parts = raw.split(/-+/);
          if (parts.length === 2) {
            const left = parts[0].trim();
            const right = parts[1].trim();
            start = new Date(left);
            end = new Date(right);
          }
        } else if (raw.match(/\d{1,2}-\d{1,2},\s*\d{4}$/)) {
          // Form: Sep 9-12, 2025
          const mMatch = raw.match(monthRegex);
          const monthToken = mMatch ? mMatch[1].slice(0, 3).toLowerCase() : "";
          const monthIndex = months.indexOf(monthToken);
          const rangeMatch = raw.match(/(\d{1,2})-(\d{1,2}),\s*(\d{4})/);
          if (monthIndex >= 0 && rangeMatch) {
            const y = parseInt(rangeMatch[3], 10);
            const d1 = parseInt(rangeMatch[1], 10);
            const d2 = parseInt(rangeMatch[2], 10);
            start = new Date(Date.UTC(y, monthIndex, d1));
            end = new Date(Date.UTC(y, monthIndex, d2));
          }
        }
        if (start && !isNaN(start.getTime())) {
          setFirstTravelDate(start.toISOString().split("T")[0]);
        }
        if (start && end && !isNaN(end.getTime())) {
          const diff =
            Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
          if (diff > 0 && diff < 60) setTripDaySpan(diff);
        }
      }
    } catch (e) {
      console.warn("Failed parsing travelDates for suggestion context", e);
    }
    setShowForm(false);

    // Send an initial message to get the welcome response from AI
    const welcomePrompt = `Hello! I just filled out my trip details and I'm ready to start planning. Here are my details:
- Name: ${user?.user_metadata?.full_name || user?.email || "Traveler"}
- Destination: ${data.destination}
- Travel Dates: ${data.travelDates}
- Purpose: ${data.purpose}
- Home Timezone: ${data.timezone}

Please welcome me and let me know how you can help with my trip planning.`;

    setTimeout(() => {
      sendMessage(welcomePrompt);
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  // Derive latest structured itinerary data from messages for contextual suggestions
  const latestItineraryData = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m: any = messages[i];
      if (m.itineraryData) return m.itineraryData;
    }
    return undefined;
  })();

  return (
    <div
      className="h-full flex flex-col relative overflow-hidden"
      suppressHydrationWarning
    >
      <style jsx global>{`
        :root {
          --accent: 147 51 234; /* purple-600 */
          --accent-foreground: 255 255 255; /* white */
        }
      `}</style>

      <AnimatedBackground
        windowDimensions={windowDimensions}
        mounted={mounted}
      />

      {/* User Menu */}
      <UserMenu />

      <div className="flex-1 min-h-0 relative z-10">
        {/* Live regions: polite (status updates) and assertive (errors) */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>
        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {assertiveMessage}
        </div>

        <ScrollArea
          className="h-full p-6"
          ref={scrollAreaRef}
          aria-label="Chat conversation"
        >
          <div
            className="max-w-4xl mx-auto space-y-6 pb-6"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {/* Authentication Loading State */}
            {/* {loading && (
              <div className="flex justify-center items-center min-h-[60vh]">
                <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-8 text-white shadow-2xl ring-1 ring-white/20">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                    <span className="text-lg text-white/80">
                      Loading TripSmith...
                    </span>
                  </div>
                </Card>
              </div>
            )} */}

            {/* Authentication Required State */}
            {!loading && !user && (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-full max-w-md">
                  <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-8 text-white shadow-2xl ring-1 ring-white/20 text-center">
                    <div className="flex flex-col items-center space-y-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4 mx-auto overflow-hidden">
                        <Image
                          src="/images/tripsmith-logo.png"
                          alt="TripSmith Logo"
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h2 className="text-2xl font-semibold text-white">
                        Welcome to TripSmith
                      </h2>
                      <p className="text-white/80 leading-relaxed">
                        AI-powered business trip planning. Sign in to start
                        creating personalized itineraries.
                      </p>

                      {/* Inline Auth Form */}
                      <div className="w-full">
                        <AuthModal
                          isOpen={true}
                          onClose={() => {}}
                          variant="inline"
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Main App Content - Only show when authenticated */}
            {!loading && user && (
              <>
                {showForm && <TripForm onSubmit={handleFormSubmit} />}

                <AnimatePresence>
                  {messages.map((message: Message, index: number) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      aria-posinset={index + 1}
                      aria-setsize={messages.length}
                    />
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <div
                    className="flex justify-start"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
                      <div className="flex items-center space-x-3">
                        <div className="relative" aria-hidden="true">
                          <Loader2
                            className="h-6 w-6 animate-spin text-purple-400"
                            aria-hidden="true"
                          />
                          <div
                            className="absolute -inset-1 rounded-full bg-purple-400/20 animate-pulse"
                            aria-hidden="true"
                          ></div>
                        </div>
                        <div>
                          <div className="text-base font-medium text-white">
                            Creating your perfect itinerary...
                          </div>
                          <div className="text-sm text-purple-300/80">
                            Finding flights, hotels, and activities ✈️
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {!loading && user && !showForm && (
        <div className="relative">
          {currentTripId && (
            <div className="px-6 pt-4 pb-2">
              <SuggestionBubblesBar
                tripId={currentTripId}
                destination={formData.destination}
                firstTravelDate={firstTravelDate}
                daySpan={tripDaySpan}
                itineraryData={latestItineraryData}
                onPrefillPrompt={(text) => {
                  setInput((prev) =>
                    prev ? prev.replace(/\s*$/, "\n") + text : text
                  );
                }}
                onApplyPrompt={(prompt) => {
                  sendMessage(prompt);
                }}
              />
            </div>
          )}
          {showSendDelay && (
            <div
              className="absolute -top-4 left-1 text-[10px] text-white/40 flex items-center gap-1"
              aria-live="polite"
            >
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/40" />
              thinking…
            </div>
          )}
          <ChatInput
            value={input}
            onChange={handleInputChange}
            onSend={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      )}

      <EarthVisualization mounted={mounted} isClient={isClient} />
    </div>
  );
}
