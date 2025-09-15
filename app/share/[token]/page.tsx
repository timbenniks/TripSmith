import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase-server";
import { ItineraryRenderer } from "@/components/itinerary-renderer";
import { Card } from "@/components/ui/card";

type TripSnapshot = {
  id: string;
  name: string;
  destination: string;
  travel_dates?: { from?: string; to?: string; formatted?: string } | null;
  purpose?: string | null;
  status?: string | null;
  itinerary_data?: any | null;
  created_at: string;
  updated_at: string;
};

export default async function PublicSharePage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = await getServerClient();

  // Use secure RPC that is granted to anon
  const { data, error } = await supabase.rpc("get_trip_share", {
    p_token: params.token,
  });
  if (error || !data) {
    return notFound();
  }

  const snap: TripSnapshot = data.public_snapshot as any;
  if (!snap) {
    return notFound();
  }

  return (
    <div className="min-h-screen py-10 px-4 flex items-start justify-center">
      <div className="w-full max-w-4xl">
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 ring-1 ring-white/20 p-6 text-white">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">{snap.name}</h1>
            <p className="text-contrast-tertiary text-sm mt-1">
              {snap.destination}
              {snap.travel_dates?.formatted
                ? ` • ${snap.travel_dates.formatted}`
                : ""}
              {snap.purpose ? ` • ${snap.purpose}` : ""}
            </p>
          </div>
          {snap.itinerary_data ? (
            <ItineraryRenderer data={snap.itinerary_data} />
          ) : (
            <p className="text-contrast-tertiary">
              No itinerary available for this trip.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
