# TripSmith AI Travel Planner - Development Guide

> **Status**: Production-ready MVP with optimized architecture, foundational accessibility complete, Smart Suggestions Engine (hybrid prefill + explicit regeneration) implemented, and recent dependency/performance cleanup  
> **Stack**: Next.js 15, React 19, TypeScript, Supabase, OpenAI GPT-4, Three.js  
> **Theme**: Cinematic dark theme with glass morphism and 3D visualizations

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Current Status](#-current-status)
3. [Tech Stack & Architecture](#-tech-stack--architecture)
4. [Development Environment](#-development-environment)
5. [Code Organization](#-code-organization)
6. [Best Practices](#-best-practices)
7. [Accessibility Summary](#-accessibility-implementation-summary)
8. [Code Simplification & Engine Summary](#-code-simplification--suggestions-engine-summary)
9. [Quick Start](#-quick-start-for-new-contributors)

> Roadmap moved to `ROOT/ROADMAP.md` to keep this guide focused. See that file for priorities & future phases.

---

## 🎯 Project Overview

TripSmith is an AI-powered travel planning application that combines:

- **Interactive 3D Earth globe** for visual destination selection
- **Streaming AI chat interface** for natural trip planning conversations
- **JSON-only itinerary system** for jitter-free, beautiful trip displays
- **Real-time auto-save** with seamless chat-to-trip-page transitions
- **Responsive design** with mobile-first approach

### Key Features ✅

- **Auto-Save Trips**: Real-time chat history + structured itinerary data
- **JSON-Only Itinerary System**: Custom rendering with beautiful cards
- **Trip History Dashboard**: Complete trip management with search/filter
- **Mature Trip Page Layout**: Two-panel responsive layout with mobile toggle
- **Performance Optimization**: Strategic 3D animations (homepage only)
- **Coordinated Animation System**: Earth texture loading with synchronized effects
- **GitHub OAuth Authentication**: Streamlined user experience
- **Clean URL Structure**: `/trips/[tripId]` routing with proper SEO

---

## 🚀 Current Status

### **Phase Complete: Code Quality & Architecture Optimization**

**Major Code Simplification & Cleanup Achievements:**

- ✅ **61% size reduction** in message-bubble.tsx (273→104 lines)
- ✅ **15% size reduction** in mature-trip-page.tsx (320→273 lines)
- ✅ **Zero code duplication** across all chat components
- ✅ **Core shared utilities consolidated** (itinerary + streaming + markdown components)
- ✅ **Removed obsolete PDF export & table parsing layer** reducing bundle & complexity
- ✅ **Eliminated framer-motion entrance animations on trip pages to improve responsiveness**
- ✅ **Runtime error fixes** with proper null checking
- ✅ **Enhanced type safety** throughout the codebase
- ✅ **Pruned unused dependencies** (`openai`, `tailwindcss-animate`, `tw-animate-css`, legacy PDF libs) reducing install & bundle surface
- ✅ **Consolidated global styles** to single `app/globals.css` (removed duplicate `styles/globals.css`)

### **Phase Complete: Foundational Accessibility Enhancements**

Baseline WCAG 2.1 AA-aligned improvements shipped (structure, keyboard, assistive tech, contrast):

- Landmarks & navigation: Skip link, `main` landmark, scoped regions (chat log, itinerary, dashboard results)
- Keyboard operability: Roving focus menu, modal focus trap + ESC, calendar popover autofocus & focus restore
- Screen reader parity: Dual live regions (polite streaming, assertive errors), `role="log"` transcript, `role="status"` spinners, itinerary phase announcements
- Contrast normalization: Semantic `.text-contrast-*` utilities replacing opacity-based whites
- Noise reduction: Decorative icons hidden, dynamic avatar alt text, cleaned null assertions
- Stability: Rebuilt `trip-history-dashboard.tsx` with accessible list semantics & live filtered count updates

Deferred (Intentional): Automated a11y tooling (axe / Playwright) to minimize current dependency surface.

**System Status:** Architecture + accessibility foundation ready for Feature 3 implementation.

### **Phase Complete: Smart Suggestions Engine (Hybrid Workflow)**

Implemented multi-layer suggestion & regeneration system:

- Contextual logistics heuristics (dates, flights, hotel, daily outline, etiquette, regeneration)
- Aggregated deterministic domain suggestions (seasonal timing, etiquette basics, transit pass optimization) generated server-side & suppressed until scaffold
- Inline structured forms (flights, hotel, dates) that prefill chat input (no immediate full JSON regen)
- Hidden AI directive layer (`ui_directives`) in fenced JSON controlling show/hide/highlight/mode/order (stripped before rendering)
- Hybrid regeneration: incremental edits set `pendingRegen`; explicit “Regenerate itinerary” bubble triggers full JSON refresh
- Bubble dismissal & per-trip persistence via `localStorage` (`ts-dismissed-<tripId>`)
- Suppression heuristics avoid noisy early suggestions & duplicate themes already in `helpfulNotes`
- Enriched AI placeholder suggestions with actionable prompts
- Extracted inline logistics capture into dedicated form components (`flight-segments-form.tsx`, `hotel-details-form.tsx`, `travel-dates-form.tsx`) for a11y and maintainability
- Centralized complex merge/suppression/directive logic inside `useSuggestionEngine` hook (`lib/suggestions-utils.ts`) eliminating previous large effect block duplication
- Stability fix: prevented infinite re-render ("Maximum update depth exceeded") via callback ref stabilization + hash-gated state updates inside the hook

Result: Lean, high-signal assistance enabling structured itinerary enrichment without unwanted full rewrites.

---

## 🔧 Tech Stack & Architecture

### **Core Technologies**

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS (single consolidated `app/globals.css`) with glass morphism design
- **3D Graphics**: Three.js for Earth globe visualization
- **AI Integration**: OpenAI GPT-4 via Vercel AI SDK
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: GitHub OAuth via Supabase Auth
- **Deployment**: Vercel (production-ready)

### **Database Schema & Integration**

**Supabase Project Details:**

- **Project ID**: `hycbjohjuhzovsqpodeq`
- **Organization**: timbenniks's Org (`civilian-red-xics6mm`)
- **Region**: eu-west-1
- **Status**: ACTIVE_HEALTHY

**Core Tables:**

```sql
-- Trips table
CREATE TABLE trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'booked', 'completed')),
  chat_history JSONB DEFAULT '[]'::jsonb,
  itinerary_data JSONB,
  travel_dates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security enabled with user isolation policies
```

**Data Flow:**

1. **Trip Creation**: User submits TripForm → Creates trip record → Returns tripId
2. **Chat Messages**: Stored in `chat_history` JSONB array
3. **Itinerary Data**: Extracted JSON stored in `itinerary_data` column
4. **Real-time Updates**: Each AI response updates both chat_history and itinerary_data
5. **Auto-Redirect**: After successful save, user redirected to `/trips/[tripId]` for seamless editing continuation

### **AI Integration Architecture**

**OpenAI Integration:**

- **Model**: GPT-4.1 via Vercel AI SDK
- **Streaming**: Uses `streamText()` for real-time token delivery
- **Format**: Full itinerary JSON (single fenced block) returned ONLY when the user explicitly requests regeneration; incremental logistics edits (dates, flights, hotel) are accepted as plain text instructions and deferred until explicit consolidation.

**API Structure:**

```typescript
// app/api/chat/route.ts
POST /api/chat
{
  messages: Message[],
  tripId: string,
  tripDetails: TripDetails
}

// Response: Streaming text with potential JSON blocks
```

### **JSON-Only Itinerary System & Hybrid Update Flow**

**Problem Solved:** Eliminated jittery table rendering during AI streaming responses.

**AI Response Format:**

```json
{
  "type": "complete_itinerary",
  "tripHeader": {
    "travelerName": "Tim Benniks",
    "destination": "Tokyo, Japan",
    "dates": "March 15-22, 2025",
    "purpose": "Business Conference"
  },
  "flights": [
    {
      "date": "2025-03-15",
      "departure": "08:00 - Amsterdam (AMS)",
      "arrival": "15:30+1 - Tokyo (NRT)",
      "flightNumber": "KL 861",
      "airline": "KLM"
    }
  ],
  "accommodation": [...],
  "dailySchedule": [...],
  "recommendations": [...]
}
```

**Hybrid Processing Flow:**

1. User supplies granular logistics (dates / flights / hotel) via inline forms or contextual bubbles (prefill) — no immediate full JSON.
2. Each granular action sets a local `pendingRegen`; related contextual bubbles (e.g., add flights) are suppressed.
3. User activates “Regenerate itinerary” bubble to consolidate staged edits.
4. Assistant returns a single fenced JSON block (`type: complete_itinerary`) replacing prior itinerary data.
5. Streaming layer extracts & stores structured itinerary; resets `pendingRegen`.
6. Hidden `ui_directives` fenced JSON (if present) is parsed for suggestion orchestration then stripped from transcript.

**Directive Handling (`ui_directives` fenced JSON)**

````jsonc
```json ui_directives
{
  "suggestions": [
    { "id": "add_hotel", "actions": ["hide", "prefillMode"] },
    { "id": "draft_daily_outline", "actions": ["highlight"] }
  ],
  "orderingHints": ["set_travel_dates", "add_flights", "add_hotel"]
}
````

````

Supported actions: `show`, `hide`, `prefillMode`, `sendMode`, `highlight`. Unknown IDs ignored.

**Suggestion Layer State**

- `dismissedIds`: Persisted contextual bubble IDs per trip (`localStorage: ts-dismissed-<tripId>`)
- `pendingRegen`: Indicates staged logistic edits not yet consolidated
- `apiSuggestions`: Aggregated deterministic server suggestions (seasonal / etiquette / transit)
- `aiDirectives`: Parsed runtime adjustments from hidden control block
- `inferredDaySpan`: Calculated from date form for quick feedback

**Suppression Logic Summary**

- Hide contextual bubble after use (except regenerate)
- Hide logistics contextual bubbles while `pendingRegen` true
- Delay seasonal/etiquette/transit suggestions until dates + (flights OR hotel) OR `pendingRegen`
- Suppress deterministic suggestions whose themes already appear in `helpfulNotes`

1. AI generates JSON-only response for complete itineraries
2. Chat interface detects JSON content with `extractItineraryData()`
3. JSON parsed and stored in message `itineraryData` property
4. `ItineraryRenderer` component creates beautiful card-based display
5. Raw JSON content hidden from user interface

---

## 🛠️ Development Environment & Setup

### **Setup Instructions**

```bash
# 1. Clone and install
git clone [repo]
npm install

# 2. Environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key

# 3. Run development server
npm run dev # Runs on localhost:3001 (3000 often occupied)
````

### **Build Configuration**

- TypeScript/ESLint errors ignored for faster builds (`next.config.mjs`)
- Images set to `unoptimized: true`
- Dynamic imports used for SSR-sensitive components
- Dependency footprint trimmed after audit (see Cleanup Achievements above)

---

## 🏗️ Code Organization

### **Shared Utility Architecture & Cleanup Highlights**

The codebase features a comprehensive shared utility architecture that eliminates code duplication and provides a maintainable foundation for future development.

#### **lib/itinerary-utils.ts** (58 lines)

**Purpose**: Unified JSON itinerary extraction logic shared across chat components
**Key Functions**:

- `extractItineraryData(content)`: Extracts and parses JSON itinerary data from AI responses
- `hasCompleteItinerary(content)`: Detects if streaming response contains complete JSON itinerary
- `getPreJsonContent(content)`: Extracts content before JSON blocks during streaming

**Used by**: chat-interface.tsx, mature-trip-page.tsx, streaming-utils.ts

<!-- Deprecated (present but unused): lib/markdown-utils.ts & lib/pdf-utils.ts retained temporarily for potential future export functionality; not imported in current runtime. -->

#### **lib/markdown-components.tsx** (96 lines)

**Purpose**: Reusable ReactMarkdown component configuration for consistent styling
**Key Exports**:

- `chatMarkdownComponents`: Complete component configuration object for ReactMarkdown
- Includes styling for h1-h3, paragraphs, links, lists, tables, and inline formatting
- Maintains glass morphism design system and responsive breakpoints

**Used by**: message-bubble.tsx

#### **lib/streaming-utils.ts** (138 lines)

**Purpose**: Chat streaming response handlers with itinerary generation support
**Key Functions**:

- `handleStreamingResponse(response, messageId, options)`: Core streaming handler with callbacks
- `createAssistantMessage()`: Creates properly formatted assistant message objects
- `makeChatRequest(messages, tripId)`: Helper for making chat API requests

**Used by**: mature-trip-page.tsx (chat-interface.tsx integration pending)

#### **lib/suggestions-utils.ts** (≈420 lines)

**Purpose**: Centralizes Smart Suggestions Engine pure logic + `useSuggestionEngine` hook.

**Key Exports**:

- `toCanonical(id)` – normalizes legacy / AI / contextual suggestion IDs
- `buildContextualSuggestions(params)` – deterministic on-the-fly heuristics (dates / flights / hotel / outline / etiquette / regen / stale reminder)
- `useSuggestionEngine({...})` – merges contextual + server + AI directive suggestions, applies suppression (dismissals, staged edits during `pendingRegen`, early-noise filters), dedupes with highlight precedence, debounces polite live-region announcements, and prevents render loops via hash gating
- `InternalSuggestion` – enriched suggestion type (modes, formKind, internal flags)

**Why a Hook?** Encapsulates previously sprawling in-component `useEffect` logic from `suggestion-bubbles-bar.tsx`, improving testability and reducing accidental feedback loops.

#### **components/suggestions/**

- `flight-segments-form.tsx` – Multi-leg outbound/inbound capture (pipe-delimited deterministic prompt format)
- `hotel-details-form.tsx` – Hotel + stay dates with reversed range auto-swap
- `travel-dates-form.tsx` – Trip date range with live span calculation & auto-correction
- `README.md` – Module principles + engine integration summary

These forms are presentational/controlled; no regeneration side-effects inside them.

### **Architecture Benefits**

- **Zero Duplication**: Eliminated all duplicate functions across chat components
- **Type Safety**: Enhanced error handling with proper null checking and TypeScript interfaces
- **Maintainable Design**: Clear separation of concerns with documented utility functions
- **Consistent APIs**: Unified function signatures and return types across utilities
- **Performance**: Reduced bundle size by centralizing common code + removing deprecated PDF/table layers & unused animation dependencies
- **Extensibility**: Modular design makes adding new features straightforward

### **File Structure**

```
app/
├── api/chat/route.ts         # AI streaming endpoint with system prompt
├── page.tsx                  # Dynamic import entry point
├── trips/
│   ├── page.tsx             # Trip history dashboard
│   └── [tripId]/page.tsx    # Individual trip pages with clean URLs
components/
├── suggestion-bubbles-bar.tsx   # Orchestrates suggestion UI using useSuggestionEngine
├── suggestions/                # Extracted logistics forms + README
│   ├── flight-segments-form.tsx
│   ├── hotel-details-form.tsx
│   ├── travel-dates-form.tsx
│   └── README.md
├── chat-interface.tsx       # Main orchestrator component with auto-redirect (candidate for fuller streaming-utils adoption) (563 lines)
├── earth-visualization.tsx  # Three.js wrapper with SSR safety
├── message-bubble.tsx       # Simplified markdown renderer (104 lines - 61% reduction)
├── trip-history-dashboard.tsx # Main dashboard with search/filter
├── trip-card.tsx           # Individual trip display cards
├── itinerary-renderer.tsx  # Custom JSON itinerary renderer
├── user-menu.tsx           # User menu with trip history navigation
├── animated-background.tsx # Coordinated gradient + star animations
├── trip-page/
│   ├── mature-trip-page.tsx       # Refactored two-panel layout (273 lines - 15% reduction)
│   ├── trip-actions-header.tsx    # Trip management actions
│   ├── trip-chat-sidebar.tsx      # Chat history + new message input
│   └── trip-itinerary-display.tsx # Structured itinerary display
├── ui/
│   ├── button.tsx          # Base button with cursor-pointer
│   └── loading-spinner.tsx # Consistent loading states
lib/
├── suggestions-utils.ts  # Smart Suggestions Engine (canonical mapping, heuristics, hook)
├── itinerary-utils.ts      # Unified JSON extraction logic (58 lines)
├── markdown-components.tsx # Reusable ReactMarkdown config (96 lines)
├── streaming-utils.ts      # Chat streaming handlers (138 lines)
├── chat-utils.ts           # Message generators and trip context formatting
├── trip-service.ts         # Enhanced database service with filtering
```

### **Component Simplification Summary**

- **message-bubble.tsx**: 273 → 104 lines (61% reduction)
- **mature-trip-page.tsx**: 320 → 273 lines (15% reduction)
- **suggestion-bubbles-bar.tsx**: Monolithic logic split; merge/suppression effect removed in favor of `useSuggestionEngine`; forms extracted (net reduction of ~40% in orchestration complexity even if file still large due to UI code)
- **Total shared utilities**: 3 core + chat-utils (after deprecations)
- **Zero code duplication** across chat components

---

## ♿ Accessibility Implementation Summary

### Objectives

Establish a robust baseline (WCAG 2.1 AA-aligned) covering perceivable, operable, understandable, and robust principles without adding automated test tooling yet.

### Implemented Layers

1. Structure & Landmarks: Skip link, `main` landmark, region scoping (chat log, itinerary, dashboard results).
2. Keyboard: Roving focus in user menu, modal focus trap + ESC, popover autofocus & focus restoration.
3. Live Regions: Dual strategy — polite for streaming content; assertive only for critical errors (trip load / chat failure); phased itinerary announcements.
4. Contrast: Introduced `.text-contrast-*`, `.placeholder-contrast`, `.focus-ring-contrast`; removed opacity-based white text utilities.
5. Semantics & Noise Reduction: Decorative icons hidden, improved alt text, dynamic avatar alt, consistent form labeling, safe null checks.
6. Stability: Reconstructed `trip-history-dashboard.tsx` with accessible list semantics & live filtered count announcements after corruption.

### Utility Classes (defined in `globals.css`)

```
.text-contrast-secondary   // High legibility secondary text
.text-contrast-tertiary    // Standard metadata
.text-contrast-quaternary  // Muted hints / low emphasis
.placeholder-contrast      // Consistent placeholder styling
.focus-ring-contrast       // Unified focus outline on dark surfaces
```

### Guidelines

- Announce only major streaming phases (start/update/completion) to reduce screen reader verbosity.
- Maintain a single global assertive region; avoid nesting inside polite containers.
- Prefer semantic contrast tiers over ad-hoc opacity classes.
- Always restore originating focus after transient UI closes (modal/popover).

### Future (Optional) Enhancements

- High contrast / reduced motion toggles.
- Automated accessibility regression audits (axe-core + Playwright) with CI gate.
- Persisted accessibility preferences per user.
- Expanded `aria-describedby` chaining for multi-line form hints.

---

## 🔐 **Authentication & Security**

### **GitHub OAuth Setup**

- Supabase Auth with GitHub provider
- Automatic user creation on first login
- Row Level Security (RLS) enforces data isolation

### **Authentication Patterns**

````typescript
## 🔐 Authentication & Security

### **GitHub OAuth Setup**
- Supabase Auth with GitHub provider
- Automatic user creation on first login
- Row Level Security (RLS) enforces data isolation

### **Authentication Patterns**
```typescript
const { user, loading } = useAuth();
if (!user) return <AuthModal />;

// All /trips/* routes require authentication
// RLS policies ensure users only see their own data
````

---

## 🎨 Best Practices

### **Design System & Critical Patterns**

#### **Glass Morphism Theme**

```tsx
// Standard glass morphism pattern:
className =
  "bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20";

// Color system: OKLCH color space in app/globals.css
// Theme: Hard-coded dark mode, purple-blue gradients
```

#### **SSR Safety Requirements**

**Always use this pattern for Three.js and client-only components:**

```tsx
const [mounted, setMounted] = useState(false);
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setMounted(true);
  setIsClient(true);
}, []);

// Only render Canvas when: mounted && isClient
```

#### **Animation Patterns**

**IMPORTANT: Performance-Optimized Animation Strategy**

- ✅ **Homepage Only**: 3D globe and star animations for visual impact
- ✅ **Trip Pages**: No loading animations - snappy, immediate rendering
- ✅ **CSS Hover Transitions**: Maintained for interactive feedback
- ❌ **Removed**: framer-motion loading animations (initial/animate patterns)
- ❌ **Removed**: Staggered loading animations with delays

```tsx
// AVOID: Loading animations on trip pages (causes jitter)
// ❌ initial={{ opacity: 0, y: 20 }}
// ❌ animate={{ opacity: 1, y: 0 }}
// ❌ transition={{ delay: index * 0.1 }}

// PREFERRED: CSS transitions for interactions only
className="hover:border-purple-400/50 transition-all duration-300"

// HOMEPAGE ONLY: 3D and motion animations
<AnimatePresence>
  {showElement && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>
```

#### **3D Globe Positioning**

```tsx
// Fixed positioning pattern for Earth backdrop
className =
  "fixed bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[70%] w-[72rem] h-[72rem] z-0";
```

#### **Coordinated Animation System**

**Problem Solved:** Earth texture loading caused stars to appear before the earth, creating jarring visual transitions.

**Solution:** Custom event system with requestAnimationFrame coordination.

```tsx
// In earth-globe.tsx - Dispatch when texture loads
useEffect(() => {
  if (textureLoaded) {
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('earthTextureLoaded'));
    });
  }
}, [textureLoaded]);

// In animated-background.tsx - Listen for earth texture load
useEffect(() => {
  const handleEarthTextureLoaded = () => {
    setTimeout(() => setStarsVisible(true), 500); // 0.5s delay for smooth transition
  };

  window.addEventListener('earthTextureLoaded', handleEarthTextureLoaded);
  return () => window.removeEventListener('earthTextureLoaded', handleEarthTextureLoaded);
}, []);

// CSS transition for smooth star fade-in
transition: opacity 1.5s ease-in-out;
```

**Pattern Benefits:**

- Stars only appear after earth texture is fully loaded
- Smooth 1.5s transition prevents jarring pop-in
- requestAnimationFrame ensures proper rendering timing
- Custom events allow loose coupling between components

### **Common Gotchas & Solutions**

1. **Three.js Hydration**: Canvas must be wrapped in SSR safety checks
2. **Dynamic Imports**: Heavy components use `dynamic()` with `ssr: false`
3. **Window References**: Always check `typeof window !== "undefined"`
4. **Message IDs**: Use `Date.now().toString()` for unique identification
5. **Build Config**: TypeScript/ESLint errors ignored for faster builds
6. **Asset Optimization**: Images set to `unoptimized: true` in Next.js config
7. **Component State**: Initialize form state properly based on context (e.g., `showForm: !resumeTripId`)
8. **Cursor Styles**: All interactive elements need explicit `cursor-pointer` for better UX
9. **Layout Overlaps**: Position elements carefully to avoid logo/menu conflicts
10. **Route Structure**: Use dynamic routes `/trips/[tripId]` for clean URLs vs query parameters
11. **Hybrid Regeneration**: Never auto-return full JSON after granular edits; require user-triggered regenerate bubble.
12. **Performance**: Framer-motion entrance animations removed on trip pages (use static rendering + lightweight transitions only)
13. **3D Components**: Restrict heavy 3D visuals to homepage
14. **Animation Coordination**: Use custom events + rAF for Earth/Stars sequencing
15. **Auth Optimization**: Single `useAuth()` consumption per page boundary
16. **Auto-Redirect Timing**: Delay redirect (~2s) post-create for perceived stability
17. **Export Functionality**: Legacy PDF utils deprecated; centralize future export features server-side or dedicated module
18. **Shared Utilities**: Align function signatures; update all importers together
19. **Null Safety**: Avoid non-null assertions; prefer explicit guards
20. **API Consistency**: Propagate shared utility signature changes across chat + trip modules
21. **Type Safety**: Return structured objects (avoid loose primitives for multi-field results)
22. **Live Regions Discipline**: One assertive region only; token-level announcements avoided
23. **Contrast Tokens**: Use standardized `.text-contrast-*` classes
24. **Focus Restoration**: Return focus to bubble after form close
25. **Decorative Icons**: `aria-hidden` + no redundant titles
26. **Itinerary Streaming**: Announce only phase boundaries (start/update/completion)
27. **Avatar Alt Text**: Contextual; decorative avatars get empty alt
28. **Suggestion Persistence**: Dismissals stored in `localStorage` (`ts-dismissed-<tripId>`)
29. **Directive Hygiene**: Strip `ui_directives` fenced block pre-render

---

---

### � Roadmap Reference

The evolving roadmap has been extracted for clarity. Consult `ROADMAP.md` (repository root) for:

- Status snapshot & near-term objectives
- Engine evolution milestones
- Quality & testing strategy
- Observability metrics
- Backlog & deferred items

This main guide now focuses on architecture, implementation patterns, and current system behavior.

## 📊 Code Simplification & Suggestions Engine Summary

### **Major Accomplishments**

We recently completed a comprehensive code refactoring that significantly improved the codebase maintainability and reduced complexity:

#### **Component Size Reductions:**

- **message-bubble.tsx**: 273 → 104 lines (**61% reduction**)
- **mature-trip-page.tsx**: 320 → 273 lines (**15% reduction**)
- **chat-interface.tsx**: 598 → 563 lines (**6% reduction**)

#### **Current Shared Utilities:**

- **lib/itinerary-utils.ts** (58 lines): Unified JSON itinerary extraction logic
- **lib/markdown-components.tsx** (96 lines): Reusable ReactMarkdown component configuration
- **lib/streaming-utils.ts** (138 lines): Chat streaming response handlers
- **lib/chat-utils.ts**: Message generators and trip context formatting

#### **Benefits Achieved (Updated):**

- ✅ Zero code duplication across chat components
- ✅ Hybrid suggestion + explicit regeneration flow (avoids unnecessary rewrites)
- ✅ Hidden AI directive layer enabling runtime UI shaping without leaking control JSON
- ✅ Enhanced type safety with guarded null checks
- ✅ Improved maintainability (modular utilities & aggregated server suggestion generation)
- ✅ Performance gains: removed legacy table/PDF layers & animation overhead
- ✅ Runtime stability via deterministic suppression & explicit regeneration gating
- ✅ Infinite render loop eliminated in suggestions engine via callback ref + hash gating
- ✅ Future-ready for ranking, personalization, weather & budget modules

The codebase is now significantly more maintainable and provides a solid foundation for implementing Feature 3 and beyond.

---

## 🧪 Lightweight Smoke Tests & Validation

To ensure itinerary JSON extraction doesn't silently break, a minimal script `scripts/itinerary-smoke.ts` is included.

Run:

```bash
npm run test:itinerary
```

It validates that a fenced JSON block is detected and parsed, exiting non-zero if extraction fails. Extend or replace with a formal test harness later if desired.

### Suggested Future Validation

- Add minimal unit tests for streaming partial JSON edge cases
- CI step: run `npm run test:itinerary` (and future a11y regression suite)
- Optional bundle analysis: `ANALYZE=true next build` to watch size drift post Feature 3

## 📋 Quick Start for New Contributors

1. **Read this document** - Understand current system and patterns
2. **Setup environment** - Follow setup instructions above
3. **Find examples** - Look at existing components for established patterns
4. **Test changes** - Verify authentication flow and responsive design
5. **Follow conventions** - Use glass morphism, cursor-pointer, and animation patterns

---

This comprehensive guide provides everything needed to understand, develop, and extend the TripSmith codebase while maintaining consistency and quality.

---

## 🔗 Link Enrichment (F2)

### Goals

Introduce deterministic, pure deep links (flights & map locations) without mutating stored itinerary JSON or requiring AI regeneration.

### Implemented (Phase 1)

- `buildGoogleFlightsUrl()` – flight search query generation.
- `buildGoogleMapsSearchUrl()` – map query or lat/long viewport.
- Conditional rendering in `ItineraryRenderer` behind `NEXT_PUBLIC_DEEP_LINKS_ENABLED` flag.
- Accessible external link icons with descriptive `aria-label`s.

### Principles

1. Purity: no side effects, no network calls.
2. Isolation: enrichment only at render layer; original itinerary JSON remains unchanged.
3. Fail Safe: missing required fields → suppress link (no broken anchors).
4. Accessibility: icon conveys action; label clarifies destination.
5. Extensibility: future builders (hotel, transit) co-located in `lib/link-builders.ts`.

### Future Roadmap

- Hotel search links (check-in/out inference)
- Transit / directions builder (city heuristics)
- Analytics event `deep_link_click` (with type & entity) under F5
- Vitest URL snapshot tests (post TD2 harness)
- Error & suppression telemetry

### Anti-Goals (Current Phase)

- No affiliate tagging
- No scraping or dynamic pricing
- No server redirect layer

### Integration Notes

- Keep flag disabled in staging until link accuracy validated.
- When analytics on: wrap anchor `onClick` to emit event with debounce.

---
