"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRovingFocus } from "@/lib/use-roving-focus";
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
  aiDirectives?: import("@/lib/types").UiDirectivesPayload; // optional AI supplied directives
}

type State = "idle" | "loading" | "ready" | "error";

interface FlightFormState {
  departureFlight?: string;
  returnFlight?: string;
  departureTime?: string;
  returnTime?: string;
}
interface HotelFormState {
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
}

interface InternalSuggestion extends Suggestion {
  mode?: "send" | "prefill";
}

export function SuggestionBubblesBar({
  tripId,
  destination,
  firstTravelDate,
  daySpan,
  itineraryData,
  onApplyPrompt,
  onPrefillPrompt,
  aiDirectives,
}: SuggestionBubblesBarProps) {
  const [state, setState] = useState<State>("idle");
  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([]);
  const [suggestions, setSuggestions] = useState<InternalSuggestion[]>([]);
  const [activeForm, setActiveForm] = useState<
    "flight" | "hotel" | "dates" | null
  >(null);
  const [flightForm, setFlightForm] = useState<FlightFormState>({});
  const [hotelForm, setHotelForm] = useState<HotelFormState>({});
  const [datesForm, setDatesForm] = useState<{ start?: string; end?: string }>(
    {}
  );
  const [datesError, setDatesError] = useState<string>("");
  const [inferredDaySpan, setInferredDaySpan] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  // Track suggestion ids (contextual ids like ctx-flight) that have been used so we can optimistically hide them
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Track whether we have local pending edits that haven't triggered a full regeneration yet
  const [pendingRegen, setPendingRegen] = useState(false);
  // Rehydrate dismissedIds per trip from localStorage (simple persistence so bubbles stay gone)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ts-dismissed-${tripId}`);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        if (Array.isArray(arr)) setDismissedIds(new Set(arr));
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
  const firstFlightFieldRef = useRef<HTMLInputElement>(null);
  const firstHotelFieldRef = useRef<HTMLInputElement>(null);
  const firstDatesFieldRef = useRef<HTMLInputElement>(null);

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
  const contextual = useMemo<InternalSuggestion[]>(() => {
    const list: InternalSuggestion[] = [];
    const flights = itineraryData?.flights?.length || 0;
    const hotels = itineraryData?.accommodation?.length || 0;
    const schedule = itineraryData?.dailySchedule?.length || 0;
    const notes = itineraryData?.helpfulNotes?.length || 0;
    const hasHeaderDates = Boolean(itineraryData?.tripHeader?.dates);

    if (!hasHeaderDates && !firstTravelDate) {
      list.push({
        id: "ctx-dates",
        type: "logistics",
        title: "Set travel dates",
        detail: "Define start & end to anchor itinerary",
        actionPrompt: "I will provide the trip start and end dates next.",
        relevanceScore: 0.95,
        source: "deterministic",
        createdAt: Date.now(),
        formKind: "dates",
        mode: "send",
      });
    }

    if (flights === 0)
      list.push({
        id: "ctx-flight",
        type: "logistics",
        title: "Add flights",
        detail: "Provide departure & return flight numbers and times",
        actionPrompt:
          "I will supply my flight details next. Please be ready to integrate them precisely into the itinerary JSON.",
        relevanceScore: 0.9,
        source: "deterministic",
        createdAt: Date.now(),
        formKind: "flight",
        mode: "send",
      });
    if (hotels === 0)
      list.push({
        id: "ctx-hotel",
        type: "logistics",
        title: "Add hotel",
        detail: "Add hotel name & stay dates to anchor lodging context",
        actionPrompt:
          "I will supply my hotel details next. Integrate them only into accommodation section of the itinerary JSON.",
        relevanceScore: 0.85,
        source: "deterministic",
        createdAt: Date.now(),
        formKind: "hotel",
        mode: "send",
      });
    if (schedule === 0 && (flights > 0 || hotels > 0))
      list.push({
        id: "ctx-outline",
        type: "gap",
        title: "Draft daily outline",
        detail: "Generate concise day-by-day schedule scaffold.",
        actionPrompt:
          "Please generate a concise day-by-day schedule outline for this trip. Use JSON itinerary format only (do not include prose).",
        relevanceScore: 0.7,
        source: "deterministic",
        createdAt: Date.now(),
        mode: "send",
      });
    if (notes === 0)
      list.push({
        id: "ctx-etiquette",
        type: "etiquette",
        title: "Local etiquette tips",
        detail: "Add brief etiquette / business culture notes",
        actionPrompt:
          "Add a helpfulNotes section with brief local etiquette and business meeting tips.",
        relevanceScore: 0.6,
        source: "deterministic",
        createdAt: Date.now(),
        mode: "send",
      });

    // Regenerate itinerary bubble (shown when itinerary exists OR pending local edits need consolidation)
    if (
      (itineraryData && flights + hotels + schedule + notes > 0) ||
      pendingRegen
    ) {
      list.push({
        id: "ctx-regen",
        type: "logistics",
        title: pendingRegen
          ? "Regenerate itinerary (apply edits)"
          : "Regenerate itinerary",
        detail: pendingRegen
          ? "Create updated full JSON with recent edits"
          : "Refresh full structured plan",
        actionPrompt:
          "Please return the full updated itinerary as a single JSON code block (type: complete_itinerary) with all sections preserved. Respond with ONLY the JSON.",
        relevanceScore: 0.99,
        source: "deterministic",
        createdAt: Date.now(),
        mode: "send",
      });
    }
    return list;
  }, [itineraryData, pendingRegen]);

  // Merge & announce (hash diff + debounce to reduce a11y noise)
  const prevHashRef = useRef<string>("");
  const announceTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // Base merge
    let base: InternalSuggestion[] = [];
    const seenByTitle = new Set<string>();
    const push = (s: InternalSuggestion) => {
      if (!seenByTitle.has(s.title)) {
        seenByTitle.add(s.title);
        base.push(s);
      }
    };
    contextual.forEach((s) => {
      // Force hide if previously dismissed OR if logically obsolete (e.g., hotel just supplied via prefill and pending regen)
      if (dismissedIds.has(s.id)) return;
      if (
        pendingRegen &&
        (s.id === "ctx-hotel" || s.id === "ctx-flight" || s.id === "ctx-dates")
      ) {
        // User provided data but hasn't regenerated; don't nag.
        return;
      }
      push(s);
    });
    apiSuggestions.forEach((s) => {
      // Suppression rules for aggregated deterministic suggestions
      if (s.source === "deterministic") {
        const lowerTitle = s.title.toLowerCase();
        const notesText = (itineraryData?.helpfulNotes || [])
          .map((n: any) =>
            `${n.category} ${n.information} ${n.tips || ""}`.toLowerCase()
          )
          .join(" ");
        const hasCoreScaffold =
          Boolean(itineraryData?.tripHeader?.dates) &&
          ((itineraryData?.flights && itineraryData.flights.length > 0) ||
            (itineraryData?.accommodation &&
              itineraryData.accommodation.length > 0));
        // Delay seasonal / etiquette / transit until some scaffold exists or user has pending regen (meaning they've begun supplying data)
        if (
          !hasCoreScaffold &&
          !pendingRegen &&
          (lowerTitle.includes("seasonal timing") ||
            lowerTitle.includes("local etiquette") ||
            lowerTitle.includes("transit pass"))
        ) {
          return; // suppress early noise
        }
        // Suppress if already covered in helpfulNotes heuristically
        if (notesText) {
          if (
            lowerTitle.includes("etiquette") &&
            /etiquette|culture|meeting/i.test(notesText)
          )
            return;
          if (
            lowerTitle.includes("seasonal") &&
            /season|weather|climate/i.test(notesText)
          )
            return;
          if (
            lowerTitle.includes("transit") &&
            /transport|transit|metro|pass|card/i.test(notesText)
          )
            return;
        }
      }
      push({ ...s, mode: "send" });
    });

    // Apply AI directives if present
    if (aiDirectives?.suggestions?.length) {
      const actionsById = new Map(
        aiDirectives.suggestions.map((d) => [d.id, d.actions])
      );
      // Map known heuristic ids -> canonical ids used by AI
      const idResolver = (
        suggestion: InternalSuggestion
      ): string | undefined => {
        switch (suggestion.id) {
          case "ctx-dates":
            return "set_travel_dates";
          case "ctx-flight":
            return "add_flights";
          case "ctx-hotel":
            return "add_hotel";
          case "ctx-outline":
            return "draft_daily_outline";
          case "ctx-etiquette":
            return "add_etiquette_notes";
          default:
            return undefined;
        }
      };

      // First pass: filter & transform existing
      base = base
        .map((s) => {
          const canonical = idResolver(s);
          if (!canonical) return s;
          const actions = actionsById.get(canonical);
          if (!actions) return s;
          if (actions.includes("hide")) return { ...s, _hidden: true } as any;
          let mode: InternalSuggestion["mode"] | undefined = s.mode;
          if (actions.includes("prefillMode")) mode = "prefill";
          if (actions.includes("sendMode")) mode = "send";
          return {
            ...s,
            mode,
            _highlight: actions.includes("highlight"),
          } as any;
        })
        .filter((s: any) => !s._hidden);

      // Order hints (bring hinted ids to front in order)
      if (aiDirectives.orderingHints?.length) {
        const order = aiDirectives.orderingHints;
        const ranked: InternalSuggestion[] = [];
        const rest: InternalSuggestion[] = [];
        base.forEach((s) => {
          const cid = idResolver(s);
          const idx = cid ? order.indexOf(cid) : -1;
          if (idx >= 0) {
            // Insert respecting order array sequence
            ranked[idx] = ranked[idx] || s;
          } else rest.push(s);
        });
        base = ranked.filter(Boolean).concat(rest);
      }

      // Add any directive referencing IDs we do not currently show but are told to show
      aiDirectives.suggestions.forEach((d) => {
        if (!d.actions.includes("show")) return;
        const already = base.some((s) => {
          const cid = idResolver(s);
          return cid === d.id;
        });
        if (already) return;
        const meta: Record<
          string,
          {
            title: string;
            detail: string;
            action: string;
            type?: InternalSuggestion["type"];
          }
        > = {
          set_travel_dates: {
            title: "Set travel dates",
            detail: "Add start & end dates to anchor scheduling logic",
            action:
              "I will provide trip start and end dates; integrate them into the header only (do not regenerate full itinerary yet).",
          },
          add_flights: {
            title: "Add flights",
            detail: "Capture departure & return flights for timing context",
            action:
              "I will supply flight numbers and local departure/arrival times next; be ready to merge into flights array only.",
          },
          add_hotel: {
            title: "Add hotel",
            detail: "Provide lodging details to anchor overnight blocks",
            action:
              "I will give hotel name and stay dates; integrate only into accommodation (no full regeneration).",
          },
          draft_daily_outline: {
            title: "Draft daily outline",
            detail: "Generate a concise day-by-day scaffold",
            action:
              "Please produce a minimal dailySchedule outline (no full itinerary rewrite) based on current context.",
          },
          add_etiquette_notes: {
            title: "Local etiquette tips",
            detail: "Insert short cultural & business interaction notes",
            action:
              "Add a helpfulNotes entry summarizing key etiquette / business culture tips succinctly.",
          },
        };
        const entry = meta[d.id];
        if (!entry) return;
        base.unshift({
          id: `ai-${d.id}`,
          type: entry.type || "other",
          title: entry.title,
          detail: entry.detail,
          actionPrompt: entry.action,
          relevanceScore: 0.55,
          source: "ai",
          createdAt: Date.now(),
          mode: d.actions.includes("prefillMode") ? "prefill" : "send",
        });
      });
    }

    setSuggestions(base);
    const hash = base
      .map((m: any) => m.id + (m.mode || "") + (m._highlight ? "*" : ""))
      .join("|");
    if (hash !== prevHashRef.current) {
      prevHashRef.current = hash;
      if (announceTimerRef.current)
        window.clearTimeout(announceTimerRef.current);
      announceTimerRef.current = window.setTimeout(
        () => setAnnounce("Suggestions updated"),
        300
      );
    }
  }, [contextual, apiSuggestions, aiDirectives, dismissedIds]);

  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const handleBubbleClick = (
    s: InternalSuggestion,
    el?: HTMLButtonElement | null
  ) => {
    if (el) lastTriggerRef.current = el;
    if (s.formKind === "flight") {
      setActiveForm(activeForm === "flight" ? null : "flight");
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
    if (s.mode === "prefill" && onPrefillPrompt) {
      onPrefillPrompt(s.actionPrompt);
      // Optimistically dismiss contextual suggestions (except regen) once used
      if (s.id.startsWith("ctx-") && s.id !== "ctx-regen") {
        setDismissedIds((prev) => new Set(prev).add(s.id));
      }
      return;
    }
    onApplyPrompt(s.actionPrompt);
    if (s.id.startsWith("ctx-") && s.id !== "ctx-regen") {
      setDismissedIds((prev) => new Set(prev).add(s.id));
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
    if (!flightForm.departureFlight && !flightForm.returnFlight) {
      setActiveForm(null);
      return;
    }
    const prompt = `Flight details to integrate (no full JSON yet):\n${
      flightForm.departureFlight
        ? `Departure flight: ${flightForm.departureFlight} ${
            flightForm.departureTime || ""
          }`
        : ""
    }\n${
      flightForm.returnFlight
        ? `Return flight: ${flightForm.returnFlight} ${
            flightForm.returnTime || ""
          }`
        : ""
    }`.trim();
    if (onPrefillPrompt) onPrefillPrompt(prompt);
    setPendingRegen(true);
    // Optimistically hide flight suggestion bubble
    setDismissedIds((prev) => new Set(prev).add("ctx-flight"));
    setActiveForm(null);
    setFlightForm({});
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
    setDismissedIds((prev) => new Set(prev).add("ctx-hotel"));
    setActiveForm(null);
    setHotelForm({});
  };

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
    setDismissedIds((prev) => new Set(prev).add("ctx-dates"));
    setActiveForm(null);
    setDatesForm({});
    setDatesError("");
  };

  // Validate dates as user types
  useEffect(() => {
    if (datesForm.start && datesForm.end) {
      if (new Date(datesForm.end) < new Date(datesForm.start)) {
        setDatesError("End date must be after start date");
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
          <div
            className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3 relative z-30"
            aria-label="Flight details form"
            role="group"
            aria-describedby="flight-form-desc"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setActiveForm(null);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <h5 className="text-[12px] font-semibold text-white/80">
                Add Flight Details
              </h5>
              <button
                onClick={() => setActiveForm(null)}
                className="text-[11px] text-white/50 hover:text-white/80"
                aria-label="Close flight details form"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  Departure Flight
                </label>
                <input
                  ref={firstFlightFieldRef}
                  value={flightForm.departureFlight || ""}
                  onChange={(e) =>
                    setFlightForm((f) => ({
                      ...f,
                      departureFlight: e.target.value,
                    }))
                  }
                  placeholder="e.g. KL 861 AMS→NRT"
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  value={flightForm.departureTime || ""}
                  onChange={(e) =>
                    setFlightForm((f) => ({
                      ...f,
                      departureTime: e.target.value,
                    }))
                  }
                  placeholder="Dep time (local)"
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  Return Flight
                </label>
                <input
                  value={flightForm.returnFlight || ""}
                  onChange={(e) =>
                    setFlightForm((f) => ({
                      ...f,
                      returnFlight: e.target.value,
                    }))
                  }
                  placeholder="e.g. KL 862 NRT→AMS"
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  value={flightForm.returnTime || ""}
                  onChange={(e) =>
                    setFlightForm((f) => ({ ...f, returnTime: e.target.value }))
                  }
                  placeholder="Return time (local)"
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveForm(null);
                  setFlightForm({});
                }}
                className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80"
              >
                Cancel
              </button>
              <button
                onClick={submitFlightForm}
                className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 border border-purple-400/40 text-white font-medium"
              >
                Apply Flights
              </button>
            </div>
            <p id="flight-form-desc" className="sr-only">
              Enter one or both flight numbers and optional local departure /
              return times.
            </p>
          </div>
        )}
        {activeForm === "hotel" && (
          <div
            className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3 relative z-30"
            aria-label="Hotel details form"
            role="group"
            aria-describedby="hotel-form-desc"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setActiveForm(null);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <h5 className="text-[12px] font-semibold text-white/80">
                Add Hotel Details
              </h5>
              <button
                onClick={() => setActiveForm(null)}
                className="text-[11px] text-white/50 hover:text-white/80"
                aria-label="Close hotel details form"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  Hotel Name
                </label>
                <input
                  ref={firstHotelFieldRef}
                  value={hotelForm.hotelName || ""}
                  onChange={(e) =>
                    setHotelForm((f) => ({ ...f, hotelName: e.target.value }))
                  }
                  placeholder="e.g. Park Hyatt"
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  Check-in
                </label>
                <input
                  type="date"
                  value={hotelForm.checkIn || ""}
                  onChange={(e) =>
                    setHotelForm((f) => ({ ...f, checkIn: e.target.value }))
                  }
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  Check-out
                </label>
                <input
                  type="date"
                  value={hotelForm.checkOut || ""}
                  onChange={(e) =>
                    setHotelForm((f) => ({ ...f, checkOut: e.target.value }))
                  }
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveForm(null);
                  setHotelForm({});
                }}
                className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80"
              >
                Cancel
              </button>
              <button
                onClick={submitHotelForm}
                className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 border border-purple-400/40 text-white font-medium"
              >
                Apply Hotel
              </button>
            </div>
            <p id="hotel-form-desc" className="sr-only">
              Provide hotel name and optional check-in / check-out dates.
            </p>
          </div>
        )}
        {activeForm === "dates" && (
          <div
            className="mt-3 p-4 rounded-xl bg-black/40 border border-white/15 backdrop-blur-xl space-y-3 relative z-30"
            aria-label="Travel dates form"
            role="group"
            aria-describedby="dates-form-desc"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setActiveForm(null);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <h5 className="text-[12px] font-semibold text-white/80">
                Set Travel Dates
              </h5>
              <button
                onClick={() => setActiveForm(null)}
                className="text-[11px] text-white/50 hover:text-white/80"
                aria-label="Close travel dates form"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  Start Date
                </label>
                <input
                  ref={firstDatesFieldRef}
                  type="date"
                  value={datesForm.start || ""}
                  onChange={(e) =>
                    setDatesForm((f) => ({ ...f, start: e.target.value }))
                  }
                  aria-invalid={!!datesError}
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-wide text-white/40">
                  End Date
                </label>
                <input
                  type="date"
                  value={datesForm.end || ""}
                  onChange={(e) =>
                    setDatesForm((f) => ({ ...f, end: e.target.value }))
                  }
                  aria-invalid={!!datesError}
                  className="w-full text-[12px] bg-white/5 border border-white/15 rounded-md px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setActiveForm(null);
                  setDatesForm({});
                }}
                className="text-[11px] px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80"
              >
                Cancel
              </button>
              <button
                onClick={submitDatesForm}
                disabled={!!datesError}
                className="text-[11px] px-3 py-1.5 rounded-md bg-purple-600/70 hover:bg-purple-600 disabled:bg-purple-600/40 disabled:cursor-not-allowed border border-purple-400/40 text-white font-medium"
              >
                Apply Dates
              </button>
            </div>
            <p id="dates-form-desc" className="sr-only">
              Provide start and end date to populate the itinerary header and
              adjust schedule length.
            </p>
            {datesError && (
              <p className="text-[11px] text-red-300" role="alert">
                {datesError}
              </p>
            )}
            {inferredDaySpan && (
              <p className="text-[11px] text-white/40">
                Span: {inferredDaySpan} day{inferredDaySpan !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
