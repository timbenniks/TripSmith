/**
 * Export Normalizer (F3X-BE-1)
 *
 * Pure utilities to transform the stored itinerary JSON into a normalized
 * list of export-friendly events. This is shared by upcoming PDF and ICS
 * generators and designed to be resilient to partial or slightly varied
 * shapes in the itinerary.
 */

export type ExportEventCategory =
  | 'flight'
  | 'accommodation'
  | 'activity';

export interface ExportEvent {
  id: string;
  title: string;
  category: ExportEventCategory;
  start: Date;
  end?: Date; // Optional; many activities may be single timestamp only
  allDay?: boolean; // For stays or date-only items
  location?: string;
  notes?: string;
}

export interface NormalizedItineraryMeta {
  travelerName?: string;
  destination?: string;
  dateRangeText?: string; // Original header string (e.g., "March 15-22, 2025")
  lastUpdated?: string;
}

export interface NormalizedItinerary {
  meta: NormalizedItineraryMeta;
  events: ExportEvent[];
}

// ---------------- Date/Time helpers ----------------

function parseIsoDateOnly(dateString: string | undefined | null): Date | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function parseTimeToDateOnDay(dateString: string, timeString: string): Date | null {
  const day = parseIsoDateOnly(dateString);
  if (!day) return null;
  const trimmed = (timeString || '').trim();
  // Support HH:mm or H:mm and optional AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'AM' && hours === 12) hours = 0; // 12:xx AM → 0:xx
  if (meridiem === 'PM' && hours < 12) hours += 12; // 1-11 PM → 13-23

  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function toId(prefix: string): string {
  return `${prefix}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------- Core Normalizer ----------------

/**
 * Accepts the current stored itinerary JSON shape (as rendered by ItineraryRenderer)
 * and returns a normalized structure.
 *
 * Input is intentionally typed as `any` to be tolerant of slight schema drifts.
 */
export function normalizeItineraryToEvents(input: any): NormalizedItinerary {
  const events: ExportEvent[] = [];

  const meta: NormalizedItineraryMeta = {
    travelerName: safeString(input?.tripHeader?.travelerName),
    destination: safeString(input?.tripHeader?.destination),
    dateRangeText: safeString(input?.tripHeader?.dates),
    lastUpdated: safeString(input?.tripHeader?.lastUpdated),
  };

  // Flights → Prefer date-only start; attempt to parse time from free-form strings if present
  if (Array.isArray(input?.flights)) {
    for (const flight of input.flights) {
      const date = parseIsoDateOnly(flight?.date);
      if (!date) continue;
      const titleParts: string[] = [];
      if (safeString(flight?.flightNumber)) titleParts.push(String(flight.flightNumber));
      const from = safeString(flight?.route?.from);
      const to = safeString(flight?.route?.to);
      if (from && to) titleParts.push(`${from} → ${to}`);
      const title = titleParts.length > 0 ? `Flight ${titleParts.join(' ')}` : 'Flight';

      // Try to construct a more precise start time if departure looks like HH:mm
      let start = date;
      const maybeStart = safeString(flight?.departure)
        ? parseTimeToDateOnDay(flight.date, String(flight.departure).split(' ')[0])
        : null;
      if (maybeStart) start = maybeStart;

      // Try to set an end time one hour after start if we parsed a time; otherwise leave undefined
      const end = maybeStart ? addHours(start, 1) : undefined;

      events.push({
        id: toId('flight'),
        title,
        category: 'flight',
        start,
        end,
        allDay: !maybeStart,
        location: to ? `${from || ''}${from ? ' → ' : ''}${to}` : undefined,
        notes: safeString(flight?.terminal) ? `Terminal: ${flight.terminal}` : undefined,
      });
    }
  }

  // Accommodation → All-day span from check-in to check-out
  if (Array.isArray(input?.accommodation)) {
    for (const stay of input.accommodation) {
      const start = parseIsoDateOnly(stay?.checkIn);
      const end = parseIsoDateOnly(stay?.checkOut);
      if (!start) continue;
      const titleBase = safeString(stay?.property) || 'Accommodation';
      events.push({
        id: toId('stay'),
        title: titleBase,
        category: 'accommodation',
        start,
        end,
        allDay: true,
        location: safeString(stay?.address),
      });
    }
  }

  // Daily Activities → timestamped items; default to 1-hour duration when time is parseable
  if (Array.isArray(input?.dailySchedule)) {
    for (const item of input.dailySchedule) {
      const dateString = safeString(item?.date);
      const timeString = safeString(item?.time);
      if (!dateString) continue;

      let start: Date | null = null;
      let end: Date | undefined;
      if (timeString) {
        start = parseTimeToDateOnDay(dateString, timeString);
        if (start) end = addHours(start, 1);
      }
      if (!start) {
        // Fallback to date-only event
        const day = parseIsoDateOnly(dateString);
        if (!day) continue;
        start = day;
      }

      const title = safeString(item?.activity) || 'Activity';
      events.push({
        id: toId('activity'),
        title,
        category: 'activity',
        start,
        end,
        allDay: !timeString,
        location: safeString(item?.location),
        notes: safeString(item?.notes),
      });
    }
  }

  // Sort events chronologically (start ascending)
  events.sort((a, b) => a.start.getTime() - b.start.getTime());

  return { meta, events };
}

// Named export aliases for clarity in consumers
export const ExportNormalizer = {
  normalizeItineraryToEvents,
};


