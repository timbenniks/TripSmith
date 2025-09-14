// Utility helpers extracted from suggestion-bubbles-bar to reduce component size
// and centralize pure logic. All functions here must remain side-effect free.
//
// Responsibilities:
// 1. Canonical ID mapping (normalizes historical / AI / contextual ids)
// 2. Contextual suggestion construction (deterministic, based on itinerary snapshot)
// 3. Helper types reused by the bar & future tests

import { Suggestion, StructuredItinerary } from "@/lib/types";

export interface BuildContextualParams {
  itineraryData?: StructuredItinerary;
  firstTravelDate?: string;
  pendingRegen: boolean;
  stalePending: boolean;
}

export interface InternalSuggestion extends Suggestion {
  mode?: "send" | "prefill";
  formKind?: "flight" | "hotel" | "dates";
  _canonical?: string; // internal only
  _highlight?: boolean; // AI directive highlight flag
  _hidden?: boolean; // pre-filter marker
}

// Map raw / legacy / AI ids to stable canonical ids used for persistence & suppression
export function toCanonical(rawId: string): string {
  switch (rawId) {
    case "ctx-flight":
    case "ai-add_flights":
    case "add_flights":
      return "add_flights";
    case "ctx-hotel":
    case "ai-add_hotel":
    case "add_hotel":
      return "add_hotel";
    case "ctx-dates":
    case "ai-set_travel_dates":
    case "set_travel_dates":
      return "set_travel_dates";
    case "ctx-outline":
    case "ai-draft_daily_outline":
    case "draft_daily_outline":
      return "draft_daily_outline";
    case "ctx-etiquette":
    case "ai-add_etiquette_notes":
    case "add_etiquette_notes":
      return "add_etiquette_notes";
    default:
      return rawId;
  }
}

// Deterministic contextual suggestion builder (previously inline). Kept pure.
export function buildContextualSuggestions({
  itineraryData,
  firstTravelDate,
  pendingRegen,
  stalePending,
}: BuildContextualParams): InternalSuggestion[] {
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
  if (stalePending) {
    list.push({
      id: "ctx-regen-reminder",
      type: "logistics",
      title: "Apply your pending edits",
      detail: "Consolidate flights/hotel/dates into fresh itinerary",
      actionPrompt: "Regenerate itinerary",
      relevanceScore: 0.97,
      source: "deterministic",
      createdAt: Date.now(),
      mode: "prefill",
    });
  }
  return list;
}

// Hook: encapsulates merging contextual + api suggestions + directives + suppression + announcement debounce
// This isolates complex effect logic away from the UI component.
import { useEffect, useRef, useState } from "react";

interface UseSuggestionEngineParams {
  contextual: InternalSuggestion[];
  apiSuggestions: Suggestion[];
  aiDirectives?: import("@/lib/types").UiDirectivesPayload;
  dismissedIds: Set<string>;
  pendingRegen: boolean;
  stagedEdits: { flights?: boolean; hotel?: boolean; dates?: boolean };
  itineraryData?: StructuredItinerary;
  onAnnounce: (msg: string) => void;
}

export function useSuggestionEngine({
  contextual,
  apiSuggestions,
  aiDirectives,
  dismissedIds,
  pendingRegen,
  stagedEdits,
  itineraryData,
  onAnnounce,
}: UseSuggestionEngineParams) {
  const [suggestions, setSuggestions] = useState<InternalSuggestion[]>([]);
  const prevHashRef = useRef<string>("");
  const announceTimerRef = useRef<number | null>(null);
  // Keep onAnnounce stable via ref to avoid effect dependency churn triggering loops
  const announceRef = useRef(onAnnounce);
  useEffect(() => {
    announceRef.current = onAnnounce;
  }, [onAnnounce]);

  useEffect(() => {
    let base: InternalSuggestion[] = [];
    const seenByTitle = new Set<string>();
    const push = (s: InternalSuggestion) => {
      if (!seenByTitle.has(s.title)) {
        seenByTitle.add(s.title);
        base.push(s);
      }
    };
    // Contextual
    contextual.forEach((s) => {
      const canonical = toCanonical(s.id);
      if (dismissedIds.has(canonical)) return;
      if (pendingRegen) {
        const hideFlights = canonical === "add_flights" && stagedEdits.flights;
        const hideHotel = canonical === "add_hotel" && stagedEdits.hotel;
        const hideDates = canonical === "set_travel_dates" && stagedEdits.dates;
        if (hideFlights || hideHotel || hideDates) return;
      }
      push({ ...s, _canonical: canonical } as any);
    });
    // API suggestions
    apiSuggestions.forEach((s) => {
      if (s.source === "deterministic") {
        const lowerTitle = s.title.toLowerCase();
        const rawNotes = itineraryData?.helpfulNotes;
        const notesArray = Array.isArray(rawNotes) ? rawNotes : [];
        const notesText = notesArray
          .map((n: any) => `${n.category} ${n.information} ${n.tips || ""}`.toLowerCase())
          .join(" ");
        const hasCoreScaffold =
          Boolean(itineraryData?.tripHeader?.dates) &&
          ((itineraryData?.flights && itineraryData.flights.length > 0) ||
            (itineraryData?.accommodation && itineraryData.accommodation.length > 0));
        if (
          !hasCoreScaffold &&
          !pendingRegen &&
          (lowerTitle.includes("seasonal timing") ||
            lowerTitle.includes("local etiquette") ||
            lowerTitle.includes("transit pass"))
        ) {
          return;
        }
        if (notesText) {
          if (lowerTitle.includes("etiquette") && /etiquette|culture|meeting/i.test(notesText)) return;
          if (lowerTitle.includes("seasonal") && /season|weather|climate/i.test(notesText)) return;
          if (lowerTitle.includes("transit") && /transport|transit|metro|pass|card/i.test(notesText)) return;
        }
      }
      const canonical = toCanonical(s.id);
      if (dismissedIds.has(canonical)) return;
      if (pendingRegen) {
        const hideFlights = canonical === "add_flights" && stagedEdits.flights;
        const hideHotel = canonical === "add_hotel" && stagedEdits.hotel;
        const hideDates = canonical === "set_travel_dates" && stagedEdits.dates;
        if (hideFlights || hideHotel || hideDates) return;
      }
      push({ ...(s as any), mode: "send", _canonical: canonical } as any);
    });

    // AI Directives
    if (aiDirectives?.suggestions?.length) {
      const actionsById = new Map(aiDirectives.suggestions.map((d) => [d.id, d.actions]));
      const idResolver = (suggestion: InternalSuggestion): string | undefined => {
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
          return { ...s, mode, _highlight: actions.includes("highlight") } as any;
        })
        .filter((s: any) => !s._hidden);

      if (aiDirectives.orderingHints?.length) {
        const order = aiDirectives.orderingHints;
        const ranked: InternalSuggestion[] = [];
        const rest: InternalSuggestion[] = [];
        base.forEach((s) => {
          const cid = idResolver(s);
          const idx = cid ? order.indexOf(cid) : -1;
          if (idx >= 0) ranked[idx] = ranked[idx] || s;
          else rest.push(s);
        });
        base = ranked.filter(Boolean).concat(rest);
      }

      aiDirectives.suggestions.forEach((d) => {
        if (!d.actions.includes("show")) return;
        const already = base.some((s) => {
          const cid = idResolver(s);
          return cid === d.id;
        });
        if (already) return;
        const meta: Record<string, { title: string; detail: string; action: string; type?: InternalSuggestion["type"] }> = {
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
        const canonical = d.id;
        if (dismissedIds.has(canonical)) return;
        if (pendingRegen) {
          const hideFlights = canonical === "add_flights" && stagedEdits.flights;
          const hideHotel = canonical === "add_hotel" && stagedEdits.hotel;
          const hideDates = canonical === "set_travel_dates" && stagedEdits.dates;
          if (hideFlights || hideHotel || hideDates) return;
        }
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
          _canonical: canonical,
        } as any);
      });
    }

    // Dedupe by canonical id retaining highlight precedence
    const deduped: InternalSuggestion[] = [];
    const seenCanon = new Set<string>();
    for (const s of base as any[]) {
      const canonical = s._canonical ? s._canonical : toCanonical(s.id);
      if (!canonical) {
        deduped.push(s);
        continue;
      }
      if (seenCanon.has(canonical)) {
        const existingIdx = deduped.findIndex(
          (ds) => (ds as any)._canonical === canonical || toCanonical(ds.id) === canonical
        );
        if (existingIdx >= 0) {
          const existing: any = deduped[existingIdx];
          if (!existing._highlight && s._highlight) deduped[existingIdx] = s;
        }
        continue;
      }
      seenCanon.add(canonical);
      deduped.push(s);
    }
    const hash = deduped
      .map((m: any) => m.id + (m.mode || "") + (m._highlight ? "*" : ""))
      .join("|");
    if (hash !== prevHashRef.current) {
      prevHashRef.current = hash;
      setSuggestions(deduped as any);
      if (announceTimerRef.current) window.clearTimeout(announceTimerRef.current);
      announceTimerRef.current = window.setTimeout(
        () => announceRef.current("Suggestions updated"),
        300
      );
    } else {
      // No change in semantic suggestion set; avoid setState to prevent render loop
    }
  }, [
    contextual,
    apiSuggestions,
    aiDirectives,
    dismissedIds,
    pendingRegen,
    stagedEdits.flights,
    stagedEdits.hotel,
    stagedEdits.dates,
    itineraryData,
  ]);

  return suggestions;
}

