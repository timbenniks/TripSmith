"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRovingFocus } from "@/lib/use-roving-focus";
import { Suggestion, StructuredItinerary } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { logError } from "@/lib/error-logger";
import {
  buildContextualSuggestions,
  toCanonical,
  InternalSuggestion,
  useSuggestionEngine,
} from "@/lib/suggestions-utils";
import { FlightSegmentsForm } from "@/components/suggestions/flight-segments-form";
import { HotelDetailsForm } from "@/components/suggestions/hotel-details-form";
import { TravelDatesForm } from "@/components/suggestions/travel-dates-form";

interface SuggestionBubblesBarProps {
  tripId: string;
  destination: string;
  firstTravelDate?: string;
  daySpan?: number;
  itineraryData?: StructuredItinerary;
  onApplyPrompt: (prompt: string) => void; // direct send
  onPrefillPrompt?: (prompt: string) => void; // prefill into input only
  aiDirectives?: import("@/lib/types").UiDirectivesPayload; // optional AI supplied directives
  /** Optional count of user messages (to drive stale pendingRegen reminder) */
  userMessageCount?: number;
}

type State = "idle" | "loading" | "ready" | "error";

interface FlightSegment {
  id: string;
  direction: "outbound" | "inbound";
  flightNumber?: string;
  route?: string;
  depTime?: string;
  arrTime?: string;
}
interface HotelFormState {
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
}

// InternalSuggestion now imported from suggestions-utils

export function SuggestionBubblesBar({
  tripId,
  destination,
  firstTravelDate,
  daySpan,
  itineraryData,
  onApplyPrompt,
  onPrefillPrompt,
  aiDirectives,
  userMessageCount,
}: SuggestionBubblesBarProps) {
  const [state, setState] = useState<State>("idle");
  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([]);
  // Suggestions will be derived via useSuggestionEngine after prerequisite state is declared.
  const [activeForm, setActiveForm] = useState<
    "flight" | "hotel" | "dates" | null
  >(null);
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { id: Math.random().toString(36).slice(2), direction: "outbound" },
    { id: Math.random().toString(36).slice(2), direction: "inbound" },
  ]);
  const [hotelForm, setHotelForm] = useState<HotelFormState>({});
  const [datesForm, setDatesForm] = useState<{ start?: string; end?: string }>(
    {}
  );
  const [datesError, setDatesError] = useState<string>("");
  const [inferredDaySpan, setInferredDaySpan] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [flightAriaMessage, setFlightAriaMessage] = useState("");
  // Refs typed without nullable generic to align with extracted component prop types; runtime still guards null access.
  const addOutboundBtnRef = useRef<HTMLButtonElement>(null as any);
  const addInboundBtnRef = useRef<HTMLButtonElement>(null as any);
  // Track suggestion ids (contextual ids like ctx-flight) that have been used so we can optimistically hide them
  // We now store dismissal by canonical id (e.g. add_flights) instead of raw ctx-/ai- ids.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Track whether we have local pending edits that haven't triggered a full regeneration yet
  const [pendingRegen, setPendingRegen] = useState(false);
  // Record which specific logistic edit types were staged so we only hide those bubbles (not unrelated ones)
  const [stagedEdits, setStagedEdits] = useState<{
    flights?: boolean;
    hotel?: boolean;
    dates?: boolean;
  }>({});
  // Track when pendingRegen was first set (user message count snapshot)
  const [pendingRegenStartCount, setPendingRegenStartCount] = useState<
    number | null
  >(null);
  useEffect(() => {
    if (
      pendingRegen &&
      pendingRegenStartCount == null &&
      typeof userMessageCount === "number"
    ) {
      setPendingRegenStartCount(userMessageCount);
    }
    if (!pendingRegen) {
      setPendingRegenStartCount(null);
    }
  }, [pendingRegen, userMessageCount, pendingRegenStartCount]);
  const stalePending = useMemo(() => {
    if (
      !pendingRegen ||
      pendingRegenStartCount == null ||
      typeof userMessageCount !== "number"
    )
      return false;
    return userMessageCount - pendingRegenStartCount >= 3; // 3 user messages without regeneration
  }, [pendingRegen, pendingRegenStartCount, userMessageCount]);

  // ---------------- Inference Helpers ----------------
  // Attempt to infer a trip date range from existing itinerary header or flights
  const inferDateRange = useCallback((): { start?: string; end?: string } => {
    // 1. If itinerary header already has dates in a known "Start – End" pattern, try to parse
    const headerDates = itineraryData?.tripHeader?.dates;
    if (headerDates) {
      // Common separators: '-', '–', 'to'
      const parts = headerDates.split(/\s+[–-]|to\s+/i);
      if (parts.length >= 2) {
        const startRaw = parts[0].trim();
        const endRaw = parts[1].trim();
        // Very light heuristic: accept ISO-looking or YYYY/MM/DD or Month DD forms left as-is
        if (startRaw && endRaw) {
          return { start: startRaw, end: endRaw };
        }
      }
    }
    // 2. Try flights (assumes itinerary flights already structured)
    if (
      Array.isArray(itineraryData?.flights) &&
      itineraryData!.flights.length
    ) {
      const dates = itineraryData!.flights
        .map((f) => f.date)
        .filter(Boolean)
        .sort();
      if (dates.length) {
        return { start: dates[0], end: dates[dates.length - 1] };
      }
    }
    // 3. Fallback: derive from locally entered flight segments (not yet regenerated)
    // (We do not currently collect dates per segment, so nothing to infer here yet.)
    return {};
  }, [itineraryData]);

  // Prefill dates form when opened if empty
  useEffect(() => {
    if (activeForm === "dates" && !datesForm.start && !datesForm.end) {
      const inferred = inferDateRange();
      if (inferred.start || inferred.end) {
        setDatesForm((prev) => ({ ...prev, ...inferred }));
        setAnnounce(
          `Prefilled trip dates ${inferred.start || ""}$${
            inferred.end ? " to " + inferred.end : ""
          }`
        );
      }
    }
  }, [activeForm, datesForm.start, datesForm.end, inferDateRange]);

  // Prefill hotel form check-in/out if opening hotel form and fields blank
  useEffect(() => {
    if (activeForm === "hotel" && !hotelForm.checkIn && !hotelForm.checkOut) {
      const inferred = inferDateRange();
      if (inferred.start || inferred.end) {
        setHotelForm((prev) => ({
          ...prev,
          checkIn: inferred.start || prev.checkIn,
          checkOut: inferred.end || prev.checkOut,
        }));
        setAnnounce(
          `Prefilled hotel stay ${inferred.start || ""}$${
            inferred.end ? " to " + inferred.end : ""
          }`
        );
      }
    }
  }, [activeForm, hotelForm.checkIn, hotelForm.checkOut, inferDateRange]);

  // --- Auto-clear dismissed IDs if user deletes that itinerary section ---
  useEffect(() => {
    // Determine current presence of core sections
    const hasFlights = (itineraryData?.flights?.length || 0) > 0;
    const hasHotel = (itineraryData?.accommodation?.length || 0) > 0;
    const hasDates = Boolean(itineraryData?.tripHeader?.dates);
    const hasOutline = (itineraryData?.dailySchedule?.length || 0) > 0;
    const hasEtiquette = (itineraryData?.helpfulNotes?.length || 0) > 0;

    // Build a list of canonical ids that are currently absent (so suggestions should be eligible again)
    const resurrect: string[] = [];
    if (!hasFlights) resurrect.push("add_flights");
    if (!hasHotel) resurrect.push("add_hotel");
    if (!hasDates) resurrect.push("set_travel_dates");
    if (!hasOutline) resurrect.push("draft_daily_outline");
    if (!hasEtiquette) resurrect.push("add_etiquette_notes");

    if (resurrect.length === 0) return;
    // If any of these were previously dismissed, remove them from dismissal set
    setDismissedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      resurrect.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [itineraryData]);
  // (Canonical mapping now imported from utils – previous inline duplication removed)

  // Migration + load of dismissed ids
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ts-dismissed-${tripId}`);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        if (Array.isArray(arr)) {
          const migrated = new Set<string>();
          arr.forEach((id) => migrated.add(toCanonical(id)));
          setDismissedIds(migrated);
        }
      }
    } catch (_) {}
  }, [tripId]);
  // Persist when it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        `ts-dismissed-${tripId}`,
        JSON.stringify(Array.from(dismissedIds))
      );
    } catch (_) {}
  }, [dismissedIds, tripId]);
  const bubbleContainerRef = useRef<HTMLDivElement>(null);
  const bubbleButtonsRef = useRef<HTMLButtonElement[]>([]);
  const firstFlightFieldRef = useRef<HTMLInputElement>(null as any);
  const firstHotelFieldRef = useRef<HTMLInputElement>(null as any);
  const firstDatesFieldRef = useRef<HTMLInputElement>(null as any);

  // Fetch base suggestions (deterministic seeds) once
  useEffect(() => {
    if (state !== "idle") return;
    (async () => {
      setState("loading");
      try {
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            context: { destination, firstTravelDate, daySpan },
          }),
        });
        if (!res.ok) throw new Error("Failed suggestions fetch");
        const data = await res.json();
        setApiSuggestions(data.suggestions || []);
        setState("ready");
      } catch (e) {
        logError(e, {
          source: "SuggestionBubblesBar",
          extra: { phase: "fetch" },
        });
        setState("error");
      }
    })();
  }, [state, tripId, destination, firstTravelDate, daySpan]);

  // Contextual heuristics
  const contextual = useMemo<InternalSuggestion[]>(
    () =>
      buildContextualSuggestions({
        itineraryData,
        firstTravelDate,
        pendingRegen,
        stalePending,
      }),
    [itineraryData, firstTravelDate, pendingRegen, stalePending]
  );

  // Suggestions produced by engine hook
  // Invoke suggestion engine (centralized orchestration logic)
  const suggestions = useSuggestionEngine({
    contextual,
    apiSuggestions,
    aiDirectives,
    dismissedIds,
    pendingRegen,
    stagedEdits,
    itineraryData,
    onAnnounce: (msg) => setAnnounce(msg),
  });

  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const handleBubbleClick = (
    s: InternalSuggestion,
    el?: HTMLButtonElement | null
  ) => {
    if (el) lastTriggerRef.current = el;
    if (s.formKind === "flight") {
      if (activeForm === "flight") {
        setActiveForm(null);
      } else {
        setFlightSegments((segs) => {
          const hasOut = segs.some((g) => g.direction === "outbound");
          const hasIn = segs.some((g) => g.direction === "inbound");
          if (hasOut && hasIn && segs.length > 0) return segs;
          const next = [...segs];
          if (!hasOut)
            next.unshift({
              id: Math.random().toString(36).slice(2),
              direction: "outbound",
            });
          if (!hasIn)
            next.push({
              id: Math.random().toString(36).slice(2),
              direction: "inbound",
            });
          return next;
        });
        setActiveForm("flight");
      }
      return;
    }
    if (s.formKind === "hotel") {
      setActiveForm(activeForm === "hotel" ? null : "hotel");
      return;
    }
    if (s.formKind === "dates") {
      setActiveForm(activeForm === "dates" ? null : "dates");
      return;
    }
    const canonical = toCanonical(s.id);
    if (s.mode === "prefill" && onPrefillPrompt) {
      onPrefillPrompt(s.actionPrompt);
      if (
        canonical &&
        !canonical.startsWith("ctx-") &&
        !canonical.startsWith("ai-") &&
        canonical !== "ctx-regen"
      ) {
        setDismissedIds((prev) => new Set(prev).add(canonical));
      } else if (canonical) {
        setDismissedIds((prev) => new Set(prev).add(canonical));
      }
      return;
    }
    onApplyPrompt(s.actionPrompt);
    if (canonical && canonical !== "ctx-regen") {
      setDismissedIds((prev) => new Set(prev).add(canonical));
    }
    if (s.id === "ctx-regen" || s.id === "ctx-regen-reminder") {
      // After regeneration request, clear pendingRegen so reminder logic resets.
      setPendingRegen(false);
    }
  };

  // Restore focus to triggering bubble when closing a form
  useEffect(() => {
    if (activeForm === null && lastTriggerRef.current) {
      // Delay a tick to allow DOM to settle
      setTimeout(() => lastTriggerRef.current?.focus(), 10);
    }
  }, [activeForm]);

  const rovingKeyDown = useRovingFocus(bubbleButtonsRef);

  // Auto-focus first field when a form opens
  useEffect(() => {
    if (activeForm === "flight") {
      setTimeout(() => firstFlightFieldRef.current?.focus(), 10);
    } else if (activeForm === "hotel") {
      setTimeout(() => firstHotelFieldRef.current?.focus(), 10);
    } else if (activeForm === "dates") {
      setTimeout(() => firstDatesFieldRef.current?.focus(), 10);
    }
  }, [activeForm]);

  const submitFlightForm = () => {
    const meaningful = flightSegments.filter((s) => s.flightNumber?.trim());
    if (meaningful.length === 0) {
      setActiveForm(null);
      return;
    }
    // Canonical pipe-delimited format to reduce hallucination and make parsing deterministic.
    // Format per line (no surrounding JSON):
    // DIRECTION_INDEX | YYYY-MM-DD | FLIGHT_NUMBER | FROM->TO | DEP HH:MM | ARR HH:MM[+DAY_OFFSET]
    // Example: Outbound 1 | 2025-03-15 | KL861 | AMS->NRT | Dep 08:00 | Arr 15:30+1
    let outboundIdx = 0;
    let inboundIdx = 0;
    const lines = meaningful.map((seg) => {
      const idx = seg.direction === "outbound" ? ++outboundIdx : ++inboundIdx;
      const directionLabel =
        seg.direction === "outbound" ? "Outbound" : "Inbound";
      // Date not currently collected; placeholder kept empty for future expansion.
      const date = "";
      const flightNumber = (seg.flightNumber || "").trim();
      const route = (seg.route || "").replace(/\s+/g, "");
      const dep = seg.depTime ? `Dep ${seg.depTime}` : "";
      const arr = seg.arrTime ? `Arr ${seg.arrTime}` : "";
      // We do not attempt to calculate +day offset automatically here; user can append +1 manually if overnight.
      return [`${directionLabel} ${idx}`, date, flightNumber, route, dep, arr]
        .filter(Boolean)
        .join(" | ");
    });
    const guidance = `Each line above becomes ONE Flight object in order; do NOT merge or summarize. Only integrate into the flights array (no full itinerary JSON until user explicitly regenerates).`;
    const prompt = `Flight details to integrate (no full JSON yet). These may include connecting legs; preserve ordering exactly.\n${lines.join(
      "\n"
    )}\n${guidance}`;
    if (onPrefillPrompt) onPrefillPrompt(prompt);
    setPendingRegen(true);
    setStagedEdits((s) => ({ ...s, flights: true }));
    setDismissedIds((prev) => new Set(prev).add("add_flights"));
    setActiveForm(null);
    setFlightSegments([
      { id: Math.random().toString(36).slice(2), direction: "outbound" },
      { id: Math.random().toString(36).slice(2), direction: "inbound" },
    ]);
  };

  const submitHotelForm = () => {
    if (!hotelForm.hotelName) {
      setActiveForm(null);
      return;
    }
    const prompt = `Hotel details to integrate (no full JSON yet):\nHotel: ${
      hotelForm.hotelName
    }${hotelForm.checkIn ? `\nCheck-in: ${hotelForm.checkIn}` : ""}${
      hotelForm.checkOut ? `\nCheck-out: ${hotelForm.checkOut}` : ""
    }`.trim();
    if (onPrefillPrompt) onPrefillPrompt(prompt);
    setPendingRegen(true);
    setStagedEdits((s) => ({ ...s, hotel: true }));
    setDismissedIds((prev) => new Set(prev).add("add_hotel"));
    setActiveForm(null);
    setHotelForm({});
  };

  // Auto-correct reversed hotel range while typing
  useEffect(() => {
    if (hotelForm.checkIn && hotelForm.checkOut) {
      const inDate = new Date(hotelForm.checkIn);
      const outDate = new Date(hotelForm.checkOut);
      if (outDate < inDate) {
        setHotelForm((f) => ({
          checkIn: f.checkOut,
          checkOut: f.checkIn,
          hotelName: f.hotelName,
        }));
        setAnnounce("Swapped check-in and check-out to fix reversed stay");
      }
    }
  }, [hotelForm.checkIn, hotelForm.checkOut]);

  const submitDatesForm = () => {
    if (!datesForm.start && !datesForm.end) {
      setActiveForm(null);
      return;
    }
    const start = datesForm.start || datesForm.end!;
    const end = datesForm.end || datesForm.start!;
    // Compute span (inclusive days)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const spanDays =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
    if (spanDays < 1) {
      setDatesError("End date must be the same or after start date");
      return;
    }
    setInferredDaySpan(spanDays);
    const singleDay = spanDays === 1;
    const prompt = singleDay
      ? `Set trip dates (single-day). Date: ${start}. (Will request full itinerary later.)`
      : `Set trip dates: ${start} – ${end} spanning ${spanDays} days. (Will request full itinerary later.)`;
    if (onPrefillPrompt) onPrefillPrompt(prompt);
    setPendingRegen(true);
    setStagedEdits((s) => ({ ...s, dates: true }));
    setDismissedIds((prev) => new Set(prev).add("set_travel_dates"));
    setActiveForm(null);
    setDatesForm({});
    setDatesError("");
  };

  // Validate dates as user types
  useEffect(() => {
    if (datesForm.start && datesForm.end) {
      const startDate = new Date(datesForm.start);
      const endDate = new Date(datesForm.end);
      if (endDate < startDate) {
        // Auto-swap to correct obvious reversal while preserving user intent
        setDatesForm((f) => ({ start: f.end, end: f.start }));
        setAnnounce("Swapped start and end dates to fix reversed range");
        setDatesError("");
      } else {
        setDatesError("");
      }
    } else {
      setDatesError("");
    }
  }, [datesForm.start, datesForm.end]);

  // Auto-close dates form if dates already set in itinerary AND flights & hotel exist
  useEffect(() => {
    if (activeForm === "dates") {
      const flights = itineraryData?.flights?.length || 0;
      const hotels = itineraryData?.accommodation?.length || 0;
      const hasHeaderDates = Boolean(itineraryData?.tripHeader?.dates);
      if (hasHeaderDates && flights > 0 && hotels > 0) {
        setActiveForm(null);
      }
    }
  }, [activeForm, itineraryData]);

  return (
    <div
      className="w-full py-2 relative z-30"
      aria-label="Quick suggestions"
      role="region"
    >
      <div className="max-w-4xl mx-auto">
        <span className="sr-only" aria-live="polite">
          {announce}
        </span>
        <div
          className="flex flex-wrap gap-2"
          role="list"
          aria-label="Suggestion actions"
          ref={bubbleContainerRef}
          onKeyDown={(e) => {
            if (e.key === "Escape" && activeForm) {
              e.preventDefault();
              setActiveForm(null);
              return;
            }
            rovingKeyDown(e);
          }}
        >
          {state === "loading" && (
            <div className="flex items-center gap-2 text-[11px] text-white/60 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <LoadingSpinner size="sm" />
              <span>Loading ideas…</span>
            </div>
          )}
          {state === "error" && (
            <button
              onClick={() => setState("idle")}
              className="text-[11px] px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-200 hover:bg-red-600/30 transition-colors"
            >
              Retry suggestions
            </button>
          )}
          {state === "ready" &&
            suggestions.map((s: any, idx) => (
              <button
                key={s.id}
                ref={(el) => {
                  if (el) bubbleButtonsRef.current[idx] = el;
                }}
                onClick={(e) => handleBubbleClick(s, e.currentTarget)}
                role="listitem"
                className={
                  "group relative px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide border text-white/70 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer " +
                  (s.mode === "prefill"
                    ? "bg-purple-500/10 hover:bg-purple-500/20 border-purple-400/30"
                    : s._highlight
                    ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-white"
                    : "bg-white/5 hover:bg-white/10 border-white/15")
                }
                aria-haspopup={s.formKind ? "dialog" : undefined}
                aria-expanded={
                  s.formKind && activeForm === s.formKind ? true : undefined
                }
                aria-label={s.formKind ? `${s.title} form toggle` : s.title}
              >
                <span className="flex items-center gap-1">
                  {s.mode === "prefill" && (
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-purple-300"
                      aria-hidden="true"
                    />
                  )}
                  {s.title}
                  {s.mode === "prefill" && (
                    <span className="sr-only"> (prefill suggestion)</span>
                  )}
                </span>
              </button>
            ))}
        </div>
        {activeForm === "flight" && (
          <FlightSegmentsForm
            segments={flightSegments as any}
            onChange={setFlightSegments as any}
            onSubmit={submitFlightForm}
            onCancel={() => {
              setActiveForm(null);
              setFlightSegments([
                {
                  id: Math.random().toString(36).slice(2),
                  direction: "outbound",
                },
                {
                  id: Math.random().toString(36).slice(2),
                  direction: "inbound",
                },
              ]);
            }}
            onClose={() => setActiveForm(null)}
            firstFieldRef={firstFlightFieldRef}
            addOutboundBtnRef={addOutboundBtnRef}
            addInboundBtnRef={addInboundBtnRef}
            ariaMessage={flightAriaMessage}
            setAriaMessage={setFlightAriaMessage}
            setActiveForm={setActiveForm as any}
          />
        )}
        {activeForm === "hotel" && (
          <HotelDetailsForm
            value={hotelForm}
            onChange={setHotelForm}
            onSubmit={submitHotelForm}
            onCancel={() => {
              setActiveForm(null);
              setHotelForm({});
            }}
            onClose={() => setActiveForm(null)}
            firstFieldRef={firstHotelFieldRef}
            active={activeForm === "hotel"}
            inferDates={() => inferDateRange()}
            announce={(msg) => setAnnounce(msg)}
          />
        )}
        {activeForm === "dates" && (
          <TravelDatesForm
            value={datesForm}
            onChange={setDatesForm}
            onSubmit={submitDatesForm}
            onCancel={() => {
              setActiveForm(null);
              setDatesForm({});
            }}
            onClose={() => setActiveForm(null)}
            firstFieldRef={firstDatesFieldRef}
            error={datesError}
            inferredDaySpan={inferredDaySpan}
            setActiveForm={setActiveForm as any}
          />
        )}
      </div>
    </div>
  );
}
