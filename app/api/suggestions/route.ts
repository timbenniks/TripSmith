import { NextRequest } from 'next/server';
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
    const body = (await req.json()) as SuggestionRequestBody;
    const { tripId, context = {}, seeds = [], max } = body;
    if (!tripId) {
      return new Response(JSON.stringify({ error: 'tripId required' }), { status: 400 });
    }

    // Derive deterministic seeds if we have destination / travel dates
    const destination: string | undefined = context.destination || context.tripDestination;
    const firstDate: string | undefined = context.firstTravelDate || context.startDate;
    const daySpan: number | undefined = context.daySpan || context.tripLengthDays;

    let deterministicStrings: string[] = [];
    if (destination) {
      const det = buildDeterministicSeeds({ destination, firstTravelDate: firstDate, daySpan });
      deterministicStrings = consolidateSeedStrings(det);
    }

    const totalCap = adaptiveMax(daySpan, max);

    // MOCK: combine deterministic seeds + incoming seeds into suggestion objects.
    // Later: call model to enrich / expand.
    const baseStrings = [...new Set([...deterministicStrings, ...seeds])].slice(0, totalCap);

    const suggestions: Suggestion[] = baseStrings.map((text, idx) => {
      const isSeasonal = text.toLowerCase().startsWith('seasonal:');
      const isEtiquette = text.toLowerCase().startsWith('etiquette:');
      const isTransit = text.toLowerCase().startsWith('transit:');
      let type: Suggestion['type'] = 'other';
      if (isSeasonal) type = 'seasonal';
      else if (isEtiquette) type = 'etiquette';
      else if (isTransit) type = 'logistics';

      const cleaned = text.replace(/^(Seasonal|Etiquette|Transit):\s*/i, '');
      return {
        id: randomUUID(),
        type,
        title: cleaned.length > 48 ? cleaned.slice(0, 45).trim() + '…' : cleaned,
        detail: cleaned,
        actionPrompt: `Please refine the itinerary: ${cleaned}`,
        relevanceScore: 0.6 + (idx / (baseStrings.length + 5)),
        source: 'deterministic',
        tags: [type],
        createdAt: Date.now(),
      } satisfies Suggestion;
    });

    return new Response(JSON.stringify({ suggestions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Suggestions API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
