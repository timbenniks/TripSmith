"use client";

import { Card } from "@/components/ui/card";
import {
  buildGoogleFlightsUrl,
  buildGoogleMapsSearchUrl,
  buildHotelSearchUrl,
  buildTransitDirectionsUrl,
} from "@/lib/link-builders";
import { ExternalLink, Route } from "lucide-react";

interface ItineraryData {
  type: "complete_itinerary";
  tripHeader: {
    travelerName: string;
    destination: string;
    dates: string;
    purpose?: string;
    lastUpdated: string;
  };
  flights: Array<{
    date: string;
    flightNumber: string;
    route: { from: string; to: string };
    departure: string;
    arrival: string;
    terminal?: string;
  }>;
  accommodation: Array<{
    property: string;
    address: string;
    checkIn: string;
    checkOut: string;
    bookingReference?: string;
  }>;
  dailySchedule: Array<{
    date: string;
    time: string;
    activity: string;
    location: string;
    notes?: string;
  }>;
  recommendations?: {
    restaurants?: Array<{
      name: string;
      cuisine: string;
      priceRange: string;
      location: string;
    }>;
    transportation?: Array<{
      type: string;
      cost: string;
      notes: string;
    }>;
  };
}

interface ItineraryRendererProps {
  data: ItineraryData;
}

export function ItineraryRenderer({ data }: ItineraryRendererProps) {
  return (
    <div className="space-y-6 xl:space-y-8">
      {/* Trip Header */}
      <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 xl:p-8 text-white shadow-2xl ring-1 ring-white/20">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Complete Trip Itinerary
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <span className="text-contrast-tertiary">Traveler:</span>{" "}
              <span className="font-medium">
                {data.tripHeader.travelerName}
              </span>
            </div>
            <div>
              <span className="text-contrast-tertiary">Destination:</span>{" "}
              <span className="font-medium">{data.tripHeader.destination}</span>
            </div>
            <div>
              <span className="text-contrast-tertiary">Dates:</span>{" "}
              <span className="font-medium">{data.tripHeader.dates}</span>
            </div>
            {data.tripHeader.purpose && (
              <div>
                <span className="text-contrast-tertiary">Purpose:</span>{" "}
                <span className="font-medium">{data.tripHeader.purpose}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Flight Schedule */}
      {data.flights && data.flights.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 xl:p-7 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Flight Schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 text-contrast-secondary">
                    Date
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Flight
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Route
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Departure
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Arrival
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Terminal
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.flights.map((flight, index) => {
                  const flightsFlag =
                    process.env.NEXT_PUBLIC_DEEP_LINKS_ENABLED === "1";
                  const flightUrl = flightsFlag
                    ? buildGoogleFlightsUrl({
                        origin: flight.route.from,
                        destination: flight.route.to,
                        departDate: flight.date,
                      })
                    : null;
                  return (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-3">{flight.date}</td>
                      <td className="py-3 font-medium text-blue-300 flex items-center gap-2">
                        <span>{flight.flightNumber}</span>
                        {flightUrl && (
                          <a
                            href={flightUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open flight search ${flight.route.from} to ${flight.route.to}`}
                            className="text-white/50 hover:text-white transition-colors focus-ring-contrast rounded-sm"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3">
                        {flight.route.from}-{flight.route.to}
                      </td>
                      <td className="py-3">{flight.departure}</td>
                      <td className="py-3">{flight.arrival}</td>
                      <td className="py-3">{flight.terminal || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Accommodation */}
      {data.accommodation && data.accommodation.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 xl:p-7 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Accommodation
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 text-contrast-secondary">
                    Property
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Address
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Check-in
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Check-out
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.accommodation.map((hotel, index) => {
                  const linksFlag =
                    process.env.NEXT_PUBLIC_DEEP_LINKS_ENABLED === "1";
                  const hotelUrl = linksFlag
                    ? buildHotelSearchUrl({
                        property: hotel.property,
                        cityOrAddress: hotel.address,
                        checkIn: hotel.checkIn,
                        checkOut: hotel.checkOut,
                      })
                    : null;
                  return (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-3 font-medium text-green-300 flex items-center gap-2">
                        <span>{hotel.property}</span>
                        {hotelUrl && (
                          <a
                            href={hotelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open hotel search for ${hotel.property}`}
                            className="text-white/50 hover:text-white transition-colors focus-ring-contrast rounded-sm"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3">{hotel.address}</td>
                      <td className="py-3">{hotel.checkIn}</td>
                      <td className="py-3">{hotel.checkOut}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Daily Schedule */}
      {data.dailySchedule && data.dailySchedule.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 xl:p-7 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Daily Schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 text-contrast-secondary">
                    Date
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Time
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Activity
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Location
                  </th>
                  <th className="text-left py-2 text-contrast-secondary">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dailySchedule.map((item, index) => {
                  const linksFlag =
                    process.env.NEXT_PUBLIC_DEEP_LINKS_ENABLED === "1";
                  let mapsUrl: string | null = null;
                  let directionsUrl: string | null = null;
                  let originLabel: string | null = null;
                  if (linksFlag && item.location && item.location.length > 2) {
                    mapsUrl = buildGoogleMapsSearchUrl({
                      query: item.location,
                    });
                    // Use the first accommodation as origin if available
                    const origin =
                      Array.isArray(data.accommodation) &&
                      data.accommodation.length > 0
                        ? data.accommodation[0].address ||
                          data.accommodation[0].property
                        : null;
                    if (origin) {
                      originLabel =
                        data.accommodation[0].property ||
                        data.accommodation[0].address;
                      directionsUrl = buildTransitDirectionsUrl({
                        originQuery: origin,
                        destinationQuery: item.location,
                        mode: "transit",
                      });
                    }
                  }
                  return (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-3">{item.date}</td>
                      <td className="py-3 font-medium">{item.time}</td>
                      <td className="py-3 text-yellow-300">{item.activity}</td>
                      <td className="py-3 flex items-center gap-2">
                        <span>{item.location}</span>
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open map for ${item.location}`}
                            className="text-white/50 hover:text-white transition-colors focus-ring-contrast rounded-sm"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {directionsUrl && (
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Get transit directions from ${
                              originLabel || "your hotel"
                            } to ${item.location}`}
                            className="text-white/50 hover:text-white transition-colors focus-ring-contrast rounded-sm"
                          >
                            <Route className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="py-3 text-contrast-tertiary">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommendations && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 xl:p-7 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Recommendations
          </h2>

          {data.recommendations.restaurants && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 text-orange-300">
                Restaurants
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2 text-contrast-secondary">
                        Restaurant
                      </th>
                      <th className="text-left py-2 text-contrast-secondary">
                        Cuisine
                      </th>
                      <th className="text-left py-2 text-contrast-secondary">
                        Price Range
                      </th>
                      <th className="text-left py-2 text-contrast-secondary">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recommendations.restaurants.map(
                      (restaurant, index) => (
                        <tr key={index} className="border-b border-white/10">
                          <td className="py-3 font-medium">
                            {restaurant.name}
                          </td>
                          <td className="py-3">{restaurant.cuisine}</td>
                          <td className="py-3">{restaurant.priceRange}</td>
                          <td className="py-3">{restaurant.location}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.recommendations.transportation && (
            <div>
              <h3 className="text-lg font-medium mb-3 text-blue-300">
                Transportation
              </h3>
              <div className="space-y-2">
                {data.recommendations.transportation.map((transport, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{transport.type}</span>
                      <span className="text-contrast-tertiary ml-2">
                        {transport.notes}
                      </span>
                    </div>
                    <span className="text-green-300 font-medium">
                      {transport.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
