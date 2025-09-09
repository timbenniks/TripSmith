"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import Image from "next/image";
import { Clock, MapPin, CalendarIcon, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { tripService } from "@/lib/trip-service";

export interface TripDetails {
  timezone: string;
  destination: string;
  travelDates: string;
  purpose: string;
}

interface TripFormProps {
  onSubmit: (data: TripDetails, tripId?: string) => void;
}

export function TripForm({ onSubmit }: TripFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TripDetails>({
    timezone: "",
    destination: "",
    travelDates: "",
    purpose: "",
  });
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  // Update travel dates when date range changes
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      const formattedRange = `${format(
        dateRange.from,
        "MMM d, yyyy"
      )} - ${format(dateRange.to, "MMM d, yyyy")}`;
      setFormData((prev) => ({ ...prev, travelDates: formattedRange }));
    }
  }, [dateRange]);

  const handleSubmit = async () => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    setIsCreatingTrip(true);

    try {
      // Create trip in database
      const trip = await tripService.createTrip(user, formData);

      if (trip) {
        // Pass both trip data and trip ID to parent
        onSubmit(formData, trip.id);
      } else {
        console.error("Failed to create trip");
        // Still allow them to continue without saving
        onSubmit(formData);
      }
    } catch (error) {
      console.error("Error creating trip:", error);
      // Still allow them to continue without saving
      onSubmit(formData);
    } finally {
      setIsCreatingTrip(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center space-y-6"
    >
      <div className="text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4 mx-auto overflow-hidden">
          <Image
            src="/images/tripsmith-logo.png"
            alt="TripSmith Logo"
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-2xl font-semibold mb-2 text-white">
          Welcome to TripSmith
        </h2>
        <p className="max-w-md leading-relaxed text-white">
          Let's start by gathering some details about your business trip to
          create a personalized itinerary.
        </p>
      </div>

      <Card className="w-full max-w-md p-6 space-y-4 bg-black/20 backdrop-blur-2xl border border-white/30 shadow-2xl ring-1 ring-white/20">
        <h3 className="text-lg font-semibold text-white mb-[0]">
          Trip Details
        </h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="destination-input"
              className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer"
            >
              <MapPin className="h-4 w-4" />
              Destination
            </label>
            <Input
              id="destination-input"
              name="destination"
              placeholder="Where are you traveling?"
              value={formData.destination}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  destination: e.target.value,
                }))
              }
              className="bg-white/15 backdrop-blur-md border-white/40 focus:border-white/60 focus:bg-white/20 transition-all duration-300 text-white placeholder:text-white/70 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="travel-dates-button"
              className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer"
            >
              <CalendarIcon className="h-4 w-4" />
              Travel Dates
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="travel-dates-button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white/15 backdrop-blur-md border-white/40 hover:border-white/60 hover:bg-white/20 transition-all duration-300 text-white",
                    !dateRange.from && "text-white/70"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick your travel dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-slate-900/95 backdrop-blur-xl border-white/20 z-50"
                align="start"
              >
                <Calendar
                  mode="range"
                  selected={dateRange as any}
                  onSelect={setDateRange as any}
                  numberOfMonths={2}
                  className="[&_.rdp-day_selected]:bg-gradient-to-r [&_.rdp-day_selected]:from-purple-600 [&_.rdp-day_selected]:to-blue-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:border-purple-400/30 [&_.rdp-day_selected:hover]:from-purple-700 [&_.rdp-day_selected:hover]:to-blue-700 [&_.rdp-day_selected]:transition-all [&_.rdp-day_selected]:duration-500 [&_.rdp-day_selected]:shadow-lg [&_.rdp-day_selected:hover]:shadow-purple-500/25 [&_.rdp-range_middle]:bg-gradient-to-r [&_.rdp-range_middle]:from-purple-900/40 [&_.rdp-range_middle]:to-blue-950/50 [&_.rdp-range_middle]:text-white [&_.rdp-range_middle:hover]:from-purple-950/50 [&_.rdp-range_start]:bg-gradient-to-r [&_.rdp-range_start]:from-purple-600 [&_.rdp-range_start]:to-blue-600 [&_.rdp-range_end]:bg-gradient-to-r [&_.rdp-range_end]:from-purple-600 [&_.rdp-range_end]:to-blue-600"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="purpose-input"
              className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer"
            >
              <Briefcase className="h-4 w-4" />
              Purpose
            </label>
            <Input
              id="purpose-input"
              name="purpose"
              placeholder="Conference, meetings, etc."
              value={formData.purpose}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  purpose: e.target.value,
                }))
              }
              className="bg-white/15 backdrop-blur-md border-white/40 focus:border-white/60 focus:bg-white/20 transition-all duration-300 text-white placeholder:text-white/70 shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="timezone-input"
              className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              Home Timezone
            </label>
            <Input
              id="timezone-input"
              name="timezone"
              placeholder="e.g., EST, PST, GMT"
              value={formData.timezone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  timezone: e.target.value,
                }))
              }
              className="bg-white/15 backdrop-blur-md border-white/40 focus:border-white/60 focus:bg-white/20 transition-all duration-300 text-white placeholder:text-white/70 shadow-inner"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isCreatingTrip}
            className="w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 backdrop-blur-sm border-purple-500/40 text-white font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-500 relative overflow-hidden group cursor-pointer mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreatingTrip ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Trip...
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-all duration-700 transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]" />
                Start Planning My Trip
              </>
            )}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
