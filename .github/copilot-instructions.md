# TripSmith AI Travel Planner - Comprehensive Development Guide

## Project Overview

TripSmith is a Next.js 15 AI travel planning app with a cinematic dark theme, featuring an interactive 3D Earth globe and chat-based trip planning interface. The app uses React 19, Three.js for 3D visualizations, and streams responses via Vercel AI SDK with **JSON-only itinerary format**.

---

## 🔧 **Current State & Completed Features**

### **✅ Implemented Features**

- ✅ **Feature 1: Auto-Save Trips** - Real-time chat history + structured itinerary data
- ✅ **Feature 1.5: JSON-Only Itinerary System** - Jitter-free custom rendering with beautiful cards
- ✅ **Feature 2: Trip History Dashboard** - Complete trip management with search, filter, and navigation
- ✅ User authentication via GitHub OAuth
- ✅ Custom ItineraryRenderer component with color-coded sections
- ✅ Clean URL structure with `/trips/[tripId]` routing
- ✅ Enhanced UX with proper cursor states and navigation

### **🔧 Current Focus: Polish Features (Before Feature 3)**

1. **Mature Trip Page Layout** - Two-panel design with chat sidebar and itinerary display
2. **Accessibility AA Compliance** - WCAG 2.1 AA standards implementation

### **📋 Next Features**

- Feature 3: Smart Suggestions Engine
- Feature 4: Calendar Integration
- Feature 5: Collaborative Trip Planning

---

## 🗄️ **Database Schema & Integration**

### **Supabase Project Details**

- **Project ID**: `hycbjohjuhzovsqpodeq`
- **Organization**: timbenniks's Org (`civilian-red-xics6mm`)
- **Region**: eu-west-1
- **Status**: ACTIVE_HEALTHY

### **Core Tables**

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

### **Data Flow**

1. **Trip Creation**: User submits TripForm → Creates trip record → Returns tripId
2. **Chat Messages**: Stored in `chat_history` JSONB array
3. **Itinerary Data**: Extracted JSON stored in `itinerary_data` column
4. **Real-time Updates**: Each AI response updates both chat_history and itinerary_data

---

## 🤖 **AI Integration Architecture**

### **OpenAI Integration**

- **Model**: GPT-4.1 via Vercel AI SDK
- **Streaming**: Uses `streamText()` for real-time responses
- **Format**: JSON-only responses for complete itineraries

### **API Structure**

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

### **JSON-Only Itinerary System**

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

**Processing Flow:**

1. AI generates JSON-only response for complete itineraries
2. Chat interface detects JSON content with `extractItineraryData()`
3. JSON parsed and stored in message `itineraryData` property
4. `ItineraryRenderer` component creates beautiful card-based display
5. Raw JSON content hidden from user interface

---

## 🔐 **Authentication & Security**

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
```

---

## 🎨 **Design System & Critical Patterns**

### **Glass Morphism Theme**

```tsx
// Standard glass morphism pattern:
className =
  "bg-black/20 backdrop-blur-2xl border-white/30 shadow-2xl ring-1 ring-white/20";

// Color system: OKLCH color space in app/globals.css
// Theme: Hard-coded dark mode, purple-blue gradients
```

### **SSR Safety Requirements**

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

### **Animation Patterns**

```tsx
// Framer Motion standard patterns:
whileHover={{ y: -4, scale: 1.02 }}
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}

// AnimatePresence for conditional rendering
<AnimatePresence>
  {showElement && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>
```

### **3D Globe Positioning**

```tsx
// Fixed positioning pattern for Earth backdrop
className =
  "fixed bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[70%] w-[72rem] h-[72rem] z-0";
```

---

## 🏗️ **Component Architecture & State Management**

### **Core Component Flow**

1. **Entry Point**: `app/page.tsx` → Dynamic import of `ChatInterface` (SSR disabled)
2. **Auth Flow**: GitHub OAuth → User redirected to chat → Trip form shows
3. **Form Flow**: `TripForm` collects `TripDetails` → creates trip record
4. **Chat Flow**: User messages → `app/api/chat/route.ts` → GPT-4.1 responses
5. **Data Flow**: Parse JSON → Save markdown to chat + structured to `itinerary_data`

### **State Architecture**

- **No external state management** - local React state only
- **Message format**: `{id: string, role: "user"|"assistant", content: string, timestamp: Date, itineraryData?: any}`
- **Trip data**: `{timezone, destination, travelDates, purpose}` collected once, used throughout chat
- **Trip ID**: Generated on trip creation, passed to all chat API calls for persistence

### **Current File Organization**

```
app/
├── api/chat/route.ts         # AI streaming endpoint with system prompt
├── page.tsx                  # Dynamic import entry point
├── trips/
│   ├── page.tsx             # Trip history dashboard
│   └── [tripId]/page.tsx    # Individual trip pages with clean URLs
components/
├── chat-interface.tsx       # Main orchestrator component
├── earth-visualization.tsx  # Three.js wrapper with SSR safety
├── message-bubble.tsx       # Markdown rendering with JSON processing
├── trip-history-dashboard.tsx # Main dashboard with search/filter
├── trip-card.tsx           # Individual trip display cards
├── itinerary-renderer.tsx  # Custom JSON itinerary renderer
├── user-menu.tsx           # User menu with trip history navigation
├── ui/
│   ├── button.tsx          # Base button with cursor-pointer
│   └── loading-spinner.tsx # Consistent loading states
lib/
├── chat-utils.ts           # Message generators and trip context formatting
├── pdf-utils.ts            # PDF export functionality
├── trip-service.ts         # Enhanced database service with filtering
```

---

## 🎯 **Immediate Implementation: Mature Trip Page Layout**

### **Target Architecture**

Transform current single-column trip page into sophisticated two-panel layout:

- **Left Sidebar**: Chat history and input (30% width)
- **Center Panel**: Beautifully rendered itinerary (70% width)
- **Header Actions**: Delete, Download PDF, Share buttons (UI only for now)
- **Real-time Updates**: Chat changes update center itinerary

### **New Components Needed**

```tsx
// components/trip-page/mature-trip-page.tsx
interface MatureTripPageProps {
  tripId: string;
}

// components/trip-page/trip-chat-sidebar.tsx
interface TripChatSidebarProps {
  tripId: string;
  messages: Message[];
  onNewMessage: (message: Message) => void;
  onItineraryUpdate: (itinerary: any) => void;
}

// components/trip-page/trip-itinerary-display.tsx
interface TripItineraryDisplayProps {
  itineraryData: any;
  tripDetails: TripDetails;
  loading?: boolean;
}

// components/trip-page/trip-actions-header.tsx
interface TripActionsHeaderProps {
  tripName: string;
  onDelete: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
}
```

### **Layout Structure**

```
┌─────────────────────────────────────────────────────┐
│ Header: [Logo] Trip Name         [Del][PDF][Share]  │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│   Chat        │        Itinerary Display           │
│   Sidebar     │        (Center Panel)              │
│   (30%)       │            (70%)                   │
│               │                                     │
│ - Messages    │ ┌─────────────────────────────────┐ │
│ - Input       │ │  Trip Header                    │ │
│ - History     │ │  ├─ Traveler, Dates, Purpose   │ │
│               │ │  Flight Information             │ │
│               │ │  Accommodation                  │ │
│               │ │  Daily Schedule                 │ │
│               │ │  Recommendations                │ │
│               │ └─────────────────────────────────┘ │
└───────────────┴─────────────────────────────────────┘
```

---

## ♿ **Accessibility Implementation (AA Compliance)**

### **WCAG 2.1 AA Requirements**

#### **Immediate Checklist**

- [ ] Text contrast: 4.5:1 minimum for normal text
- [ ] All images have alt text (logo, user avatars)
- [ ] Form inputs have associated labels
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible on all focusable elements
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] ARIA labels for complex interactions
- [ ] Screen reader announcements for dynamic content

#### **Testing Tools**

```bash
npm install -g pa11y
pa11y http://localhost:3001
pa11y http://localhost:3001/trips
```

#### **Implementation Patterns**

```tsx
// Form labels
<label htmlFor="destination-input" className="sr-only">
  Trip Destination
</label>
<Input
  id="destination-input"
  aria-describedby="destination-help"
  placeholder="Where are you traveling?"
/>

// Trip card accessibility
<Card
  role="button"
  tabIndex={0}
  aria-label={`Open trip to ${trip.destination} on ${trip.travel_dates?.formatted}`}
  onKeyDown={(e) => e.key === 'Enter' && onSelect()}
>

// Modal focus management
useEffect(() => {
  if (isOpen) {
    modalRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }
}, [isOpen]);
```

---

## 🛠️ **Development Environment & Setup**

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
```

### **Build Configuration**

- TypeScript/ESLint errors ignored for faster builds (`next.config.mjs`)
- Images set to `unoptimized: true`
- Dynamic imports used for SSR-sensitive components

---

## 🐛 **Common Gotchas & Solutions**

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

---

## 🚀 **Adding Features & Development Patterns**

### **New Chat Commands**

- Add utilities to `lib/chat-utils.ts` following `generate*Message()` pattern
- Update system prompt in `app/api/chat/route.ts` for new capabilities
- Use structured markdown for consistent formatting

### **New UI Components**

- Follow shadcn/ui patterns with dark theme OKLCH variables
- Apply glass morphism styling consistently
- Use `framer-motion` for animations with `initial/animate/exit` pattern
- Add `cursor-pointer` to all interactive elements

### **Database Operations**

- Add methods to `lib/trip-service.ts`
- Include proper error handling
- Test with RLS policies
- Update TypeScript interfaces

### **3D Enhancements**

- Modify `EarthGlobe` component with `useFrame` hook for animations
- Load additional textures following the `useEffect` pattern
- Maintain SSR safety with `mounted && isClient` checks

---

## 📋 **Quick Start for New Contributors**

1. **Read this document** - Understand current system and patterns
2. **Setup environment** - Follow setup instructions above
3. **Find examples** - Look at existing components for established patterns
4. **Test changes** - Verify authentication flow and responsive design
5. **Follow conventions** - Use glass morphism, cursor-pointer, and animation patterns

---

This comprehensive guide provides everything needed to understand, develop, and extend the TripSmith codebase while maintaining consistency and quality.
