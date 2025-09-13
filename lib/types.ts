export interface Flight {
  date: string;
  flightNumber: string;
  route: {
    from: string;
    to: string;
  };
  departure: string;
  arrival: string;
  terminal?: string;
  links?: {
    googleFlights?: string;
  };
}

export interface Accommodation {
  property: string;
  address: string;
  checkIn: string;
  checkOut: string;
  contact?: string;
  links?: {
    googleMaps?: string;
    booking?: string;
  };
}

export interface Activity {
  time: string;
  activity: string;
  location: string;
  duration?: string;
  travelBuffer?: string;
  notes?: string;
}

export interface TransportPlan {
  route: string;
  primaryOption: string;
  estimatedTime: string;
  fallbackOption?: string;
  notes?: string;
}

export interface ExpenseCategory {
  category: string;
  estimatedCost: number;
  notes?: string;
  tips?: string;
}

export interface HelpfulNote {
  category: string;
  information: string;
  tips?: string;
}

export interface StructuredItinerary {
  tripHeader?: {
    travelerName?: string;
    destination: string;
    dates: string;
    lastUpdated: string;
  };
  flights?: Flight[];
  accommodation?: Accommodation[];
  transportPlans?: TransportPlan[];
  dailySchedule?: Activity[];
  expenses?: {
    total?: number;
    breakdown: ExpenseCategory[];
  };
  helpfulNotes?: HelpfulNote[];
}

export interface HybridResponse {
  markdown: string;
  structured?: StructuredItinerary;
}

// ---------------- UI Directives (AI → UI layer) ----------------
// These directives allow the model to influence which suggestion bubbles
// are shown, hidden, highlighted, or converted to prefill vs send actions
// WITHOUT exposing raw JSON to the end user. They are stripped from the
// visible assistant message before rendering.

// Canonical suggestion IDs the model may reference (extensible):
// set_travel_dates, add_flights, add_hotel, draft_daily_outline, add_etiquette_notes
// Potential future: refine_schedule, optimize_logistics

export type UiDirectiveAction =
  | 'show'        // ensure this suggestion is visible (if heuristics removed it)
  | 'hide'        // hide this suggestion even if heuristics would show it
  | 'highlight'   // visually emphasize (badge / style)
  | 'prefillMode' // switch suggestion bubble to prefill instead of direct send
  | 'sendMode';   // force to send mode

export interface UiDirectiveSuggestion {
  id: string; // canonical suggestion id
  actions: UiDirectiveAction[]; // one or multiple actions
  rationale?: string; // OPTIONAL: short reasoning (never displayed to end user)
}

export interface UiDirectivesPayload {
  type: 'ui_directives';
  suggestions: UiDirectiveSuggestion[];
  // Optional global guidance for ordering or grouping
  orderingHints?: string[]; // array of ids indicating a preferred order front → back
  // Timestamp for traceability
  generatedAt?: string; // ISO timestamp
}

// Union helper for any structured AI-side control blocks (future-proofing)
export type AssistantControlBlock = UiDirectivesPayload;

// Suggestions Engine Types (MVP)
export type SuggestionType =
  | 'seasonal'
  | 'weather'
  | 'logistics'
  | 'etiquette'
  | 'optimization'
  | 'dining'
  | 'gap'
  | 'other';

export interface Suggestion {
  id: string; // uuid or timestamp-based id
  type: SuggestionType;
  title: string;
  detail: string; // <= ~160 chars target
  actionPrompt: string; // user message injected when applied
  relevanceScore: number; // 0-1
  source: 'ai' | 'deterministic' | 'hybrid';
  tags?: string[];
  createdAt: number; // epoch ms
  formKind?: 'flight' | 'hotel' | 'dates' | 'generic'; // optional trigger for inline form UX
}
