import { TripDetails } from "@/components/trip-form";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  itineraryData?: any; // For structured itinerary data
  isItinerary?: boolean; // Flag to indicate this is a rendered itinerary
  isGeneratingItinerary?: boolean; // Flag to show loading animation
}

export const formatTripContext = (details: TripDetails): string => {
  const filledDetails = Object.entries(details).filter(
    ([_, value]) => value.trim() !== ""
  );
  if (filledDetails.length === 0) return "";

  const contextParts = [];
  if (details.destination) contextParts.push(`Destination: ${details.destination}`);
  if (details.travelDates) contextParts.push(`Dates: ${details.travelDates}`);
  if (details.purpose) contextParts.push(`Purpose: ${details.purpose}`);
  if (details.timezone) contextParts.push(`Home timezone: ${details.timezone}`);

  return contextParts.length > 0
    ? `\n\nTrip Details:\n${contextParts.join("\n")}`
    : "";
};

export const generateWelcomeMessage = (formData: TripDetails): Message => {
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: `# Welcome! 

I've received your trip details and I'm ready to help you plan your business trip${formData.destination ? ` to ${formData.destination}` : ""
      }. 

What would you like me to help you with? I can create detailed itineraries, recommend hotels, suggest restaurants, plan transportation, or answer any travel-related questions you have.`,
    timestamp: new Date(),
  };
};

export const generateItineraryResponse = (formData: TripDetails): Message => {
  const hasDetails = Object.values(formData).some(
    (value) => value.trim() !== ""
  );

  let responseContent = `# Your Business Trip Itinerary${formData.destination ? ` - ${formData.destination}` : ""
    }

Thank you for your inquiry! `;

  if (hasDetails) {
    responseContent += `Based on your trip details, here's a personalized travel plan:

**Trip Overview:**`;
    if (formData.destination)
      responseContent += `\n- **Destination:** ${formData.destination}`;
    if (formData.travelDates)
      responseContent += `\n- **Travel Dates:** ${formData.travelDates}`;
    if (formData.purpose)
      responseContent += `\n- **Purpose:** ${formData.purpose}`;
    if (formData.timezone)
      responseContent += `\n- **Home Timezone:** ${formData.timezone}`;

    responseContent += `

## Day 1 - Arrival
- **Morning**: Arrive at ${formData.destination || "destination"} airport
- **Afternoon**: Check into hotel, light lunch nearby
- **Evening**: Prepare for ${formData.purpose || "meetings"}, early rest

## Day 2 - Business Activities
- **9:00 AM**: ${formData.purpose || "Conference/Meeting"} #1
- **12:00 PM**: Business lunch with colleagues
- **2:00 PM**: ${formData.purpose || "Conference/Meeting"} #2
- **6:00 PM**: Networking event

## Recommendations
- **Hotels**: Business-friendly accommodations near your venue in ${formData.destination || "the area"
      }
- **Restaurants**: Professional dining options for client meetings
- **Transportation**: Efficient routes between locations${formData.timezone
        ? ` (considering your ${formData.timezone} timezone)`
        : ""
      }

*This itinerary is customized based on your specific travel preferences and business needs.*`;
  } else {
    responseContent += `Here's a general travel plan template:

## Day 1 - Arrival
- **Morning**: Arrive at destination airport
- **Afternoon**: Check into hotel, light lunch nearby
- **Evening**: Prepare for meetings, early rest

## Day 2 - Business Activities
- **9:00 AM**: Conference/Meeting #1
- **12:00 PM**: Business lunch with colleagues
- **2:00 PM**: Conference/Meeting #2
- **6:00 PM**: Networking event

## Recommendations
- **Hotels**: Business-friendly accommodations near your venue
- **Restaurants**: Professional dining options for client meetings
- **Transportation**: Efficient routes between locations

*Please provide more details about your trip for a more personalized itinerary!*`;
  }

  return {
    id: (Date.now() + 1).toString(),
    role: "assistant",
    content: responseContent,
    timestamp: new Date(),
  };
};
