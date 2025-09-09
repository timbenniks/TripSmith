"use client";

import { motion } from "framer-motion";
import { Copy, Download, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

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
        '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-white/30 rounded-lg bg-black/20">';

      // Header
      tableHtml += '<thead class="bg-white/10"><tr>';
      headers.forEach((header: string) => {
        tableHtml += `<th class="px-4 py-3 text-left text-sm font-semibold text-white border-b border-white/30">${processLinks(
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
            tableHtml += `<td class="px-4 py-3 text-sm text-white/90 border-b border-white/20">${processLinks(
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
              dangerouslySetInnerHTML={{ __html: tables[tableIndex].html }}
            />
          );
        } else {
          return (
            <ReactMarkdown
              key={index}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold text-white mb-2 mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold text-white mb-2 mt-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-medium text-white mb-1 mt-2">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/90 mb-2 leading-relaxed">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-white font-semibold">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="text-white/80 italic">{children}</em>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-purple-300 hover:text-purple-200 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-6 border-white/30" />,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-white/90 space-y-1 mb-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-white/90 space-y-1 mb-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-white/90">{children}</li>
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
}

interface MessageBubbleProps {
  message: Message;
  onCopy: (content: string) => void;
  onExport: (content: string) => void;
  onExportPDF?: (content: string) => void;
}

export function MessageBubble({
  message,
  onCopy,
  onExport,
  onExportPDF,
}: MessageBubbleProps) {
  const [isPdfExporting, setIsPdfExporting] = useState(false);

  // Check if this is an itinerary message by looking for certain keywords
  const isItinerary =
    message.role === "assistant" &&
    (message.content.toLowerCase().includes("itinerary") ||
      message.content.toLowerCase().includes("day 1") ||
      message.content.toLowerCase().includes("schedule") ||
      message.content.includes("|")); // Contains tables which are likely itinerary items

  const handlePdfExport = async () => {
    if (!onExportPDF || isPdfExporting) return;

    setIsPdfExporting(true);
    try {
      await onExportPDF(message.content);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setIsPdfExporting(false);
    }
  };
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "flex",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <Card
        className={cn(
          "w-full p-4 backdrop-blur-2xl border shadow-2xl ring-1 ring-white/20",
          message.role === "user"
            ? "bg-black/20 text-white border-white/30"
            : "bg-black/20 text-white border-white/30"
        )}
      >
        {message.role === "assistant" ? (
          <div className="space-y-3">
            <div className="max-w-none text-white">
              <MarkdownWithTables content={message.content} />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-white/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(message.content)}
                className="text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExport(message.content)}
                className="text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Download className="h-3 w-3 mr-1" />
                Export MD
              </Button>
              {isItinerary && onExportPDF && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePdfExport}
                  disabled={isPdfExporting}
                  className="text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {isPdfExporting ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3 mr-1" />
                  )}
                  {isPdfExporting ? "Generating..." : "Export PDF"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}
      </Card>
    </motion.div>
  );
}
