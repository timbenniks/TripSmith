"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { tripService, Trip } from "@/lib/trip-service";
import { TripHistoryDashboard } from "@/components/trip-history-dashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/animated-background";
import { EarthVisualization } from "@/components/earth-visualization";

export default function TripsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 1200,
    height: 800,
  });
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

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
    // Check authentication
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setUser(user);
      await loadUserTrips(user.id);
    };

    checkAuth();
  }, [router]);

  const loadUserTrips = async (userId: string) => {
    try {
      setLoading(true);
      const userTrips = await tripService.getUserTrips(userId);
      setTrips(userTrips);
    } catch (err) {
      console.error("Error loading trips:", err);
      setError("Failed to load your trips. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTripSelect = (tripId: string) => {
    // Navigate to individual trip page
    router.push(`/trips/${tripId}`);
  };

  const handleNewTrip = () => {
    router.push("/");
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
              Loading your trips...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
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
            <p className="text-red-400 text-center">{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col relative"
      suppressHydrationWarning
    >
      <style jsx global>{`
        :root {
          --accent: 147 51 234; /* purple-600 */
          --accent-foreground: 255 255 255; /* white */
        }
      `}</style>

      {/* Fixed background elements */}
      <div className="fixed inset-0 z-0">
        <AnimatedBackground
          windowDimensions={windowDimensions}
          mounted={mounted}
        />

        <EarthVisualization mounted={mounted} isClient={isClient} />
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1">
        <TripHistoryDashboard
          user={user!}
          trips={trips}
          onTripSelect={handleTripSelect}
          onNewTrip={handleNewTrip}
          onRefresh={() => loadUserTrips(user!.id)}
        />
      </div>
    </div>
  );
}
