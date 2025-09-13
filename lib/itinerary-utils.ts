/**
 * Utilities for handling itinerary data extraction and processing
 */

export interface ItineraryExtractionResult {
  hasItinerary: boolean;
  itineraryData?: any;
  displayContent: string;
}

/**
 * Extracts JSON itinerary data from AI response content
 * Handles both streaming (partial content) and complete responses
 */
export function extractItineraryData(content: string): ItineraryExtractionResult {
  const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);

  if (jsonMatch) {
    try {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.type === "complete_itinerary") {
        // Extract content before JSON block for display
        const beforeJson = content.substring(0, content.indexOf("```json")).trim();

        return {
          hasItinerary: true,
          itineraryData: jsonData,
          displayContent: beforeJson || "Here's your complete itinerary:",
        };
      }
    } catch (e) {
      console.log("Failed to parse JSON:", e);
    }
  }

  return {
    hasItinerary: false,
    displayContent: content,
  };
}

/**
 * Checks if content contains a complete JSON itinerary block
 */
export function hasCompleteItinerary(content: string): boolean {
  const hasJsonStart = content.includes("```json");
  const hasJsonEnd = content.includes("}```") || content.includes("}\n```");
  return hasJsonStart && hasJsonEnd;
}

/**
 * Extracts just the content before JSON block (useful for streaming)
 */
export function getPreJsonContent(content: string): string {
  const jsonIndex = content.indexOf("```json");
  if (jsonIndex === -1) return content;
  return content.substring(0, jsonIndex).trim();
}
