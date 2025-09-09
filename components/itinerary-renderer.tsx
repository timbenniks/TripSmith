"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Trip Header */}
      <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Complete Trip Itinerary
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <span className="text-white/60">Traveler:</span>{" "}
              <span className="font-medium">
                {data.tripHeader.travelerName}
              </span>
            </div>
            <div>
              <span className="text-white/60">Destination:</span>{" "}
              <span className="font-medium">{data.tripHeader.destination}</span>
            </div>
            <div>
              <span className="text-white/60">Dates:</span>{" "}
              <span className="font-medium">{data.tripHeader.dates}</span>
            </div>
            {data.tripHeader.purpose && (
              <div>
                <span className="text-white/60">Purpose:</span>{" "}
                <span className="font-medium">{data.tripHeader.purpose}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Flight Schedule */}
      {data.flights && data.flights.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Flight Schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 text-white/80">Date</th>
                  <th className="text-left py-2 text-white/80">Flight</th>
                  <th className="text-left py-2 text-white/80">Route</th>
                  <th className="text-left py-2 text-white/80">Departure</th>
                  <th className="text-left py-2 text-white/80">Arrival</th>
                  <th className="text-left py-2 text-white/80">Terminal</th>
                </tr>
              </thead>
              <tbody>
                {data.flights.map((flight, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-3">{flight.date}</td>
                    <td className="py-3 font-medium text-blue-300">
                      {flight.flightNumber}
                    </td>
                    <td className="py-3">
                      {flight.route.from}-{flight.route.to}
                    </td>
                    <td className="py-3">{flight.departure}</td>
                    <td className="py-3">{flight.arrival}</td>
                    <td className="py-3">{flight.terminal || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Accommodation */}
      {data.accommodation && data.accommodation.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Accommodation
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 text-white/80">Property</th>
                  <th className="text-left py-2 text-white/80">Address</th>
                  <th className="text-left py-2 text-white/80">Check-in</th>
                  <th className="text-left py-2 text-white/80">Check-out</th>
                </tr>
              </thead>
              <tbody>
                {data.accommodation.map((hotel, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-3 font-medium text-green-300">
                      {hotel.property}
                    </td>
                    <td className="py-3">{hotel.address}</td>
                    <td className="py-3">{hotel.checkIn}</td>
                    <td className="py-3">{hotel.checkOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Daily Schedule */}
      {data.dailySchedule && data.dailySchedule.length > 0 && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">
            Daily Schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-2 text-white/80">Date</th>
                  <th className="text-left py-2 text-white/80">Time</th>
                  <th className="text-left py-2 text-white/80">Activity</th>
                  <th className="text-left py-2 text-white/80">Location</th>
                  <th className="text-left py-2 text-white/80">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.dailySchedule.map((item, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-3">{item.date}</td>
                    <td className="py-3 font-medium">{item.time}</td>
                    <td className="py-3 text-yellow-300">{item.activity}</td>
                    <td className="py-3">{item.location}</td>
                    <td className="py-3 text-white/70">{item.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommendations && (
        <Card className="bg-black/20 backdrop-blur-2xl border-white/30 p-6 text-white shadow-2xl ring-1 ring-white/20">
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
                      <th className="text-left py-2 text-white/80">
                        Restaurant
                      </th>
                      <th className="text-left py-2 text-white/80">Cuisine</th>
                      <th className="text-left py-2 text-white/80">
                        Price Range
                      </th>
                      <th className="text-left py-2 text-white/80">Location</th>
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
                      <span className="text-white/70 ml-2">
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
    </motion.div>
  );
}
