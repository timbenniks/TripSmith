import { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';
import { jsonError } from '@/lib/api-errors';
import { randomUUID } from 'crypto';
import { buildDeterministicSeeds, consolidateSeedStrings } from '@/lib/suggestions-seeds';
import { Suggestion } from '@/lib/types';

export const maxDuration = 15; // shorter than chat

interface SuggestionRequestBody {
  tripId: string;
  context?: Record<string, any>;
  seeds?: string[];
  max?: number; // optional cap (default resolved via adaptive heuristic)
}

function adaptiveMax(daySpan?: number, explicit?: number) {
  if (explicit) return Math.min(explicit, 7);
  if (!daySpan || daySpan < 1) return 4;
  const calc = Math.ceil(daySpan * 1.2);
  return Math.max(3, Math.min(calc, 7));
}

export async function POST(req: NextRequest) {
  try {
    // Enforce authentication
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supabase = await getServerClient(token);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return jsonError('NO_SESSION', 'Authentication required', 401);
    }

    const body = (await req.json()) as SuggestionRequestBody;
    const { tripId, context = {}, seeds = [], max } = body;
    if (!tripId) {
      return new Response(JSON.stringify({ error: 'tripId required' }), { status: 400 });
    }

    // Derive deterministic seeds if we have destination / travel dates
    const destination: string | undefined = context.destination || context.tripDestination;
    const firstDate: string | undefined = context.firstTravelDate || context.startDate;
    const daySpan: number | undefined = context.daySpan || context.tripLengthDays;

    // New aggregated actionable suggestion generation (Set A)
    let deterministicStrings: string[] = [];
    let month: number | null = null;
    if (destination) {
      const det = buildDeterministicSeeds({ destination, firstTravelDate: firstDate, daySpan });
      month = det.month;
      deterministicStrings = consolidateSeedStrings(det);
    }
    const totalCap = adaptiveMax(daySpan, max);

    const seasonal: string[] = [];
    const etiquette: string[] = [];
    const transit: string[] = [];
    deterministicStrings.forEach(s => {
      const lower = s.toLowerCase();
      if (lower.startsWith('seasonal:')) seasonal.push(s.replace(/^[^:]+:\s*/i, ''));
      else if (lower.startsWith('etiquette:')) etiquette.push(s.replace(/^[^:]+:\s*/i, ''));
      else if (lower.startsWith('transit:')) transit.push(s.replace(/^[^:]+:\s*/i, ''));
    });

    const suggestions: Suggestion[] = [];
    const truncate = (text: string, maxLen = 140) => text.length > maxLen ? text.slice(0, maxLen - 1).trim() + '…' : text;

    if (seasonal.length) {
      const detail = truncate(seasonal.join('; '));
      suggestions.push({
        id: randomUUID(),
        type: 'seasonal',
        title: 'Seasonal timing considerations',
        detail,
        actionPrompt: `Adjust the itinerary for current seasonal factors (${detail}). Shift outdoor or energy-heavy activities to optimal times and add a concise seasonal note to helpfulNotes if absent.`,
        relevanceScore: 0.72,
        source: 'deterministic',
        tags: ['seasonal'],
        createdAt: Date.now(),
      });
    }
    if (etiquette.length) {
      const detail = truncate(etiquette.join('; '));
      suggestions.push({
        id: randomUUID(),
        type: 'etiquette',
        title: 'Local etiquette basics',
        detail,
        actionPrompt: `Add or refine a helpfulNotes entry with concise etiquette items (${detail}). Keep it business traveler focused.`,
        relevanceScore: 0.70,
        source: 'deterministic',
        tags: ['etiquette'],
        createdAt: Date.now(),
      });
    }
    if (transit.length) {
      const detail = truncate(transit.join('; '));
      suggestions.push({
        id: randomUUID(),
        type: 'logistics',
        title: 'Transit pass optimization',
        detail,
        actionPrompt: `Evaluate transit efficiency (${detail}). If beneficial, add a transportPlans entry with pass name, cost context, and when it saves money.`,
        relevanceScore: 0.68,
        source: 'deterministic',
        tags: ['transit'],
        createdAt: Date.now(),
      });
    }
    if (suggestions.length < totalCap && destination) {
      suggestions.push({
        id: randomUUID(),
        type: 'logistics',
        title: 'Add flight details',
        detail: 'Provide departure / return flight numbers & times to anchor itinerary timings.',
        actionPrompt: 'I will supply my flight details next. Please be ready to integrate them precisely into the itinerary JSON.',
        relevanceScore: 0.65,
        source: 'deterministic',
        tags: ['flight'],
        createdAt: Date.now(),
        formKind: 'flight'
      });
    }

    const final = suggestions.slice(0, totalCap);
    return new Response(JSON.stringify({ suggestions: final }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Suggestions API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
