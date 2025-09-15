"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { tripService, Trip } from "@/lib/trip-service";
import { TripHistoryDashboard } from "@/components/trip-history-dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/animated-background";

export default function TripsPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Load trips data only when we have a user
  useEffect(() => {
    if (user) {
      const loadTrips = async () => {
        setTripsLoading(true);
        try {
          const userTrips = await tripService.getUserTrips(user.id);
          setTrips(userTrips);
        } catch (err) {
          console.error("Error loading trips:", err);
          setError("Failed to load your trips. Please try again.");
        } finally {
          setTripsLoading(false);
        }
      };

      loadTrips();
    }
  }, [user]);

  // Show loading while trips are being loaded
  if (tripsLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <Card className="p-8 bg-black/20 backdrop-blur-sm border-white/10">
          <LoadingSpinner />
          <p className="text-white/70 mt-4 text-center">
            Loading your trips...
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <Card className="p-8 bg-black/20 backdrop-blur-sm border-white/10">
          <p className="text-red-400 text-center">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="relative z-10">
        <TripHistoryDashboard
          user={user}
          trips={trips}
          onLocalDelete={(tripId) =>
            setTrips((prev) => prev.filter((t) => t.id !== tripId))
          }
          onLocalRestore={(tripObj) => setTrips((prev) => [tripObj, ...prev])}
          onReplaceTrips={(next) => setTrips(next)}
        />
      </div>
    </div>
  );
}
