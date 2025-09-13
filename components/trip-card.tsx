"use client";

import { Trip } from "@/lib/trip-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  MessageSquare,
  Plane,
  Hotel,
  CalendarDays,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TripCardProps {
  trip: Trip;
  onSelect: () => void;
}

export function TripCard({ trip, onSelect }: TripCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "text-yellow-400 bg-yellow-400/20";
      case "booked":
        return "text-blue-400 bg-blue-400/20";
      case "completed":
        return "text-green-400 bg-green-400/20";
      default:
        return "text-gray-400 bg-gray-400/20";
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case "planning":
        return "🗓️";
      case "booked":
        return "✈️";
      case "completed":
        return "✅";
      default:
        return "📋";
    }
  };

  const lastUpdated = formatDistanceToNow(new Date(trip.updated_at), {
    addSuffix: true,
  });
  const messageCount = trip.chat_history?.length || 0;
  const hasItinerary =
    trip.itinerary_data && Object.keys(trip.itinerary_data).length > 0;

  // Try to extract travel dates
  const travelDates = trip.travel_dates?.formatted || "Dates TBD";

  return (
    <div>
      <Card
        className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 h-full cursor-pointer group hover:border-purple-400/50 transition-all duration-300"
        onClick={onSelect}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-purple-300 transition-colors">
                {trip.name}
              </h3>
              <div className="flex items-center text-white/70 text-sm mb-2">
                <MapPin className="h-4 w-4 mr-1" />
                {trip.destination}
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(
                trip.status
              )}`}
            >
              <span>{getStatusEmoji(trip.status)}</span>
              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
            </div>
          </div>

          {/* Travel Dates */}
          <div className="flex items-center text-white/60 text-sm mb-3">
            <Calendar className="h-4 w-4 mr-2" />
            {travelDates}
          </div>

          {/* Purpose */}
          <div className="text-white/80 text-sm mb-4 flex-1">
            <span className="font-medium">Purpose:</span> {trip.purpose}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-xs text-white/60 mb-4">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {messageCount} message{messageCount !== 1 ? "s" : ""}
            </div>
            {hasItinerary && (
              <div className="flex items-center gap-1 text-green-400">
                <CalendarDays className="h-3 w-3" />
                Itinerary
              </div>
            )}
          </div>

          {/* Itinerary Preview */}
          {hasItinerary && trip.itinerary_data && (
            <div className="bg-white/5 rounded-lg p-3 mb-4">
              <div className="text-xs text-white/70 mb-2">Quick Preview:</div>
              <div className="space-y-1">
                {trip.itinerary_data.flights &&
                  trip.itinerary_data.flights.length > 0 && (
                    <div className="flex items-center text-xs text-blue-300">
                      <Plane className="h-3 w-3 mr-1" />
                      {trip.itinerary_data.flights.length} flight
                      {trip.itinerary_data.flights.length !== 1 ? "s" : ""}
                    </div>
                  )}
                {trip.itinerary_data.accommodation &&
                  trip.itinerary_data.accommodation.length > 0 && (
                    <div className="flex items-center text-xs text-green-300">
                      <Hotel className="h-3 w-3 mr-1" />
                      {trip.itinerary_data.accommodation.length} accommodation
                      {trip.itinerary_data.accommodation.length !== 1
                        ? "s"
                        : ""}
                    </div>
                  )}
                {trip.itinerary_data.dailySchedule &&
                  trip.itinerary_data.dailySchedule.length > 0 && (
                    <div className="flex items-center text-xs text-yellow-300">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {trip.itinerary_data.dailySchedule.length} day
                      {trip.itinerary_data.dailySchedule.length !== 1
                        ? "s"
                        : ""}{" "}
                      planned
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center text-xs text-white/50">
              <Clock className="h-3 w-3 mr-1" />
              Updated {lastUpdated}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:text-purple-200 hover:bg-purple-500/20 p-2"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
