import { notFound, redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase-server";
import { MatureTripPage } from "@/components/trip-page/mature-trip-page";
import { Trip } from "@/lib/trip-service";
import { Metadata } from "next";

// Generate metadata for better SEO and social sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: "Trip Not Found - TripSmith",
    };
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("name, destination, purpose, travel_dates")
    .eq("id", tripId)
    .eq("user_id", user.id)
    .single();

  if (!trip) {
    return {
      title: "Trip Not Found - TripSmith",
    };
  }

  return {
    title: `${trip.name} - TripSmith`,
    description: `${trip.destination} trip${
      trip.purpose ? ` for ${trip.purpose}` : ""
    }${
      trip.travel_dates?.formatted ? ` • ${trip.travel_dates.formatted}` : ""
    }`,
  };
}

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await getServerClient();

  // Server-side auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Server-side trip fetch with ownership check
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .eq("user_id", user.id) // Ensure ownership
    .single();

  if (error || !trip) {
    return notFound();
  }

  // Convert to Trip type
  const tripData: Trip = {
    id: trip.id,
    user_id: trip.user_id,
    name: trip.name,
    destination: trip.destination,
    purpose: trip.purpose,
    status: trip.status,
    chat_history: trip.chat_history || [],
    itinerary_data: trip.itinerary_data,
    travel_dates: trip.travel_dates,
    preferences: trip.preferences || {}, // Add missing preferences property
    created_at: trip.created_at,
    updated_at: trip.updated_at,
  };

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
      initialTrip={tripData}
      tripDetails={tripDetails}
    />
  );
}
