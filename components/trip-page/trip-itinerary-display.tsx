"use client";

import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ItineraryRenderer } from "@/components/itinerary-renderer";
import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import {
  CalendarDays,
  MapPin,
  Clock,
  Sparkles,
  Download,
  FileText,
  Calendar,
} from "lucide-react";

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
  tripId: string; // explicit trip context (fixes advisory fetch context)
}

export function TripItineraryDisplay({
  itineraryData,
  tripDetails,
  loading = false,
  hasMessages = false,
  tripId,
}: TripItineraryDisplayProps) {
  const { session } = useAuth(); // session retained in case future features need it (advisories removed)
  const [isExportingIcs, setIsExportingIcs] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExport = useCallback(
    async (format: "ics" | "pdf") => {
      const isCurrentlyExporting =
        format === "ics" ? isExportingIcs : isExportingPdf;
      if (!tripId || isCurrentlyExporting) return;

      const setExporting =
        format === "ics" ? setIsExportingIcs : setIsExportingPdf;
      setExporting(true);

      try {
        const response = await fetch(`/api/trips/${tripId}/export/${format}`);

        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`);
        }

        // Get filename from Content-Disposition header or create default
        const contentDisposition = response.headers.get("Content-Disposition");
        const filename =
          contentDisposition?.match(/filename="([^"]+)"/)?.[1] ||
          `trip_itinerary.${format}`;

        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error(`${format.toUpperCase()} export failed:`, error);
        // TODO: Show user-friendly error toast
      } finally {
        setExporting(false);
      }
    },
    [tripId, isExportingIcs, isExportingPdf]
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-white/70 text-lg">
            Creating your perfect itinerary...
          </p>
          <p className="text-white/50 text-sm mt-2">
            This may take a few moments
          </p>
        </div>
      </div>
    );
  }

  // If no itinerary data and no messages, show welcome state
  if (!itineraryData && !hasMessages) {
    return (
      <div className="h-full flex items-center justify-center p-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm sm:max-w-md w-full"
        >
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-6 sm:p-8">
            <div className="text-4xl sm:text-6xl mb-4">✈️</div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-3">
              Welcome to Your Trip
            </h3>
            <div className="space-y-2 text-sm text-white/70 mb-6">
              <div className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{tripDetails.destination}</span>
              </div>
              {tripDetails.travelDates && (
                <div className="flex items-center justify-center gap-2">
                  <CalendarDays className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{tripDetails.travelDates}</span>
                </div>
              )}
              {tripDetails.purpose && (
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{tripDetails.purpose}</span>
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
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <ScrollArea className="flex-1 h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 sm:p-4 lg:p-6"
        >
          {/* Trip Header */}
          <div className="mb-4 sm:mb-6">
            <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-4 sm:p-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Your Trip Itinerary
                </h2>
                <div className="space-y-1 text-white/70 text-sm mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{tripDetails.destination}</span>
                  </div>
                  {tripDetails.travelDates && (
                    <div className="flex items-center justify-center gap-2">
                      <CalendarDays className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {tripDetails.travelDates}
                      </span>
                    </div>
                  )}
                  {tripDetails.purpose && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="truncate">{tripDetails.purpose}</span>
                    </div>
                  )}
                </div>

                {/* Export Buttons */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    onClick={() => handleExport("ics")}
                    disabled={isExportingIcs}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 focus-ring-contrast"
                  >
                    {isExportingIcs ? (
                      <Download className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Calendar className="h-4 w-4" />
                    )}
                    Export Calendar
                  </Button>
                  <Button
                    onClick={() => handleExport("pdf")}
                    disabled={isExportingPdf}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 focus-ring-contrast"
                  >
                    {isExportingPdf ? (
                      <Download className="h-4 w-4 animate-pulse" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Export PDF
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Itinerary Content */}
          <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
            <ItineraryRenderer data={itineraryData} />
            {/* Advisories feature removed (panel intentionally omitted) */}
          </div>
        </motion.div>
      </ScrollArea>
    </div>
  );
}
