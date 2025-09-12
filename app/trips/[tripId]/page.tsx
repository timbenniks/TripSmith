"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { tripService, Trip } from "@/lib/trip-service";
import { ChatInterface } from "@/components/chat-interface";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";
import { EarthVisualization } from "@/components/earth-visualization";

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  });
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

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
    const checkAuthAndLoadTrip = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setUser(user);
      await loadTrip(tripId, user.id);
    };

    if (tripId) {
      checkAuthAndLoadTrip();
    }
  }, [tripId, router]);

  const loadTrip = async (tripId: string, userId: string) => {
    try {
      setLoading(true);
      const tripData = await tripService.getTripById(tripId);

      if (!tripData) {
        setError("Trip not found");
        return;
      }

      // Verify the trip belongs to the current user
      if (tripData.user_id !== userId) {
        setError("Trip not found");
        return;
      }

      setTrip(tripData);
    } catch (err) {
      console.error("Error loading trip:", err);
      setError("Failed to load trip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTrips = () => {
    router.push("/trips");
  };

  if (loading) {
    return (
      <div
        className="h-screen flex flex-col relative overflow-hidden"
        suppressHydrationWarning
      >
        <AnimatedBackground
          windowDimensions={windowDimensions}
          mounted={mounted}
        />

        <EarthVisualization mounted={mounted} isClient={isClient} />

        <div className="flex items-center justify-center h-full relative z-10">
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-8">
            <LoadingSpinner />
            <p className="text-white/70 mt-4 text-center">
              Loading your trip...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div
        className="h-screen flex flex-col relative overflow-hidden"
        suppressHydrationWarning
      >
        <AnimatedBackground
          windowDimensions={windowDimensions}
          mounted={mounted}
        />

        <EarthVisualization mounted={mounted} isClient={isClient} />

        <div className="flex items-center justify-center h-full relative z-10">
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-8 text-center">
            <p className="text-red-400 mb-4">{error || "Trip not found"}</p>
            <Button
              onClick={handleBackToTrips}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trips
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Only render ChatInterface after trip data is loaded
  if (!trip) {
    return null; // This should never be reached due to the checks above, but just in case
  }

  // Convert trip data to the format expected by ChatInterface
  const tripDetails = {
    timezone: "",
    destination: trip.destination,
    travelDates: trip.travel_dates?.formatted || "",
    purpose: trip.purpose,
  };

  return (
    <div className="h-screen bg-background text-foreground">
      {/* Back to trips button - positioned below logo to avoid overlaps */}
      <div className="absolute top-20 left-4 z-50">
        <Button
          onClick={handleBackToTrips}
          variant="ghost"
          size="sm"
          className="bg-black/20 backdrop-blur-2xl border-white/30 text-white hover:bg-white/10 shadow-2xl ring-1 ring-white/20"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Trips
        </Button>
      </div>

      <ChatInterface tripDetails={tripDetails} resumeTripId={tripId} />
    </div>
  );
}
