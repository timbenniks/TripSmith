"use client";

import { useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const formEvent = new Event("submit") as any;
      onSend(formEvent);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(e);
  };

  return (
    <div className="flex-shrink-0 border-t border-white/30 bg-black/20 backdrop-blur-2xl p-6 relative z-10 shadow-2xl ring-1 ring-white/20">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <Textarea
            ref={inputRef}
            value={value}
            onChange={onChange}
            onKeyPress={handleKeyPress}
            placeholder="Ask TripSmith to plan your business trip..."
            className="flex-1 bg-white/15 backdrop-blur-md border-white/40 focus:border-white/60 focus:bg-white/20 transition-all duration-300 text-white placeholder:text-white/70 shadow-inner resize-none"
            disabled={isLoading}
            aria-label="Chat message input"
            rows={5}
          />
          <Button
            type="submit"
            disabled={!value.trim() || isLoading}
            className="px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 backdrop-blur-sm border-purple-500/40 text-white transition-all duration-500 hover:shadow-lg hover:shadow-purple-500/20 relative overflow-hidden group cursor-pointer"
            aria-label="Send message"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-all duration-700 transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]" />
            <Send className="h-4 w-4 relative z-10" />
          </Button>
        </form>
        <p className="text-xs text-white/60 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
