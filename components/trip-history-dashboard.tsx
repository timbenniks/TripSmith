"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { Trip } from "@/lib/trip-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  SortDesc,
} from "lucide-react";
import { TripCard } from "@/components/trip-card";

interface TripHistoryDashboardProps {
  user: User;
  trips: Trip[];
  onTripSelect: (tripId: string) => void;
  onNewTrip: () => void;
  onRefresh: () => void;
}

export function TripHistoryDashboard({
  user,
  trips,
  onTripSelect,
  onNewTrip,
  onRefresh,
}: TripHistoryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "planning" | "booked" | "completed"
  >("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "destination">(
    "updated"
  );

  // Filter and sort trips
  const filteredTrips = useMemo(() => {
    let filtered = trips;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.destination.toLowerCase().includes(query) ||
          trip.name.toLowerCase().includes(query) ||
          trip.purpose.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((trip) => trip.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "updated":
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        case "created":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "destination":
          return a.destination.localeCompare(b.destination);
        default:
          return 0;
      }
    });

    return filtered;
  }, [trips, searchQuery, statusFilter, sortBy]);

  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Traveler";

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden bg-black/20 backdrop-blur-xl border border-white/30 shadow-lg ring-1 ring-white/20">
              <Image
                src="/images/tripsmith-logo.png"
                alt="TripSmith Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-white/70">
              {trips.length > 0
                ? `You have ${trips.length} trip${
                    trips.length === 1 ? "" : "s"
                  } in your collection`
                : "Ready to plan your next adventure?"}
            </p>
          </div>
          <Button
            onClick={onNewTrip}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Trip
          </Button>
        </div>

        {/* Search and Filter Bar */}
        {trips.length > 0 && (
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  placeholder="Search trips by destination, purpose, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Date Created</option>
                <option value="destination">Destination</option>
              </select>
            </div>
          </Card>
        )}
      </div>

      {/* Trip Grid */}
      {filteredTrips.length === 0 ? (
        <div key="empty" className="text-center py-16">
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-12 max-w-md mx-auto">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery || statusFilter !== "all"
                ? "No trips found"
                : "No trips yet"}
            </h3>
            <p className="text-white/70 mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Start planning your first adventure!"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button
                onClick={onNewTrip}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Plan Your First Trip
              </Button>
            )}
          </Card>
        </div>
      ) : (
        <div
          key="grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTrips.map((trip, index) => (
            <div key={trip.id}>
              <TripCard trip={trip} onSelect={() => onTripSelect(trip.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
