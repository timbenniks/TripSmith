import { extractItineraryData, hasCompleteItinerary, getPreJsonContent } from './itinerary-utils';

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  itineraryData?: any;
  isItinerary?: boolean;
  isGeneratingItinerary?: boolean;
}

export interface StreamingOptions {
  /** Whether to handle JSON itinerary generation with loading states */
  handleItineraryGeneration?: boolean;
  /** Callback when message content is updated during streaming */
  onMessageUpdate?: (messageId: string, content: string, isGeneratingItinerary?: boolean) => void;
  /** Callback when streaming is complete */
  onStreamComplete?: (messageId: string, finalContent: string, itineraryData?: any) => void;
}

/**
 * Core streaming message handler for chat responses
 * Handles reading from response stream and updating message content
 */
export async function handleStreamingResponse(
  response: Response,
  messageId: string,
  options: StreamingOptions = {}
): Promise<{ content: string; itineraryData?: any }> {
  const {
    handleItineraryGeneration = false,
    onMessageUpdate,
    onStreamComplete
  } = options;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No reader available");
  }

  let assistantMessage = "";
  const decoder = new TextDecoder();

  // Stream processing loop
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    if (chunk) {
      assistantMessage += chunk;

      if (handleItineraryGeneration) {
        // Enhanced streaming with itinerary generation detection
        const hasJsonStart = assistantMessage.includes("```json");
        const isCompleteItinerary = hasCompleteItinerary(assistantMessage);

        if (hasJsonStart && !isCompleteItinerary) {
          // Show loading state during JSON generation
          const preJsonContent = getPreJsonContent(assistantMessage);
          onMessageUpdate?.(
            messageId,
            preJsonContent || "Generating your itinerary...",
            true // isGeneratingItinerary
          );
        } else if (!hasJsonStart) {
          // Normal text streaming
          onMessageUpdate?.(messageId, assistantMessage, false);
        }
        // If hasJsonStart && isCompleteItinerary, let final processing handle it
      } else {
        // Simple streaming - just update content
        onMessageUpdate?.(messageId, assistantMessage, false);
      }
    }
  }

  // Process final content for itinerary data
  let finalContent = assistantMessage;
  let itineraryData: any = undefined;

  if (handleItineraryGeneration) {
    const itineraryResult = extractItineraryData(assistantMessage);
    if (itineraryResult.hasItinerary) {
      finalContent = itineraryResult.displayContent;
      itineraryData = itineraryResult.itineraryData;
    }
  }

  // Notify completion
  onStreamComplete?.(messageId, finalContent, itineraryData);

  return {
    content: finalContent,
    itineraryData
  };
}

/**
 * Creates a new assistant message object
 */
export function createAssistantMessage(): Message {
  return {
    id: (Date.now() + 1).toString(),
    role: "assistant",
    content: "",
    timestamp: new Date(),
  };
}

/**
 * Helper to make chat API request
 */
export async function makeChatRequest(
  messages: Message[],
  tripId?: string
): Promise<Response> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      tripId,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}
