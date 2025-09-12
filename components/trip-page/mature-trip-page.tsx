"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { tripService, Trip } from "@/lib/trip-service";
import { Message } from "@/components/message-bubble";
import { TripActionsHeader } from "./trip-actions-header";
import { TripChatSidebar } from "./trip-chat-sidebar";
import { TripItineraryDisplay } from "./trip-itinerary-display";
import { UserMenu } from "@/components/user-menu";
import { AnimatedBackground } from "@/components/animated-background";
import { EarthVisualization } from "@/components/earth-visualization";
import { testPDFLibraries } from "@/lib/pdf-utils";

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
        return {
          hasItinerary: true,
          itineraryData: jsonData,
          displayContent: content.replace(jsonMatch[0], "").trim(),
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
  const [showItinerary, setShowItinerary] = useState(false); // For mobile toggle
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  });
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // SSR safety and window dimensions
  useEffect(() => {
    setMounted(true);
    setIsClient(true);

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

  // Test PDF libraries on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      testPDFLibraries().then((result) => {
        console.log("PDF libraries test result:", result);
      });
    }
  }, []);

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
          tripDetails: tripDetails,
          tripId: tripId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
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

      // Handle streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        assistantMessage += chunk;

        // Update the message content
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageObj.id
              ? { ...msg, content: assistantMessage }
              : msg
          )
        );
      }

      // Process the final message for itinerary data
      const { hasItinerary, itineraryData } =
        extractItineraryData(assistantMessage);

      const finalMessages = updatedMessages.concat([
        {
          ...assistantMessageObj,
          content: assistantMessage,
          itineraryData: hasItinerary ? itineraryData : undefined,
        },
      ]);

      // Update current itinerary if we got new data
      if (hasItinerary && itineraryData) {
        setCurrentItinerary(itineraryData);

        // Save to database
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
      {/* Animated Background */}
      {mounted && isClient && (
        <AnimatedBackground
          windowDimensions={windowDimensions}
          mounted={mounted}
        />
      )}

      {/* Earth Visualization - Fixed positioning behind content */}
      {mounted && isClient && (
        <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[70%] w-[72rem] h-[72rem] z-0 pointer-events-none">
          <EarthVisualization mounted={mounted} isClient={isClient} />
        </div>
      )}

      {/* Content overlay with proper z-index */}
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
        <div className="flex-1 flex min-h-0 relative max-w-7xl mx-auto w-full">
          {/* Left Sidebar - Chat (30% on desktop, full width on mobile) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`
              w-full lg:w-[30%] lg:min-w-[380px] lg:max-w-[450px] 
              ${showItinerary ? "hidden lg:flex" : "flex"}
              bg-black/20 backdrop-blur-2xl border-r border-white/10
              flex-col h-full
            `}
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
          </motion.div>

          {/* Right Panel - Itinerary Display (70% on desktop, toggleable on mobile) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`
              lg:flex flex-1 min-w-0 
              ${
                showItinerary
                  ? "flex absolute inset-0 z-10 lg:relative lg:z-auto"
                  : "hidden lg:flex"
              }
              bg-black/10 backdrop-blur-xl
              flex-col h-full overflow-hidden
            `}
          >
            <TripItineraryDisplay
              itineraryData={currentItinerary}
              tripDetails={tripDetails}
              loading={isLoading}
              hasMessages={messages.length > 0}
            />
          </motion.div>

          {/* Mobile Toggle Button */}
          {currentItinerary && (
            <button
              onClick={() => setShowItinerary(!showItinerary)}
              className="lg:hidden fixed bottom-6 right-6 z-20 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors cursor-pointer backdrop-blur-sm border border-white/20"
            >
              {showItinerary ? "💬" : "📋"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
