"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { ItineraryRenderer } from "@/components/itinerary-renderer";
import { ItineraryLoading } from "@/components/itinerary-loading";

// Process markdown content with table conversion
function processMarkdownContent(content: string) {
  // First, extract and convert tables
  const tableRegex = /\|(.+)\|\n\|([:\-\s\|]+)\|\n((?:\|.+\|\n?)*)/g;
  const tables: { original: string; html: string }[] = [];

  // Helper function to process markdown links and formatting in cell content
  function processLinks(text: string): string {
    // Convert markdown links [text](url) to HTML links
    let processed = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-purple-300 hover:text-purple-200 underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Convert bold text **text** to HTML
    processed = processed.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="text-white font-semibold">$1</strong>'
    );

    // Convert italic text *text* to HTML
    processed = processed.replace(
      /\*([^*]+)\*/g,
      '<em class="text-white/80 italic">$1</em>'
    );

    return processed;
  }

  let processedContent = content.replace(
    tableRegex,
    (match, headerRow, separatorRow, bodyRows) => {
      const headers = headerRow
        .split("|")
        .map((h: string) => h.trim())
        .filter((h: string) => h);
      const rows = bodyRows
        .trim()
        .split("\n")
        .map((row: string) =>
          row
            .split("|")
            .map((cell: string) => cell.trim())
            .filter((cell: string) => cell)
        );

      let tableHtml =
        '<div class="overflow-x-auto my-4 -mx-2 sm:-mx-4"><table class="w-full border-collapse border border-white/30 rounded-lg bg-black/20 text-xs sm:text-sm">';

      // Header
      tableHtml += '<thead class="bg-white/10"><tr>';
      headers.forEach((header: string) => {
        tableHtml += `<th class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-b border-white/30 break-words">${processLinks(
          header
        )}</th>`;
      });
      tableHtml += "</tr></thead>";

      // Body
      tableHtml += '<tbody class="divide-y divide-white/20">';
      rows.forEach((row: string[]) => {
        if (row.length > 0) {
          tableHtml += '<tr class="hover:bg-white/5 transition-colors">';
          row.forEach((cell: string) => {
            tableHtml += `<td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/90 border-b border-white/20 break-words">${processLinks(
              cell
            )}</td>`;
          });
          tableHtml += "</tr>";
        }
      });
      tableHtml += "</tbody></table></div>";

      const placeholder = `__TABLE_PLACEHOLDER_${tables.length}__`;
      tables.push({ original: match, html: tableHtml });
      return placeholder;
    }
  );

  return { processedContent, tables };
}

// Component to render content with tables
function MarkdownWithTables({ content }: { content: string }) {
  const { processedContent, tables } = processMarkdownContent(content);

  // Split content by table placeholders and render
  const parts = processedContent.split(/(__TABLE_PLACEHOLDER_\d+__)/);

  return (
    <>
      {parts.map((part, index) => {
        const tableMatch = part.match(/__TABLE_PLACEHOLDER_(\d+)__/);
        if (tableMatch) {
          const tableIndex = parseInt(tableMatch[1]);
          return (
            <div
              key={index}
              className="max-w-full overflow-hidden"
              style={{ maxWidth: "100%" }}
              dangerouslySetInnerHTML={{ __html: tables[tableIndex].html }}
            />
          );
        } else {
          return (
            <ReactMarkdown
              key={index}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-white mb-2 mt-0 break-words">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-semibold text-white mb-2 mt-3 break-words">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-medium text-white mb-1 mt-2 break-words">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/90 mb-2 leading-relaxed break-words hyphens-auto text-sm">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-white font-semibold break-words text-sm">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="text-white/80 italic break-words text-sm">
                    {children}
                  </em>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-purple-300 hover:text-purple-200 underline cursor-pointer break-words text-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-6 border-white/30" />,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-white/90 space-y-1 mb-2 break-words text-sm">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-white/90 space-y-1 mb-2 break-words text-sm">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-white/90 break-words text-sm">
                    {children}
                  </li>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 max-w-full">
                    <table
                      className="w-full max-w-full border-collapse border border-white/30 rounded-lg bg-black/20 text-xs sm:text-sm"
                      style={{ maxWidth: "100%", minWidth: "auto" }}
                    >
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/10">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-white/20">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-white/5 transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-b border-white/30 break-words">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/90 border-b border-white/20 break-words">
                    {children}
                  </td>
                ),
              }}
            >
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
