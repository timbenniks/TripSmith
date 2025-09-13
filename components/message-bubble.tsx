"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { ItineraryRenderer } from "@/components/itinerary-renderer";
import { ItineraryLoading } from "@/components/itinerary-loading";
import {
  processMarkdownContent,
  splitContentByTables,
  isTablePlaceholder,
} from "@/lib/markdown-utils";
import { chatMarkdownComponents } from "@/lib/markdown-components";

// Component to render content with tables
function MarkdownWithTables({ content }: { content: string }) {
  const { processedContent, tables } = processMarkdownContent(content);

  // Split content by table placeholders and render
  const parts = splitContentByTables(processedContent);

  return (
    <>
      {parts.map((part, index) => {
        const placeholderResult = isTablePlaceholder(part);
        if (
          placeholderResult.isTable &&
          placeholderResult.tableIndex !== undefined
        ) {
          return (
            <div
              key={index}
              className="max-w-full overflow-hidden"
              style={{ maxWidth: "100%" }}
              dangerouslySetInnerHTML={{
                __html: tables[placeholderResult.tableIndex].html,
              }}
            />
          );
        } else {
          return (
            <ReactMarkdown key={index} components={chatMarkdownComponents}>
              {part}
            </ReactMarkdown>
          );
        }
      })}
    </>
  );
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  itineraryData?: any; // For structured itinerary data
  isItinerary?: boolean; // Flag to indicate this is a rendered itinerary
  isGeneratingItinerary?: boolean; // Flag to show loading animation
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "flex w-full min-w-0",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <Card
        className={cn(
          "p-3 sm:p-4 backdrop-blur-2xl border shadow-2xl ring-1 ring-white/20 break-words min-w-0 overflow-hidden",
          message.role === "user"
            ? "bg-black/20 text-white border-white/30 max-w-[85%] sm:max-w-[80%]"
            : "bg-black/20 text-white border-white/30 flex-1 max-w-full"
        )}
      >
        {message.role === "assistant" ? (
          <div className="space-y-3">
            <div className="w-full text-white break-words overflow-wrap-anywhere text-sm">
              {message.isGeneratingItinerary ? (
                <ItineraryLoading />
              ) : message.isItinerary && message.itineraryData ? (
                <div className="space-y-4">
                  {/* Only render the beautiful itinerary - hide the raw JSON */}
                  <ItineraryRenderer data={message.itineraryData} />
                </div>
              ) : (
                <MarkdownWithTables content={message.content} />
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm break-words overflow-wrap-anywhere">
            {message.content}
          </p>
        )}
      </Card>
    </motion.div>
  );
}
