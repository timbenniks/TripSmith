"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageBubble, Message } from "@/components/message-bubble";
import { ChatInput } from "@/components/chat-input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MessageSquare, Send } from "lucide-react";

interface TripDetails {
  timezone: string;
  destination: string;
  travelDates: string;
  purpose: string;
}

interface TripChatSidebarProps {
  tripId: string;
  messages: Message[];
  onNewMessage: (message: Message) => void;
  onItineraryUpdate: (itinerary: any) => void;
  tripDetails: TripDetails;
  isLoading?: boolean;
  onSendMessage: (content: string) => Promise<void>;
}

export function TripChatSidebar({
  tripId,
  messages,
  onNewMessage,
  onItineraryUpdate,
  tripDetails,
  isLoading = false,
  onSendMessage,
}: TripChatSidebarProps) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    setInput("");
    setIsTyping(true);

    try {
      await onSendMessage(messageContent);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const exportItinerary = (content: string) => {
    if (typeof window === "undefined") return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tripsmith-itinerary.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportItineraryAsPDF = async (content: string) => {
    // PDF export functionality would go here
    console.log("PDF export not yet implemented");
  };

  return (
    <div className="h-full flex flex-col bg-black/20 backdrop-blur-2xl border-r border-white/30 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-400/30">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-purple-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-white text-sm truncate">
              Trip Chat
            </h3>
            <p className="text-xs text-white/60 truncate">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-lg ring-1 ring-white/20 p-6">
                  <div className="text-4xl mb-3">💬</div>
                  <h4 className="font-medium text-white mb-2">
                    Start the conversation
                  </h4>
                  <p className="text-sm text-white/70">
                    Ask me anything about your trip to {tripDetails.destination}
                  </p>
                </Card>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onCopy={copyToClipboard}
                  onExport={exportItinerary}
                  onExportPDF={exportItineraryAsPDF}
                />
              ))
            )}

            {/* Typing Indicator */}
            {(isLoading || isTyping) && (
              <div className="flex justify-start">
                <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-lg ring-1 ring-white/20 p-4">
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-white/70 text-sm">
                      TripSmith is thinking...
                    </span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/20">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={`Ask about your trip to ${tripDetails.destination}...`}
              className="w-full bg-black/20 backdrop-blur-xl border border-white/30 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] text-sm"
              rows={2}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <p className="text-xs text-white/50 order-2 sm:order-1">
              Press Enter to send, Shift+Enter for new line
            </p>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm order-1 sm:order-2"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
