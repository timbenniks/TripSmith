# TripSmith AI Travel Planner - Copilot Instructions

## Project Overview

TripSmith is a Next.js 15 AI travel planning app with a cinematic dark theme, featuring an interactive 3D Earth globe and chat-based trip planning interface. The app uses React 19, Three.js for 3D visualizations, and streams responses via Vercel AI SDK.

## Supabase Integration

**Project Details:**

- **Project ID**: `hycbjohjuhzovsqpodeq`
- **Organization**: timbenniks's Org (`civilian-red-xics6mm`)
- **Region**: eu-west-1
- **Status**: ACTIVE_HEALTHY
- **MCP**: Supabase MCP server available with 29 tools

**Planned Features:**

- User authentication and accounts
- Saved trips and trip history
- User preferences and smart defaults
- Trip sharing and collaboration

## Architecture & Critical Patterns

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
2. **Form Flow**: `TripForm` collects `TripDetails` → triggers chat transition via `setShowForm(false)`
3. **Chat Flow**: User messages → `app/api/chat/route.ts` → Streaming responses via `ai` SDK
4. **3D Backdrop**: `EarthVisualization` → `EarthGlobe` (Three.js sphere with Earth texture)

### State Architecture

- **No external state management** - local React state only
- **Message format**: `{id: string, role: "user"|"assistant", content: string, timestamp: Date}`
- **Trip data**: `{name, timezone, destination, travelDates, purpose}` collected once, used throughout chat
- **Window dimensions** tracked for responsive 3D positioning

## Development Workflow

### Build Commands

- `npm run dev` - Development (Next.js 15)
- `npm run build` - Production build (ignores TS/ESLint errors per `next.config.mjs`)

### Core Dependencies & Patterns

- **AI Streaming**: `@ai-sdk/openai` + `ai` package for streaming chat responses
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
