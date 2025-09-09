# TripSmith AI Travel Planner - Copilot Instructions

## Project Overview

TripSmith is a Next.js 15 AI travel planning app with a cinematic dark theme, featuring an interactive 3D Earth globe and chat-based trip planning interface. The app uses React 19, Three.js for 3D visualizations, and streams responses via Vercel AI SDK with **hybrid AI response format** (markdown + structured JSON).

## Supabase Integration

**Project Details:**

- **Project ID**: `hycbjohjuhzovsqpodeq`
- **Organization**: timbenniks's Org (`civilian-red-xics6mm`)
- **Region**: eu-west-1
- **Status**: ACTIVE_HEALTHY
- **MCP**: Supabase MCP server available with 29 tools

**Implemented Features:**

- ✅ **Feature 1: Auto-Save Trips** - Real-time chat history + structured itinerary data
- ✅ **Feature 1.5: JSON-Only Itinerary System** - Jitter-free custom rendering with beautiful cards
- ✅ User authentication via GitHub OAuth
- ✅ JSON-only responses for complete itineraries (eliminates streaming table jitter)
- ✅ Custom ItineraryRenderer component with color-coded sections
- ✅ Trip creation and database persistence

**Next Features:**

- Feature 2: Trip History Dashboard
- Feature 3: Smart Suggestions Engine
- Feature 4: Calendar Integration
- Feature 5: Collaborative Trip Planning

## Architecture & Critical Patterns

### JSON-Only Itinerary System (NEW - Sept 10, 2025)

**Problem Solved:** Eliminated jittery table rendering during AI streaming responses.

**Solution Architecture:**

- **Conversations**: Standard markdown streaming for natural chat flow
- **Complete Itineraries**: JSON-only responses processed by custom renderer
- **No Raw JSON Display**: Users only see beautiful rendered components

**AI Response Format for Itineraries:**

```json
{
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
  "accommodation": [
    {
      "property": "Hotel Gracery Shinjuku",
      "checkIn": "March 15",
      "checkOut": "March 22",
      "roomType": "Deluxe Room"
    }
  ],
  "dailySchedule": [
    {
      "date": "March 16",
      "activities": [
        {
          "time": "09:00",
          "activity": "Conference Registration",
          "location": "Tokyo International Forum"
        }
      ]
    }
  ],
  "recommendations": [
    {
      "category": "Local Cuisine",
      "items": ["Tsukiji Outer Market", "Ramen Street"]
    }
  ]
}
```

**Processing Flow:**

1. AI generates JSON-only response for complete itineraries
2. Chat interface detects JSON content with `extractItineraryData()`
3. JSON parsed and stored in message `itineraryData` property
4. `ItineraryRenderer` component creates beautiful card-based display
5. Raw JSON content hidden from user interface
6. Enhanced loading animation: "Creating your perfect itinerary..."

**Key Components:**

- `components/itinerary-renderer.tsx` - Custom renderer with color-coded sections
- Enhanced `chat-interface.tsx` - JSON detection and parsing logic
- Updated `message-bubble.tsx` - Conditional rendering (JSON vs markdown)
- Modified `app/api/chat/route.ts` - Clear JSON-only format instructions

### Legacy Hybrid AI Response System (DEPRECATED)

**Previous approach - kept for reference:**

```json
{
  "markdown": "# Complete Trip Itinerary\n\n## Flight Schedule...",
  "structured": {
    "tripHeader": { "travelerName": "...", "destination": "..." },
    "flights": [{ "date": "2025-09-09", "flightNumber": "BA 374" }],
    "accommodation": [{ "property": "The Hoxton Shoreditch" }],
    "dailySchedule": [{ "time": "08:00", "activity": "Conference" }]
  }
}
```

**Processing Flow:**

1. AI streams response → Chat interface parses for JSON blocks
2. If hybrid JSON found → Extract markdown for display + structured data for DB
3. Save markdown to `chat_history`, structured data to `itinerary_data` column
4. Enables future features: calendar integration, budget tracking, analytics

### SSR Safety Requirements

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

### Component Flow

1. **Entry Point**: `app/page.tsx` → Dynamic import of `ChatInterface` (SSR disabled)
2. **Auth Flow**: GitHub OAuth → User redirected to chat → Trip form shows
3. **Form Flow**: `TripForm` collects `TripDetails` (no name field - from auth) → creates trip record
4. **Chat Flow**: User messages → `app/api/chat/route.ts` → GPT-4.1 hybrid responses
5. **Data Flow**: Parse JSON → Save markdown to chat + structured to `itinerary_data`
6. **3D Backdrop**: `EarthVisualization` → `EarthGlobe` (Three.js sphere with Earth texture)

### State Architecture

- **No external state management** - local React state only
- **Message format**: `{id: string, role: "user"|"assistant", content: string, timestamp: Date}`
- **Trip data**: `{timezone, destination, travelDates, purpose}` collected once, used throughout chat
- **Trip ID**: Generated on trip creation, passed to all chat API calls for persistence
- **Window dimensions** tracked for responsive 3D positioning

## Development Workflow

### Build Commands

- `npm run dev` - Development (Next.js 15)
- `npm run build` - Production build (ignores TS/ESLint errors per `next.config.mjs`)

### Core Dependencies & Patterns

- **AI Streaming**: `@ai-sdk/openai` + `ai` package with GPT-4.1 for streaming chat responses
- **Database**: Supabase with `TripService` class for all database operations
- **Authentication**: GitHub OAuth via Supabase Auth
- **3D Graphics**: `@react-three/fiber` + `@react-three/drei` (texture loading in `useEffect`)
- **UI System**: shadcn/ui with custom OKLCH color variables in `app/globals.css`
- **Animations**: `framer-motion` for all transitions (use `AnimatePresence` for chat messages)

### File Organization

```
app/
├── api/chat/route.ts     # AI streaming endpoint with system prompt
├── page.tsx             # Dynamic import entry point
components/
├── chat-interface.tsx   # Main orchestrator component
├── earth-visualization.tsx # Three.js wrapper with SSR safety
├── message-bubble.tsx   # Markdown rendering with custom table processing
lib/
├── chat-utils.ts       # Message generators and trip context formatting
├── pdf-utils.ts        # PDF export functionality
```

## Design System Specifics

### Glass Morphism Pattern

**Consistent styling across all UI components:**

```tsx
className =
  "bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20";
```

### Theme System

- **Hard-coded dark mode**: `enableSystem={false}` in theme provider
- **OKLCH color space** for better color consistency in `app/globals.css`
- **Purple-blue gradients**: Primary branding color scheme

### 3D Globe Positioning

```tsx
// Fixed positioning pattern for Earth backdrop
className =
  "fixed bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[70%] w-[72rem] h-[72rem] z-0";
```

## Integration Points

### AI Chat Integration

- **Streaming**: Uses `streamText()` from `ai` SDK with OpenAI provider
- **Context injection**: Trip details automatically included in system prompt
- **Response format**: Structured markdown with tables for itineraries

### Message Processing

- **Table rendering**: Custom markdown processor in `MessageBubble` converts markdown tables to HTML
- **Export functions**: Both markdown download and PDF generation via `jspdf`
- **Link handling**: Automatic conversion of markdown links with purple styling

### Three.js Asset Loading

```tsx
// Texture loading pattern to prevent SSR issues
useEffect(() => {
  if (typeof window !== "undefined") {
    const loader = new THREE.TextureLoader();
    const texture = loader.load("/images/texture_earth.jpg", () =>
      setTextureLoaded(true)
    );
    setEarthTexture(texture);
  }
}, []);
```

## Common Gotchas

1. **Three.js Hydration**: Canvas must be wrapped in SSR safety checks
2. **Dynamic Imports**: Heavy components use `dynamic()` with `ssr: false`
3. **Window References**: Always check `typeof window !== "undefined"`
4. **Message IDs**: Use `Date.now().toString()` for unique identification
5. **Build Config**: TypeScript/ESLint errors ignored for faster builds
6. **Asset Optimization**: Images set to `unoptimized: true` in Next.js config

## Adding Features

### New Chat Commands

- Add utilities to `lib/chat-utils.ts` following `generate*Message()` pattern
- Update system prompt in `app/api/chat/route.ts` for new capabilities
- Use structured markdown for consistent formatting

### New UI Components

- Follow shadcn/ui patterns with dark theme OKLCH variables
- Apply glass morphism styling consistently
- Use `framer-motion` for animations with `initial/animate/exit` pattern

### 3D Enhancements

- Modify `EarthGlobe` component with `useFrame` hook for animations
- Load additional textures following the `useEffect` pattern
- Maintain SSR safety with `mounted && isClient` checks
