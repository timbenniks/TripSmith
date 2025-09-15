# TripSmith AI Travel Planner - Architecture Guide

> **Note**: This file contains essential architectural patterns. For active tasks, see GitHub Issues. For AI instructions, see `.cursorrules`.

> **Stack**: Next.js 15, React 19, TypeScript, Supabase, OpenAI GPT-4, Three.js  
> **Theme**: Cinematic dark theme with glass morphism and 3D visualizations

## 🔧 Tech Stack & Architecture

### **Core Technologies**

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with glass morphism design
- **3D Graphics**: Three.js for Earth globe visualization
- **AI Integration**: OpenAI GPT-4 via Vercel AI SDK
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth (GitHub OAuth) with SSR cookie sessions
- **Deployment**: Vercel (production-ready)

### **Database Schema**

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

### **AI Integration Architecture**

- **Model**: GPT-4 via Vercel AI SDK
- **Streaming**: Uses `streamText()` for real-time token delivery
- **Format**: Full itinerary JSON returned only when user explicitly requests regeneration

### **JSON-Only Itinerary System**

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
  "flights": [...],
  "accommodation": [...],
  "dailySchedule": [...],
  "recommendations": [...]
}
```

**Processing Flow:**

1. AI generates JSON-only response for complete itineraries
2. Chat interface detects JSON content with `extractItineraryData()`
3. JSON parsed and stored in message `itineraryData` property
4. `ItineraryRenderer` component creates beautiful card-based display
5. Raw JSON content hidden from user interface

## 🏗️ Core Architecture Patterns

### **Authentication & Security**

**SSR-first Authentication:**

```typescript
// Server-side gate for protected routes
export default async function TripsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return <>{children}</>;
}

// API route auth pattern
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params; // Next.js 15 async params
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ...handle request
}
```

### **Export System Architecture**

**Normalizer Pattern:**

```typescript
// lib/export-normalizer.ts - Pure transformation utility
export function normalizeItineraryToEvents(input: any): NormalizedItinerary {
  // Converts itinerary JSON to exportable events for PDF/ICS
}
```

**Unicode Sanitization for PDF:**

```typescript
function sanitizeTextForPdf(text: string): string {
  return text
    .replace(/→/g, "->") // Arrow character to ASCII
    .replace(/–/g, "-") // En dash to hyphen
    .replace(/"/g, '"') // Smart quotes to regular quotes
    .replace(/[^\x00-\x7F]/g, "?"); // Replace remaining non-ASCII with ?
}
```

### **Design System Patterns**

**Glass Morphism Theme:**

```tsx
// Standard glass morphism pattern
className =
  // Accessibility contrast utilities
  "bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20"
    .text -
  contrast -
  secondary.text - // High legibility secondary text
  contrast -
  tertiary.text - // Standard metadata
  contrast -
  quaternary.focus - // Muted hints / low emphasis
  ring -
  contrast; // Unified focus outline on dark surfaces
```

**SSR Safety for Three.js:**

```tsx
const [mounted, setMounted] = useState(false);
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setMounted(true);
  setIsClient(true);
}, []);

// Only render Canvas when: mounted && isClient
```

### **Shared Utility Architecture**

**Core Utilities:**

- `lib/export-normalizer.ts` - Itinerary to events transformer (PDF/ICS)
- `lib/itinerary-utils.ts` - JSON extraction logic (58 lines)
- `lib/streaming-utils.ts` - Chat streaming handlers (138 lines)
- `lib/suggestions-utils.ts` - Smart suggestions engine with suppression
- `lib/link-builders.ts` - Deep links (flights, hotels, maps, transit)

### **File Structure**

```
app/
├── api/
│   ├── chat/route.ts         # AI streaming endpoint
│   └── trips/[tripId]/export/  # Export API routes
│       ├── pdf/route.ts      # PDF export with Unicode sanitization
│       └── ics/route.ts      # ICS calendar export
├── trips/
│   ├── layout.tsx           # Server-side auth gate
│   └── [tripId]/page.tsx    # Individual trip pages
components/
├── trip-page/
│   ├── trip-actions-header.tsx    # Trip management actions
│   ├── trip-chat-sidebar.tsx      # Chat history + input
│   └── trip-itinerary-display.tsx # Structured itinerary display
├── itinerary-renderer.tsx  # JSON itinerary renderer with deep links
├── suggestion-bubbles-bar.tsx # Orchestrates suggestion UI
lib/
├── export-normalizer.ts    # Pure itinerary-to-events transformer
├── itinerary-utils.ts      # JSON extraction logic
├── streaming-utils.ts      # Chat streaming handlers
└── supabase-server.ts      # SSR client helper
```

## 🎨 Critical Implementation Patterns

### **Performance Optimization**

- **Homepage Only**: 3D globe and star animations for visual impact
- **Trip Pages**: No loading animations - snappy, immediate rendering
- **CSS Hover Transitions**: Maintained for interactive feedback
- **Bundle Optimization**: Removed unused dependencies and animations

### **Common Gotchas & Solutions**

1. **Next.js 15 Async Params**: Always `await params` before accessing properties
2. **Unicode in PDFs**: Use `sanitizeTextForPdf()` for WinAnsi encoding compatibility
3. **Export Loading States**: Separate state per format (PDF vs ICS)
4. **Three.js Hydration**: Canvas must be wrapped in SSR safety checks
5. **Auth Patterns**: Use `getServerClient()` for API routes, layout gates for pages
6. **Suggestion Persistence**: Store dismissals in `localStorage: ts-dismissed-<tripId>`
7. **Error Handling**: Log with `error-logger` utility and show user-friendly messages

### **Accessibility Requirements**

- WCAG 2.1 AA baseline compliance
- Focus traps in modals and dialogs
- Live regions for streaming content and errors
- Semantic contrast utilities
- Keyboard navigation support
- Screen reader compatibility

This guide covers the essential architectural patterns. For specific implementation details, refer to the codebase and GitHub Issues for active development tasks.
