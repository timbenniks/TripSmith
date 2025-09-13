# Smart Suggestions Engine - Design Document

Status: In Progress (MVP Step 1)
Target Branch: `feature/suggestions-engine`
Owner: TripSmith Core
Last Updated: 2025-09-13

## 1. Goal & Non-Goals

### 1.1 Primary Goal
Provide contextual, high-quality suggestions that accelerate and enrich trip planning without overwhelming the user or disrupting the existing chat + itinerary workflow.

### 1.2 Success Criteria (MVP)
- Suggestions appear only when relevant (after first itinerary or trip created/resumed)
- User can reveal or dismiss suggestions non-destructively
- Each suggestion is actionable: becomes either a pre-filled chat prompt or structured itinerary augmentation request
- System generates suggestions in < 4s median (network + model)
- No blocking UI states; all operations degrade silently on error using new error logging layer

### 1.3 Non-Goals (MVP)
- Real-time external API integration (live weather, strikes, pricing)
- Persistent user preference learning (likes/dislikes) beyond session memory
- Direct itinerary JSON mutation (we rely on model follow-up via structured prompts)
- Complex ranking / machine learning personalization

---

## 2. Core Use Cases
| Use Case | Trigger | Output Type | Example |
|----------|--------|-------------|---------|
| Seasonal highlight | User destination + travel month | Text suggestion | "Cherry blossom timing overlaps your trip—consider visiting Shinjuku Gyoen early morning." |
| Weather-aware packing/activity | Destination climate classification | Text suggestion + prompt | "Add a lightweight rain layer—March in Tokyo averages mild showers." |
| Time optimization | Multi-day itinerary present | Prompt | "Optimize Day 2 transit by clustering Asakusa + Ueno activities." |
| Local transit pass | Destination has known pass benefit | Suggestion | "Tokyo Subway 72-hour pass may reduce your metro cost." |
| Cultural etiquette | First time destination planning | Prompt | "Ask AI to add an etiquette quick reference card to itinerary." |
| Dining gaps | Evening slots missing | Prompt | "Fill Day 3 dinner near Shibuya with a casual yakitori place." |
| Early flight arrival | Arrival morning unplanned | Suggestion | "Add recovery buffer + light walk around hotel neighborhood (Jet lag easing)." |

---

## 3. Architecture Overview

```
User Action (Trip created / itinerary present)
          ↓
Suggestion Orchestrator (client)
  ├─ Deterministic Seed Layer (static maps)
  ├─ Context Builder (trip + itinerary shape summary)
  ├─ AI Completion Request (JSON contract)
  └─ Cache (session memory: last generated set)
          ↓
Suggestions Panel UI (collapsible) → User Apply → Chat injection → Model generates itinerary changes
```

### 3.1 Layers
1. Deterministic Seed Layer
   - Static JSON heuristics keyed by (country | month | climate | trip length). Provides seed facts.
2. Context Builder
   - Summarizes: destination, month, length, purpose, existing schedule gaps (simple heuristic).
3. AI Completion
   - Sends seeds + context + JSON schema spec, requests 3–7 suggestions.
4. Application
   - On apply: converts suggestion → chat message (prefixed with system directive to stay JSON-only for itinerary deltas).

### 3.2 Client-Only vs API Split
- Deterministic + context assembly: client
- Model call: `/api/suggestions` route (reusing OpenAI integration with stricter system prompt)
- Rationale: keeps keys server-side and enables future caching / instrumentation

---

## 4. Data Model

```ts
export interface Suggestion {
  id: string;              // uuid or timestamp composite
  type: SuggestionType;    // 'seasonal' | 'weather' | 'logistics' | 'etiquette' | 'optimization' | 'dining' | 'gap' | 'other'
  title: string;           // Short label
  detail: string;          // Descriptive text (max ~160 chars)
  actionPrompt: string;    // Chat prompt injected when user applies
  relevanceScore: number;  // 0–1 (AI provided or heuristic default = 0.6)
  source: 'ai' | 'deterministic' | 'hybrid';
  tags?: string[];
  createdAt: number;
}
```

Client state addition (in `MatureTripPage` or new hook):
```ts
const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
const [suggestionsStatus, setSuggestionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
```

---

## 5. Generation Flow (MVP)

1. Trigger conditions:
   - First itinerary exists OR user clicks "Generate Suggestions"
   - Debounce multiple triggers during a 30s window
2. Steps:
   - Build base context (destination, month, length, purpose, day count, unplanned evenings)
   - Collect deterministic seeds (seasonal notes, pass hints, etiquette basics)
   - Send POST `/api/suggestions`:
```json
{
  "tripId": "uuid",
  "context": { /* summarized fields */ },
  "seeds": ["Cherry blossom season mid-March to early April", ...]
}
```
   - System prompt enforces JSON array of suggestions (schema snippet) – reject non-conforming output
   - Parse + validate (length caps, field presence)
   - Store in state; mark status `ready`

3. Rejection / Retry:
   - If parse fails → 1 retry with stricter instruction
   - On repeated failure → logError + status `error`

---

## 6. API Contract

`POST /api/suggestions`
Request body:
```ts
interface SuggestionRequestBody {
  tripId: string;
  context: Record<string, any>; // sanitized summary
  seeds: string[];              // deterministic hints
  max?: number;                 // optional cap (default 6)
}
```
Response (200):
```json
{
  "suggestions": Suggestion[]
}
```
Error (4xx/5xx): JSON with `error` message; fallback UI surfaces panel indicator silently.

---

## 7. System Prompt (Draft)

> You are TripSmith's Suggestion Synthesizer. Given context and deterministic seed hints, produce 3–7 high-value travel planning suggestions. Each suggestion must: (1) have a focused title, (2) be at most 160 characters detail, (3) include an actionPrompt that when sent to the trip planning assistant will request JSON-only itinerary refinements. Output ONLY valid JSON matching the schema.

Provide JSON schema in tool call.

---

## 8. UI Design (First Iteration)

Component: `SuggestionsPanel`
- Placement: Right-hand sidebar under itinerary toggle OR collapsible drawer below chat on mobile
- Collapsed state: Small pill/button: "Suggestions (5)"; badge updates
- Expanded state: List of suggestion cards:
  - Title (bold small)
  - Detail (muted small)
  - "Apply" ghost button (triggers chat injection)
  - Optional tag chips
- Empty state: CTA button: "Generate Suggestions"
- Error state: "Could not generate suggestions." + Retry link
- Loading state (>1.2s): subtle skeleton shimmer (reuse delay hook)

Accessibility:
- Region with `aria-labelledby="suggestions-heading"`
- Live polite announcement: "5 new suggestions available" when set transitions from loading → ready

---

## 9. Application (Apply Action)

When user clicks Apply:
1. Insert a crafted user message using `actionPrompt`
2. Immediately send it through existing chat pipeline (`sendMessage`) to trigger JSON itinerary delta generation
3. Optionally tag message with `meta: { originatedFromSuggestion: true, suggestionId }` (future filtering)

---

## 10. Deterministic Seed Sources (Static File)

Create: `lib/suggestions-seeds.ts`
```ts
export const seasonalByMonth: Record<number, string[]> = {
  3: ["Cherry blossom early wave in some regions", "Mild temperatures; light jacket"],
  12: ["Holiday illumination events peak", "Colder evenings; layering recommended"],
  // ...
};

export const etiquetteBasics: Record<string, string[]> = {
  japan: ["Carry cash for small eateries", "Quiet phone use on trains"],
  netherlands: ["Cycling priority awareness", "Card payments widely accepted"],
};

export const transitPassHints: Record<string, string> = {
  tokyo: "72-hour subway pass reduces cost if >6 rides/day",
  amsterdam: "GVB day tickets if heavy inner-city tram usage",
};
```

Heuristics:
- Destination normalization (lowercase, remove diacritics) for lookup
- Month from first travel date
- Trip length = day span inclusive
- Gap detection: check itinerary dailySchedule for empty dinner slots or missing first morning block

---

## 11. Error Handling & Telemetry
- All failures logged via `logError` with `source: 'SuggestionsEngine'` and phase tags (`seed-build`, `model-call`, `parse`) 
- Parse validation includes: unique IDs, title length < 70, detail length < 170, actionPrompt non-empty
- Soft-fail: UI offers Retry; never blocks chat or itinerary

---

## 12. Incremental Delivery Plan
| Step | Deliverable | PR Gate |
|------|-------------|---------|
| 1 | Types + seeds file + API route returning mock suggestions | Build passes |
| 2 | Panel UI (static mock suggestions) | Visual QA |
| 3 | Context builder + deterministic seeds integration | Verified seeds appear |
| 4 | AI integration & JSON validation | Handles malformed retry |
| 5 | Apply → chat injection pipeline | Suggestion converts to message |
| 6 | Mobile responsiveness & accessibility polish | a11y lint / manual check |
| 7 | Refinement (ranking tweak, dedupe) | Optional |

---

## 13. Confirmed MVP Decisions
1. Persistence: Ephemeral only (not stored per trip). Rationale: reduce schema churn; fast iteration. Revisit after observing acceptance metrics.
2. Panel Placement: Below (or optionally above) the chat area— NOT under itinerary—to keep user focus on the core chat→itinerary loop. Mobile: collapsible drawer below chat.
3. Apply Behavior: Each suggestion applies by sending an ordinary user chat message (no special system action type). Simplicity preserves existing streaming + itinerary delta pipeline. We will still prepend a lightweight directive inside the user message text to encourage JSON-only delta updates.
4. Max Set Size: Adaptive based on trip length (heuristic below) capped at 7.
5. Gaps Heuristic (Initial Scope): Keep simple— detect: (a) arrival morning unplanned, (b) empty evening (no activities after 18:00), (c) missing accommodation, (d) flight presence vs. missing return, (e) transit pass hint. Defer meals & complex transit transfers until post-MVP.
6. Provenance Badges: Display a compact badge per suggestion: AI, Seed, or Hybrid. Styling: 10px pill, subtle border, opacity hover lift; hidden from screen readers (SR gets textual prefix “Source: AI”).
7. Retry UX: Inline subtle text link “Retry generation” shown only in error state; uses same deterministic seeds unless context changed.

Adaptive Count Heuristic (draft):
| Trip Length (days) | Target Suggestions |
|--------------------|--------------------|
| 1–2                | 3–4                |
| 3–5                | 5–6                |
| 6+                 | 6–7                |

Formula: `target = clamp( ceil(days * 1.2), 3, 7 )` then trimmed for uniqueness.

## 14. Deferred / Future Questions
- Cross-tab throttling / shared generation lock.
- Variant micro-bar above itinerary instead of panel (A/B post-MVP).
- User feedback signals (dismiss / dislike) feeding future ranking.
- Persisting accepted vs. ignored suggestions for personalization.

## 15. (Renumbered) Future Extensions (Out of Scope MVP)
*(Section content shifted from former 14; numbering incremented for inserted decisions section.)*

---

### Future Extensions
- Real weather API integration (Open-Meteo) with caching
- Strike/disruption feed ingestion
- Cost estimation + budget optimization suggestions
- Preference-driven filtering (user profile table)
- Aggregated analytics on suggestion acceptance rate

---

## 16. Security & Privacy Notes
- No PII beyond existing trip context leaves client except what’s already in chat
- API route enforces trip ownership via Supabase auth (reuse existing pattern)
- Sanitization of model output to avoid prompt injection (strip extraneous fields)

---

## 17. Risk Assessment
| Risk | Mitigation |
|------|------------|
| Model outputs markdown instead of JSON | Retry with explicit correction prompt |
| Over-suggestion noise | Cap 7, relevance scoring, allow dismiss all |
| Performance regression | Lazy load panel only on first open; model call deferred until needed |
| Inaccurate seasonal data | Provide conservative phrasing; allow quick patch via static file |

---

## 18. Example AI Response (Target)
```json
[
  {
    "id": "sug_1",
    "type": "seasonal",
    "title": "Peak blossom corridor stroll",
    "detail": "Schedule an early Shinjuku Gyoen walk before crowds and add a midday Ueno Park loop.",
    "actionPrompt": "Incorporate an early morning blossom walk Day 2 at Shinjuku Gyoen and a midday Ueno Park visit.",
    "relevanceScore": 0.82,
    "source": "ai",
    "tags": ["blossom", "timing"],
    "createdAt": 1731523200000
  }
]
```

---

## 19. Acceptance Checklist (MVP Ready)
- [ ] API returns mock suggestions
- [ ] Panel renders & toggles
- [ ] AI JSON adherence validated with fallback retry path
- [ ] Apply action injects prompt into existing chat flow
- [ ] Errors logged; UI never blocks itinerary/chat
- [ ] a11y landmarks and announcements in place

---

Feedback welcome before implementation begins. Mark unresolved open questions inline or propose adjustments to sequencing.
