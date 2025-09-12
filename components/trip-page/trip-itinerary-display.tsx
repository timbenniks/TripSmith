"use client";

import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ItineraryRenderer } from "@/components/itinerary-renderer";
import { CalendarDays, MapPin, Clock, Sparkles } from "lucide-react";

interface TripDetails {
  timezone: string;
  destination: string;
  travelDates: string;
  purpose: string;
}

interface TripItineraryDisplayProps {
  itineraryData: any;
  tripDetails: TripDetails;
  loading?: boolean;
  hasMessages?: boolean;
}

export function TripItineraryDisplay({
  itineraryData,
  tripDetails,
  loading = false,
  hasMessages = false,
}: TripItineraryDisplayProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-white/70 text-lg">
            Creating your perfect itinerary...
          </p>
          <p className="text-white/50 text-sm mt-2">
            This may take a few moments
          </p>
        </motion.div>
      </div>
    );
  }

  // If no itinerary data and no messages, show welcome state
  if (!itineraryData && !hasMessages) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-8">
            <div className="text-6xl mb-4">✈️</div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Welcome to Your Trip
            </h3>
            <div className="space-y-2 text-sm text-white/70 mb-6">
              <div className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" />
                {tripDetails.destination}
              </div>
              {tripDetails.travelDates && (
                <div className="flex items-center justify-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {tripDetails.travelDates}
                </div>
              )}
              {tripDetails.purpose && (
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  {tripDetails.purpose}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 text-purple-300">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">
                Start chatting to build your itinerary
              </span>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // If messages exist but no itinerary data yet, show guidance
  if (!itineraryData && hasMessages) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-8">
            <div className="text-5xl mb-4">🗓️</div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Building Your Itinerary
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Continue the conversation to get a complete itinerary with
              flights, accommodation, and daily schedules.
            </p>
            <div className="text-xs text-white/50">
              Ask for specific recommendations or request a complete travel plan
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Render the actual itinerary
  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          {/* Trip Header */}
          <div className="mb-6">
            <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Your Trip Itinerary
                </h2>
                <div className="space-y-1 text-white/70">
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {tripDetails.destination}
                  </div>
                  {tripDetails.travelDates && (
                    <div className="flex items-center justify-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      {tripDetails.travelDates}
                    </div>
                  )}
                  {tripDetails.purpose && (
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      {tripDetails.purpose}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Itinerary Content */}
          <div className="space-y-6">
            <ItineraryRenderer data={itineraryData} />
          </div>
        </motion.div>
      </ScrollArea>
    </div>
  );
}
