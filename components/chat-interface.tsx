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
import { AnimatedBackground } from "@/components/animated-background";
import { EarthVisualization } from "@/components/earth-visualization";
import { UserMenu } from "@/components/user-menu";
import { generateWelcomeMessage, type Message } from "@/lib/chat-utils";
import { exportToPDF, testPDFLibraries } from "@/lib/pdf-utils";
import { tripService } from "@/lib/trip-service";
import { useAuth } from "@/components/auth-provider";
import { AuthModal } from "@/components/auth-modal";

interface ChatInterfaceProps {
  tripDetails?: TripDetails;
  resumeTripId?: string | null;
}

// Simple function to detect and extract JSON itinerary data
function extractItineraryData(content: string): {
  hasItinerary: boolean;
  itineraryData?: any;
  displayContent: string;
} {
  const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);

  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.type === "complete_itinerary") {
        // This is an itinerary - hide the JSON and return the data
        const beforeJson = content.substring(0, content.indexOf("```json"));
        return {
          hasItinerary: true,
          itineraryData: jsonData,
          displayContent:
            beforeJson.trim() || "Here's your complete itinerary:",
        };
      }
    } catch (e) {
      console.log("Failed to parse JSON:", e);
    }
  }

  return {
    hasItinerary: false,
    displayContent: content,
  };
}

export function ChatInterface({ resumeTripId }: ChatInterfaceProps) {
  const { user, loading } = useAuth();
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
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  });
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsClient(true);

    // Test PDF libraries when component mounts
    if (typeof window !== "undefined") {
      testPDFLibraries().then((result) => {
        console.log("PDF libraries test result:", result);
      });
    }
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
        }
      }
    };

    loadTrip();
  }, [resumeTripId, user, loading]);

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
          const hasJsonEnd =
            assistantMessage.includes("}```") ||
            assistantMessage.includes("}\n```");

          if (hasJsonStart && !hasJsonEnd) {
            // We're in the middle of JSON generation - show loading animation
            const preJsonContent = assistantMessage
              .substring(0, assistantMessage.indexOf("```json"))
              .trim();
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
          // If hasJsonStart && hasJsonEnd, we'll let the final processing handle it
        }
      }

      // After streaming is complete, check for itinerary data
      const itineraryResult = extractItineraryData(assistantMessage);

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
                  content: assistantMessage,
                  isGeneratingItinerary: false,
                }
              : msg
          )
        );
      }

      // Legacy handling for old hybrid format (can be removed later)
      let structuredData: any = null;
      let displayContent = assistantMessage;

      try {
        // Look for JSON blocks in the complete response
        const jsonMatch = assistantMessage.match(
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
        displayContent = assistantMessage;
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
          content: displayContent, // Save the markdown version
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
          setShowSavedIndicator(true);
          // Show success indicator for 2 seconds, then redirect to trip page
          setTimeout(() => {
            setShowSavedIndicator(false);
            router.push(`/trips/${currentTripId}`);
          }, 2000);
        }
      } else {
        console.log("No currentTripId - messages not saved");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I apologize, but I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (data: TripDetails, tripId?: string) => {
    setFormData(data);
    setCurrentTripId(tripId || null);
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

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
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
        {!showForm && (
          <div className="absolute top-6 left-6 z-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden bg-black/20 backdrop-blur-xl border border-white/30 shadow-lg ring-1 ring-white/20">
              <Image
                src="/images/tripsmith-logo.png"
                alt="TripSmith Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Trip saved indicator */}
            <AnimatePresence>
              {showSavedIndicator && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className="absolute top-14 left-0 bg-green-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md border border-green-400/50 shadow-lg"
                >
                  ✓ Trip saved
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <ScrollArea className="h-full p-6" ref={scrollAreaRef}>
          <div className="max-w-4xl mx-auto space-y-6 pb-6">
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
                  {messages.map((message: Message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <div className="flex justify-start">
                    <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                          <div className="absolute -inset-1 rounded-full bg-purple-400/20 animate-pulse"></div>
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
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSend={handleSubmit}
          isLoading={isLoading}
        />
      )}

      <EarthVisualization mounted={mounted} isClient={isClient} />
    </div>
  );
}
