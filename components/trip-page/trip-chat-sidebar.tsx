"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "@/components/message-bubble";
import { Message } from "@/lib/chat-utils";
import { ChatInput } from "@/components/chat-input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SuggestionBubblesBar } from "@/components/suggestion-bubbles-bar";
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
  currentItinerary?: any;
}

export function TripChatSidebar({
  tripId,
  messages,
  onNewMessage,
  onItineraryUpdate,
  tripDetails,
  isLoading = false,
  onSendMessage,
  currentItinerary,
}: TripChatSidebarProps) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            <p className="text-xs text-contrast-tertiary truncate">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 min-w-0">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-lg ring-1 ring-white/20 p-6">
                  <div className="text-4xl mb-3">💬</div>
                  <h4 className="font-medium text-white mb-2">
                    Start the conversation
                  </h4>
                  <p className="text-sm text-contrast-tertiary">
                    Ask me anything about your trip to {tripDetails.destination}
                  </p>
                </Card>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  disableAnimation
                />
              ))
            )}

            {/* Typing Indicator */}
            {(isLoading || isTyping) && (
              <div className="flex justify-start">
                <Card className="bg-black/20 backdrop-blur-2xl border-white/30 shadow-lg ring-1 ring-white/20 p-4">
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-contrast-tertiary text-sm">
                      TripSmith is thinking...
                    </span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Input & Suggestions */}
      <div className="flex-shrink-0 p-3 sm:p-4 border-t border-white/20">
        <div className="mb-2">
          <SuggestionBubblesBar
            tripId={tripId}
            destination={tripDetails.destination}
            firstTravelDate={undefined}
            daySpan={undefined}
            itineraryData={currentItinerary}
            aiDirectives={(() => {
              // Get latest assistant message with uiDirectives
              for (let i = messages.length - 1; i >= 0; i--) {
                const m: any = messages[i];
                if (m.role === "assistant" && m.uiDirectives)
                  return m.uiDirectives;
              }
              return undefined;
            })()}
            onPrefillPrompt={(text) => {
              // Insert or replace current selection with suggestion text (non-sending)
              const existing = textareaRef.current?.value || "";
              const prefix =
                existing.trim().length > 0
                  ? existing.replace(/\s+$/, "") + "\n"
                  : "";
              const nextVal = prefix + text;
              setInput(nextVal);
              requestAnimationFrame(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                  // Place caret at end
                  textareaRef.current.selectionStart =
                    textareaRef.current.selectionEnd =
                      textareaRef.current.value.length;
                }
              });
            }}
            onApplyPrompt={async (prompt) => {
              try {
                await onSendMessage(prompt);
              } catch (e) {
                console.error("Failed applying suggestion", e);
              }
            }}
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder={`Ask about your trip to ${tripDetails.destination}...`}
              className="w-full bg-black/20 backdrop-blur-xl border border-white/30 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder:placeholder-contrast focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] text-sm"
              rows={2}
              disabled={isLoading}
              ref={textareaRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <p className="text-xs text-contrast-quaternary order-2 sm:order-1">
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
