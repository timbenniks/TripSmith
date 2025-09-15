import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { normalizeItineraryToEvents } from '@/lib/export-normalizer';
import { createEvents, EventAttributes } from 'ics';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch trip with ownership check
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', user.id)
      .single();

    if (error || !trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (!trip.itinerary_data) {
      return NextResponse.json(
        { error: 'No itinerary data available for export' },
        { status: 400 }
      );
    }

    // Normalize itinerary to events
    const normalized = normalizeItineraryToEvents(trip.itinerary_data);

    // Convert to ICS events
    const icsEvents: EventAttributes[] = normalized.events.map((event) => {
      const startArray: [number, number, number, number, number] = [
        event.start.getFullYear(),
        event.start.getMonth() + 1, // ICS months are 1-based
        event.start.getDate(),
        event.start.getHours(),
        event.start.getMinutes(),
      ];

      let endArray: [number, number, number, number, number] | undefined;
      if (event.end) {
        endArray = [
          event.end.getFullYear(),
          event.end.getMonth() + 1,
          event.end.getDate(),
          event.end.getHours(),
          event.end.getMinutes(),
        ];
      }

      const icsEvent: EventAttributes = {
        title: event.title,
        start: startArray,
        end: endArray,
        description: [
          event.notes && `Notes: ${event.notes}`,
          event.location && `Location: ${event.location}`,
          `Category: ${event.category}`,
        ].filter(Boolean).join('\n'),
        location: event.location,
        uid: event.id,
      };

      // Handle all-day events
      if (event.allDay) {
        icsEvent.start = [
          event.start.getFullYear(),
          event.start.getMonth() + 1,
          event.start.getDate(),
        ];
        if (event.end) {
          icsEvent.end = [
            event.end.getFullYear(),
            event.end.getMonth() + 1,
            event.end.getDate(),
          ];
        }
      }

      return icsEvent;
    });

    // Generate ICS content
    const { error: icsError, value: icsContent } = createEvents(icsEvents);

    if (icsError) {
      console.error('ICS generation error:', icsError);
      return NextResponse.json(
        { error: 'Failed to generate calendar file' },
        { status: 500 }
      );
    }

    // Return ICS as download
    const filename = `${normalized.meta.destination?.replace(/[^a-zA-Z0-9]/g, '_') || 'trip'}_itinerary.ics`;

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(icsContent, 'utf8').toString(),
      },
    });

  } catch (error) {
    console.error('ICS export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}
