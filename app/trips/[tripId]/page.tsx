"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { tripService, Trip } from "@/lib/trip-service";
import { MatureTripPage } from "@/components/trip-page/mature-trip-page";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { user, loading: authLoading } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Handle auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Load trip data only when we have a user
  useEffect(() => {
    if (user && !authLoading && tripId && !hasStartedLoading) {
      setHasStartedLoading(true);
      const loadTrip = async () => {
        try {
          const tripData = await tripService.getTripById(tripId);

          if (!tripData) {
            setError("Trip not found");
            return;
          }

          // Verify the trip belongs to the current user
          if (tripData.user_id !== user.id) {
            setError("Trip not found");
            return;
          }

          setTrip(tripData);
        } catch (err) {
          console.error("Error loading trip:", err);
          setError("Failed to load trip. Please try again.");
        }
      };

      loadTrip();
    }
  }, [user, authLoading, tripId, hasStartedLoading]);

  const handleBackToTrips = () => {
    router.push("/trips");
  };

  // Determine loading state and message
  const isLoading =
    authLoading ||
    (user && !hasStartedLoading) ||
    (hasStartedLoading && !trip && !error);
  const loadingMessage = authLoading
    ? "Checking authentication..."
    : (user && !hasStartedLoading) || (hasStartedLoading && !trip && !error)
    ? "Loading your trip..."
    : "";

  // Show single loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col relative overflow-hidden">
        <AnimatedBackground
          windowDimensions={windowDimensions}
          mounted={mounted}
        />
        <div className="flex items-center justify-center h-full relative z-10">
          <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20 p-8">
            <LoadingSpinner />
            <p className="text-white/70 mt-4 text-center">{loadingMessage}</p>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="h-screen flex flex-col relative overflow-hidden">
        <AnimatedBackground
          windowDimensions={windowDimensions}
          mounted={mounted}
        />
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

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  // Only render MatureTripPage after trip data is loaded
  if (!trip) {
    return null;
  }

  // Convert trip data to the format expected by MatureTripPage
  const tripDetails = {
    timezone: "",
    destination: trip.destination,
    travelDates: trip.travel_dates?.formatted || "",
    purpose: trip.purpose,
  };

  return (
    <MatureTripPage
      tripId={tripId}
      initialTrip={trip}
      tripDetails={tripDetails}
    />
  );
}
