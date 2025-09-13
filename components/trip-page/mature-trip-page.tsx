"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { tripService, Trip } from "@/lib/trip-service";
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
      const { content: finalContent, itineraryData } =
        await handleStreamingResponse(response, assistantMessageObj.id, {
          handleItineraryGeneration: true,
          onMessageUpdate: (messageId, content) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, content } : msg
              )
            );
          },
        });

      // Create final messages array
      const finalMessages = updatedMessages.concat([
        {
          ...assistantMessageObj,
          content: finalContent,
          itineraryData: itineraryData,
        },
      ]);

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

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this trip? This action cannot be undone."
      )
    ) {
      try {
        await tripService.deleteTrip(tripId);
        router.push("/trips");
      } catch (error) {
        console.error("Failed to delete trip:", error);
        alert("Failed to delete trip. Please try again.");
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentItinerary) {
      alert("No itinerary available to download.");
      return;
    }

    // TODO: Implement PDF generation from itinerary data
    console.log("PDF download not yet implemented");
    alert("PDF download feature coming soon!");
  };

  const handleShare = () => {
    // TODO: Implement sharing functionality
    console.log("Share functionality not yet implemented");
    alert("Share feature coming soon!");
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleItineraryUpdate = (itinerary: any) => {
    setCurrentItinerary(itinerary);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Content overlay */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* User Menu */}
        <UserMenu />

        {/* Header */}
        <TripActionsHeader
          tripName={trip.name}
          destination={trip.destination}
          onDelete={handleDelete}
          onDownloadPDF={handleDownloadPDF}
          onShare={handleShare}
          onBackToTrips={() => router.push("/trips")}
        />

        {/* Main Content - Two Panel Layout with proper height management */}
        <div className="flex-1 flex min-h-0 relative w-full px-2 sm:px-4 lg:px-8">
          <div className="flex w-full max-w-[1700px] 2xl:max-w-[1800px] mx-auto min-h-0 gap-4 xl:gap-6">
            {/* Left Sidebar - Chat */}
            <div
              className={`
                ${showItinerary ? "hidden lg:block" : "block"}
                lg:w-[500px] xl:w-[600px] 2xl:w-[660px]
                lg:min-w-[440px] lg:max-w-[700px] lg:flex-shrink-0
                w-full
                bg-black/20 backdrop-blur-2xl border-r border-white/30
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
              />
            </div>

            {/* Right Panel - Itinerary Display */}
            <div
              className={`
                ${showItinerary ? "block" : "hidden lg:block"}
                lg:flex-1 lg:min-w-0 flex flex-col min-h-0
                w-full h-full
                bg-black/20 backdrop-blur-2xl
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
              />
            </div>
          </div>

          {/* Mobile Toggle Button */}
          {(currentItinerary || messages.length > 0) && (
            <button
              onClick={() => setShowItinerary(!showItinerary)}
              className="lg:hidden fixed bottom-4 right-4 z-30 bg-purple-600/90 hover:bg-purple-700/90 text-white p-3 rounded-full shadow-xl transition-all duration-200 cursor-pointer backdrop-blur-sm border border-white/20 ring-2 ring-purple-400/20"
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
  );
}
