"use client";

import { useEffect, useState, useMemo } from "react";
import { Suggestion, StructuredItinerary } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { logError } from "@/lib/error-logger";

interface SuggestionBubblesBarProps {
  tripId: string;
  destination: string;
  firstTravelDate?: string;
  daySpan?: number;
  itineraryData?: StructuredItinerary;
  onApplyPrompt: (prompt: string) => void; // direct send
  onPrefillPrompt?: (prompt: string) => void; // prefill into input only
}

type State = "idle" | "loading" | "ready" | "error";

interface FlightFormState { departureFlight?: string; returnFlight?: string; departureTime?: string; returnTime?: string; }
interface HotelFormState { hotelName?: string; checkIn?: string; checkOut?: string; }

interface InternalSuggestion extends Suggestion { mode?: 'send' | 'prefill'; }

export function SuggestionBubblesBar({ tripId, destination, firstTravelDate, daySpan, itineraryData, onApplyPrompt, onPrefillPrompt }: SuggestionBubblesBarProps) {
  const [state, setState] = useState<State>('idle');
  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([]);
  const [suggestions, setSuggestions] = useState<InternalSuggestion[]>([]);
  const [activeForm, setActiveForm] = useState<'flight' | 'hotel' | null>(null);
  const [flightForm, setFlightForm] = useState<FlightFormState>({});
  const [hotelForm, setHotelForm] = useState<HotelFormState>({});
  const [announce, setAnnounce] = useState('');

  // Fetch base suggestions (deterministic seeds) once
  useEffect(() => {
    if (state !== 'idle') return;
    (async () => {
      setState('loading');
      try {
        const res = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, context: { destination, firstTravelDate, daySpan } })
        });
        if (!res.ok) throw new Error('Failed suggestions fetch');
        const data = await res.json();
        setApiSuggestions(data.suggestions || []);
        setState('ready');
      } catch (e) {
        logError(e, { source: 'SuggestionBubblesBar', extra: { phase: 'fetch' } });
        setState('error');
      }
    })();
  }, [state, tripId, destination, firstTravelDate, daySpan]);

  // Contextual heuristics
  const contextual = useMemo<InternalSuggestion[]>(() => {
    const list: InternalSuggestion[] = [];
    const flights = itineraryData?.flights?.length || 0;
    const hotels = itineraryData?.accommodation?.length || 0;
    const schedule = itineraryData?.dailySchedule?.length || 0;
    const notes = itineraryData?.helpfulNotes?.length || 0;

    if (flights === 0) list.push({ id: 'ctx-flight', type: 'logistics', title: 'Add flights', detail: 'Provide departure & return flight numbers and times', actionPrompt: 'I will supply my flight details next. Please be ready to integrate them precisely into the itinerary JSON.', relevanceScore: 0.9, source: 'deterministic', createdAt: Date.now(), formKind: 'flight', mode: 'send' });
    if (hotels === 0) list.push({ id: 'ctx-hotel', type: 'logistics', title: 'Add hotel', detail: 'Add hotel name & stay dates to anchor lodging context', actionPrompt: 'I will supply my hotel details next. Integrate them only into accommodation section of the itinerary JSON.', relevanceScore: 0.85, source: 'deterministic', createdAt: Date.now(), formKind: 'hotel', mode: 'send' });
    if (schedule === 0 && (flights > 0 || hotels > 0)) list.push({ id: 'ctx-outline', type: 'gap', title: 'Draft daily outline', detail: 'Generate concise day-by-day schedule scaffold.', actionPrompt: 'Please generate a concise day-by-day schedule outline for this trip. Use JSON itinerary format only (do not include prose).', relevanceScore: 0.7, source: 'deterministic', createdAt: Date.now(), mode: 'send' });
    if (notes === 0) list.push({ id: 'ctx-etiquette', type: 'etiquette', title: 'Local etiquette tips', detail: 'Add brief etiquette / business culture notes', actionPrompt: 'Add a helpfulNotes section with brief local etiquette and business meeting tips.', relevanceScore: 0.6, source: 'deterministic', createdAt: Date.now(), mode: 'send' });
    return list;
  }, [itineraryData]);

  // Merge & announce
  useEffect(() => {
    const merged: InternalSuggestion[] = [];
    const seen = new Set<string>();
    const push = (s: InternalSuggestion) => { if (!seen.has(s.title)) { seen.add(s.title); merged.push(s); } };
    contextual.forEach(push);
    apiSuggestions.forEach(s => push({ ...s, mode: 'send' }));
    setSuggestions(merged);
    if (merged.length) setAnnounce('Updated suggestions available');
  }, [contextual, apiSuggestions]);

  const handleBubbleClick = (s: InternalSuggestion) => {
    if (s.formKind === 'flight') { setActiveForm(activeForm === 'flight' ? null : 'flight'); return; }
    if (s.formKind === 'hotel') { setActiveForm(activeForm === 'hotel' ? null : 'hotel'); return; }
    if (s.mode === 'prefill' && onPrefillPrompt) { onPrefillPrompt(s.actionPrompt); return; }
    onApplyPrompt(s.actionPrompt);
  };

  const submitFlightForm = () => {
    if (!flightForm.departureFlight && !flightForm.returnFlight) { setActiveForm(null); return; }
    const prompt = `Here are my flight details. Please integrate or adjust existing itinerary times accordingly and respond with updated JSON only.\n\n${flightForm.departureFlight ? `Departure flight: ${flightForm.departureFlight} ${flightForm.departureTime || ''}` : ''}\n${flightForm.returnFlight ? `Return flight: ${flightForm.returnFlight} ${flightForm.returnTime || ''}` : ''}`.trim();
    onApplyPrompt(prompt);
    setActiveForm(null); setFlightForm({});
  };

  const submitHotelForm = () => {
    if (!hotelForm.hotelName) { setActiveForm(null); return; }
    const prompt = `Here are my hotel details. Please integrate or update only the accommodation section in JSON.\n\nHotel: ${hotelForm.hotelName}${hotelForm.checkIn ? `\nCheck-in: ${hotelForm.checkIn}` : ''}${hotelForm.checkOut ? `\nCheck-out: ${hotelForm.checkOut}` : ''}`.trim();
    onApplyPrompt(prompt);
    setActiveForm(null); setHotelForm({});
  };

  return (
    <div className="w-full py-2" aria-label="Quick suggestions" role="region">
      <span className="sr-only" aria-live="polite">{announce}</span>
      <div className="flex flex-wrap gap-2">
        {state === 'loading' && (
          <div className="flex items-center gap-2 text-[11px] text-white/60 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"><LoadingSpinner size="sm" /><span>Loading ideas…</span></div>
        )}
        {state === 'error' && (
          <button onClick={() => setState('idle')} className="text-[11px] px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-200 hover:bg-red-600/30 transition-colors">Retry suggestions</button>
        )}
        {state === 'ready' && suggestions.map(s => (
          <button
            key={s.id}
            onClick={() => handleBubbleClick(s)}
            className="group relative px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
            aria-haspopup={s.formKind ? 'dialog' : undefined}
            aria-expanded={s.formKind && activeForm === s.formKind ? true : undefined}
          >{s.title}</button>
        ))}
      </div>
      {activeForm === 'flight' && (
        <div className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3" aria-label="Flight details form">
          <div className="flex items-center justify-between"><h5 className="text-[12px] font-semibold text-white/80">Add Flight Details</h5><button onClick={() => setActiveForm(null)} className="text-[11px] text-white/50 hover:text-white/80" aria-label="Close flight details form">Close</button></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-white/40">Departure Flight</label>
              <input value={flightForm.departureFlight || ''} onChange={e => setFlightForm(f => ({ ...f, departureFlight: e.target.value }))} placeholder="e.g. KL 861 AMS→NRT" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <input value={flightForm.departureTime || ''} onChange={e => setFlightForm(f => ({ ...f, departureTime: e.target.value }))} placeholder="Dep time (local)" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-white/40">Return Flight</label>
              <input value={flightForm.returnFlight || ''} onChange={e => setFlightForm(f => ({ ...f, returnFlight: e.target.value }))} placeholder="e.g. KL 862 NRT→AMS" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" />
              <input value={flightForm.returnTime || ''} onChange={e => setFlightForm(f => ({ ...f, returnTime: e.target.value }))} placeholder="Return time (local)" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => { setActiveForm(null); setFlightForm({}); }} className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80">Cancel</button><button onClick={submitFlightForm} className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 border border-purple-400/40 text-white font-medium">Apply Flights</button></div>
        </div>
      )}
      {activeForm === 'hotel' && (
        <div className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3" aria-label="Hotel details form">
          <div className="flex items-center justify-between"><h5 className="text-[12px] font-semibold text-white/80">Add Hotel Details</h5><button onClick={() => setActiveForm(null)} className="text-[11px] text-white/50 hover:text-white/80" aria-label="Close hotel details form">Close</button></div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1 md:col-span-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Hotel Name</label><input value={hotelForm.hotelName || ''} onChange={e => setHotelForm(f => ({ ...f, hotelName: e.target.value }))} placeholder="e.g. Park Hyatt" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Check-in</label><input value={hotelForm.checkIn || ''} onChange={e => setHotelForm(f => ({ ...f, checkIn: e.target.value }))} placeholder="YYYY-MM-DD" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Check-out</label><input value={hotelForm.checkOut || ''} onChange={e => setHotelForm(f => ({ ...f, checkOut: e.target.value }))} placeholder="YYYY-MM-DD" className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-1"><button onClick={() => { setActiveForm(null); setHotelForm({}); }} className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80">Cancel</button><button onClick={submitHotelForm} className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 border border-purple-400/40 text-white font-medium">Apply Hotel</button></div>
        </div>
      )}
    </div>
  );
}
