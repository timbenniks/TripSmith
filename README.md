# 🌍 TripSmith - AI Travel Planner

TripSmith is a Next.js 15 AI travel planning app with a cinematic dark theme, featuring an interactive 3D Earth globe and chat-based trip planning interface. Plan your perfect business trip with the power of AI and a beautiful, immersive user experience.

![TripSmith Preview](public/images/tripsmith-logo.png)

## ✨ Features

### 🎯 **Current Features**

- **🔐 GitHub OAuth Authentication** - Secure user authentication with Supabase Auth
- **🌍 Interactive 3D Earth Globe** - Three.js powered Earth visualization as backdrop
- **🤖 AI-Powered Trip Planning** - Streaming AI responses with OpenAI integration
- **💬 Real-time Chat Interface** - Dynamic conversation-based trip planning
- **🎨 Glass Morphism UI** - Beautiful dark theme with glass morphism design
- **📱 Responsive Design** - Optimized for desktop and mobile devices
- **🔒 Secure Database** - Row Level Security with Supabase PostgreSQL

### 🚧 **Planned Features** (See [FEATURE_PLAN.md](FEATURE_PLAN.md))

- **💾 Auto-Save Trips** - Automatic trip persistence to database
- **📚 Trip History Dashboard** - Manage and continue previous trips
- **⚙️ User Preferences** - Personalized AI responses based on travel preferences
- **🤝 Trip Sharing & Collaboration** - Share trips and collaborate with others

## 🛠️ Technology Stack

### **Frontend**

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Three.js** - 3D Earth globe visualization
- **Framer Motion** - Smooth animations and transitions
- **shadcn/ui** - Modern UI components
- **Tailwind CSS** - Utility-first CSS framework

### **Backend & Database**

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database with Row Level Security
  - Real-time subscriptions
  - Authentication and user management
- **OpenAI API** - AI-powered travel recommendations
- **Vercel AI SDK** - Streaming AI responses

### **Development Tools**

- **ESLint & Prettier** - Code formatting and linting
- **Husky** - Git hooks for code quality
- **TypeScript** - Static type checking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### 1. Clone the Repository

```bash
git clone https://github.com/timbenniks/TripSmith.git
cd TripSmith
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

The app uses Supabase with the following tables:

- `trips` - User trip data and chat history
- `user_preferences` - User travel preferences
- Row Level Security (RLS) policies for data protection

### 5. OAuth Configuration

Configure GitHub OAuth in your Supabase project:

1. Go to Authentication → Providers in Supabase Dashboard
2. Enable GitHub provider
3. Add your GitHub OAuth app credentials
4. Set callback URL to: `https://your-project-id.supabase.co/auth/v1/callback`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app in action!

## 🏗️ Project Structure

```
tripsmith-app/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── chat/                 # AI chat API endpoint
│   ├── auth/                     # Authentication routes
│   ├── globals.css               # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── auth-modal.tsx           # Authentication modal
│   ├── auth-provider.tsx        # Auth context provider
│   ├── chat-interface.tsx       # Main chat interface
│   ├── earth-globe.tsx          # Three.js Earth component
│   ├── trip-form.tsx            # Trip details form
│   └── user-menu.tsx            # User dropdown menu
├── lib/
│   ├── chat-utils.ts            # Chat utilities and types
│   ├── supabase.ts              # Supabase client configuration
│   └── utils.ts                 # General utilities
├── public/
│   └── images/                  # Static assets
├── FEATURE_PLAN.md              # Detailed feature roadmap
└── README.md                    # Project documentation
```

## 🎨 Design System

### **Theme**

- **Primary Colors**: Purple/Blue gradient (`#8b5cf6` to `#3b82f6`)
- **Background**: Dark theme with gradient (`slate-900` to `purple-900`)
- **Glass Morphism**: `bg-black/20 backdrop-blur-2xl border-white/30`

### **Components**

- **Consistent styling** across all UI components
- **OKLCH color space** for better color consistency
- **Responsive design** with mobile-first approach
- **Accessible** UI with proper contrast ratios

## 🌍 3D Earth Globe

The centerpiece of TripSmith is an interactive 3D Earth globe built with Three.js:

- **Realistic Earth texture** with day/night cycle
- **Smooth rotation animation**
- **SSR-safe implementation** with proper hydration
- **Responsive positioning** that adapts to screen size
- **Future**: Click-to-select destinations and flight path visualization

## 🤖 AI Integration

TripSmith uses OpenAI's GPT models for intelligent travel planning:

- **Streaming responses** for real-time conversation
- **Context-aware suggestions** based on trip details
- **Structured trip itineraries** with tables and formatting
- **Future**: Personalized recommendations based on user preferences

## 📊 Database Schema

### **trips table**

```sql
trips (
  id: UUID (Primary Key)
  user_id: UUID (Foreign Key to auth.users)
  name: TEXT
  destination: TEXT
  travel_dates: JSONB
  purpose: TEXT
  status: ENUM ('planning', 'booked', 'completed')
  chat_history: JSONB
  preferences: JSONB
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

### **user_preferences table**

```sql
user_preferences (
  id: UUID (Primary Key)
  user_id: UUID (Foreign Key to auth.users)
  travel_style: ENUM ('budget', 'mid-range', 'luxury')
  budget_range: JSONB
  preferred_activities: TEXT[]
  dietary_restrictions: TEXT[]
  accessibility_needs: TEXT[]
  notification_preferences: JSONB
  default_timezone: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

## 🚦 Development Roadmap

See [FEATURE_PLAN.md](FEATURE_PLAN.md) for detailed implementation timeline:

- **Phase 1**: Auto-Save Trips (Week 1)
- **Phase 2**: Trip History Dashboard (Week 2)
- **Phase 3**: User Preferences (Week 3)
- **Phase 4**: Trip Sharing & Collaboration (Week 4)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Supabase** - For the amazing backend-as-a-service platform
- **OpenAI** - For powerful AI capabilities
- **Three.js** - For beautiful 3D graphics
- **shadcn/ui** - For excellent UI components
- **Vercel** - For seamless deployment and AI SDK

## 📧 Contact

**Tim Benniks** - [@timbenniks](https://github.com/timbenniks)

Project Link: [https://github.com/timbenniks/TripSmith](https://github.com/timbenniks/TripSmith)

---

**Built with ❤️ for travelers who want intelligent, beautiful trip planning.**
