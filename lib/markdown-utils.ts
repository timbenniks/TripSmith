/**
 * Utilities for processing markdown tables in chat messages
 */

interface TableProcessingResult {
  processedContent: string;
  tables: { original: string; html: string }[];
}

/**
 * Processes markdown links and formatting in text content
 */
function processMarkdownLinks(text: string): string {
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

/**
 * Generates HTML for a single table from markdown table data
 */
function generateTableHTML(headers: string[], rows: string[][]): string {
  let tableHtml =
    '<div class="overflow-x-auto my-4 -mx-2 sm:-mx-4"><table class="w-full border-collapse border border-white/30 rounded-lg bg-black/20 text-xs sm:text-sm">';

  // Header
  tableHtml += '<thead class="bg-white/10"><tr>';
  headers.forEach((header: string) => {
    tableHtml += `<th class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-b border-white/30 break-words">${processMarkdownLinks(
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
        tableHtml += `<td class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/90 border-b border-white/20 break-words">${processMarkdownLinks(
          cell
        )}</td>`;
      });
      tableHtml += "</tr>";
    }
  });
  tableHtml += "</tbody></table></div>";

  return tableHtml;
}

/**
 * Processes markdown content and extracts tables for separate rendering
 * Returns processed content with table placeholders and table HTML
 */
export function processMarkdownContent(content: string): TableProcessingResult {
  const tableRegex = /\|(.+)\|\n\|([:\-\s\|]+)\|\n((?:\|.+\|\n?)*)/g;
  const tables: { original: string; html: string }[] = [];

  const processedContent = content.replace(
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

      const tableHtml = generateTableHTML(headers, rows);
      const placeholder = `__TABLE_PLACEHOLDER_${tables.length}__`;

      tables.push({ original: match, html: tableHtml });
      return placeholder;
    }
  );

  return { processedContent, tables };
}

/**
 * Splits processed content by table placeholders for rendering
 */
export function splitContentByTables(processedContent: string): string[] {
  return processedContent.split(/(__TABLE_PLACEHOLDER_\d+__)/);
}

/**
 * Checks if a content part is a table placeholder
 */
export function isTablePlaceholder(part: string): { isTable: boolean; tableIndex?: number } {
  const tableMatch = part.match(/__TABLE_PLACEHOLDER_(\d+)__/);

  if (tableMatch) {
    return {
      isTable: true,
      tableIndex: parseInt(tableMatch[1])
    };
  }

  return { isTable: false };
}
