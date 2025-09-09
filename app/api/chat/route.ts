import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

interface TripDetails {
  name: string;
  timezone: string;
  destination: string;
  travelDates: string;
  purpose: string;
}

export async function POST(req: Request) {
  try {
    // Create Supabase client with cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages, tripDetails, tripId } = await req.json() as {
      messages: any[],
      tripDetails?: TripDetails,
      tripId?: string
    };

    // Create a system prompt that includes trip context
    const systemPrompt = `You are TripSmith, a concise travel-planning assistant specializing in detailed, personalized itineraries for solo business travelers. You have extensive knowledge of destinations worldwide, including hotels, restaurants, attractions, transportation, and local customs.

Your approach is:
- Professional, efficient, and slightly conservative with solo traveler pacing
- Detail-oriented with practical, actionable advice
- Culturally aware and respectful
- Focused on progressive itinerary building with minimal follow-ups
- Avoid chit-chat and unnecessary permission requests

**Core Workflow:**
1. Begin by asking for **essential trip details** — destination, travel dates, and trip purpose first
2. Ask 1-2 questions at a time to gather context efficiently
3. Keep a visible checklist of missing fields
4. Confirm only critical items like flight numbers, addresses, or timezones
5. Also ask about events during the trip, their times, locations, and purposes (e.g., meetings, conferences, work blocks)
6. If there are still open questions, do not yet render the itinerary
7. When itinerary is ready, automatically generate final Markdown itinerary

**Final Itinerary Structure:**
1. **Trip Header** — traveler name (optional), destination, dates, timestamp of last update
2. **Flight Schedule** — Present as a table with columns: Date | Flight | Route | Departure | Arrival | Terminal | Links. Include **Google Flights links** for flight numbers. Use **[Flight number needed]** placeholders when missing
3. **Accommodation** — Present as a table with columns: Property | Address | Check-in | Check-out | Contact | Links. Include **Google Maps links** for addresses
4. **Ground Transport Plans** — Present as a table with columns: Route | Primary Option | Estimated Time | Fallback Option | Notes. Apply buffers: +20% ride-hail, +15% metro; +15-30 min for rush hours
5. **Daily Schedule** — Present as a table with columns: Time | Activity/Event | Location | Duration | Travel Buffer | Notes. Include meetings, meals, work blocks with travel buffers between venues
6. **Expense Overview** — Present as a table with columns: Category | Estimated Cost | Notes | Tips. Include conservative costs, surge windows, tipping norms
7. **Helpful Notes** — Present as a table with columns: Category | Information | Tips. Include airport tips, neighborhood safety, weather, clearly labeled placeholders

**Timing Buffers:** 90 min domestic flights or flights within Europe, 180 min intercontinental flights; +20% ride-hail, +15% metro; +15-30 min rush hours
**Linking Rules:** Flight numbers → Google Flights; Venues/addresses → Google Maps; Never invent details
**Timezone Helpers:** Show local vs. home time for flights and first-day events (e.g., "08:30 (NYC 03:30)")
**Expense Guidance:** Conservative costs, surge windows, tipping norms, per-diem tracking if budget shared

${tripDetails ? `Current trip context:
${Object.entries(tripDetails)
          .filter(([_, value]) => value && typeof value === 'string' && value.trim() !== '')
          .map(([key, value]) => {
            const label = key === 'name' ? 'Traveler' :
              key === 'destination' ? 'Destination' :
                key === 'travelDates' ? 'Travel Dates' :
                  key === 'purpose' ? 'Trip Purpose' :
                    key === 'timezone' ? 'Home Timezone' : key;
            return `${label}: ${value}`;
          })
          .join('\n')}` : ''}

Always respond in markdown format and maintain the helpful, professional tone that travelers expect from a premium travel planning service.`;

    const result = await streamText({
      model: openai('gpt-4.1'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
