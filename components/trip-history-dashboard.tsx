"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { Trip } from "@/lib/trip-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { TripCard } from "@/components/trip-card";

interface TripHistoryDashboardProps {
  user: User;
  trips: Trip[];
  onLocalDelete?: (tripId: string) => void; // optimistic removal
  onLocalRestore?: (trip: Trip) => void; // rollback
  onReplaceTrips?: (trips: Trip[]) => void; // future sorting updates
}

export function TripHistoryDashboard({
  user,
  trips,
  onLocalDelete,
  onLocalRestore,
  onReplaceTrips,
}: TripHistoryDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "planning" | "booked" | "completed"
  >("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "destination">(
    "updated"
  );
  const [announce, setAnnounce] = useState("");

  const [liveTrips, setLiveTrips] = useState<Trip[]>(trips);

  // Sync when incoming trips change (initial load only / external refresh)
  useEffect(() => {
    setLiveTrips(trips);
  }, [trips]);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<string | null>(null);

  const filteredTrips = useMemo(() => {
    let filtered = [...liveTrips];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.destination.toLowerCase().includes(q) ||
          trip.name.toLowerCase().includes(q) ||
          trip.purpose.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((trip) => trip.status === statusFilter);
    }
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
  }, [liveTrips, searchQuery, statusFilter, sortBy]);

  useEffect(() => {
    setAnnounce(
      filteredTrips.length === 0
        ? "No trips match current filters"
        : `${filteredTrips.length} trip${
            filteredTrips.length === 1 ? "" : "s"
          } shown`
    );
  }, [filteredTrips.length]);

  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Traveler";

  return (
    <div
      className="container mx-auto px-4 py-8 max-w-7xl"
      role="region"
      aria-labelledby="trip-history-heading"
    >
      {/* Live region for result announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full overflow-hidden bg-black/20 backdrop-blur-xl border border-white/30 shadow-lg ring-1 ring-white/20">
              <Image
                src="/images/tripsmith-logo.png"
                alt="TripSmith logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1
                id="trip-history-heading"
                className="text-3xl font-bold text-white mb-1"
              >
                Welcome back, {userName}!
              </h1>
              <p className="text-contrast-tertiary text-sm">
                {trips.length > 0
                  ? `You have ${trips.length} trip${
                      trips.length === 1 ? "" : "s"
                    } in your collection`
                  : "Ready to plan your next adventure?"}
              </p>
            </div>
          </div>
          <Link href="/">
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              aria-label="Create a new trip"
            >
              <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
              New Trip
            </Button>
          </Link>
        </div>

        {trips.length > 0 && (
          <Card
            className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-4"
            role="search"
            aria-label="Search and filter trips"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-contrast-tertiary"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Search trips by destination, purpose, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:placeholder-contrast"
                  aria-label="Search trips"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Filter trips by status"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="booked">Booked</option>
                <option value="completed">Completed</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Sort trips"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Recently Created</option>
                <option value="destination">Destination (A-Z)</option>
              </select>
            </div>
          </Card>
        )}
      </div>

      <div
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        role="list"
        aria-label="Trip list"
      >
        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => {
            return (
              <div key={trip.id} role="listitem" className="relative group">
                <Link
                  href={`/trips/${trip.id}`}
                  aria-label={`Open trip ${trip.name}`}
                  className="block"
                >
                  <TripCard trip={trip} onSelect={() => {}} />
                </Link>
                {/* Delete button removed per request */}
              </div>
            );
          })
        ) : (
          <div className="col-span-full">
            <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-8 text-center text-white">
              <p className="mb-4 text-contrast-tertiary">
                {trips.length > 0
                  ? "No trips match your filters. Try adjusting them."
                  : "You haven't created any trips yet."}
              </p>
              <Link href="/">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
                  Create your first trip
                </Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
      {/* Error region */}
      {lastError && (
        <div className="mt-6" aria-live="assertive">
          <Card className="bg-red-900/30 border-red-400/30 text-red-200 text-sm p-3">
            {lastError}
          </Card>
        </div>
      )}
      {lastError && (
        <div className="mt-6" aria-live="assertive">
          <Card className="bg-red-900/30 border-red-400/30 text-red-200 text-sm p-3">
            {lastError}
          </Card>
        </div>
      )}
    </div>
  );
}
