"use client";

import dynamic from "next/dynamic";

const ChatInterface = dynamic(
  () =>
    import("@/components/chat-interface").then((mod) => ({
      default: mod.ChatInterface,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading TripSmith...</p>
        </div>
      </div>
    ),
  }
);

export default function TripSmithApp() {
  return (
    <div className="h-screen bg-background text-foreground">
      <ChatInterface />
    </div>
  );
}
