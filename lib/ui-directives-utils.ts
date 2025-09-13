import { UiDirectivesPayload } from './types';

// Regex matches a fenced json code block that contains a top-level type: "ui_directives"
// We keep it permissive to allow whitespace and additional fields.
const UI_DIRECTIVES_BLOCK_REGEX = /```json\s*(\{[\s\S]*?\})\s*```/g;

export interface UiDirectiveParseResult {
  cleanedContent: string; // content safe to render (directives removed)
  uiDirectives?: UiDirectivesPayload; // parsed directives if present
}

/**
 * Attempts to locate a ui_directives JSON code block inside the assistant content.
 * If found, parses and removes it from the rendered string. Only the FIRST valid
 * ui_directives block is used (subsequent ones ignored to avoid multiple overrides).
 * Non-fatal parse errors are swallowed – we simply return original content untouched.
 */
export function parseUiDirectives(raw: string): UiDirectiveParseResult {
  if (!raw || raw.indexOf('```json') === -1) {
    return { cleanedContent: raw };
  }

  let match: RegExpExecArray | null;
  let used = false;
  let cleaned = raw;
  let directives: UiDirectivesPayload | undefined;

  // We iterate all json fenced blocks; pick the first with type === ui_directives
  while ((match = UI_DIRECTIVES_BLOCK_REGEX.exec(raw)) !== null) {
    const block = match[1];
    try {
      const parsed = JSON.parse(block);
      if (!used && parsed && parsed.type === 'ui_directives') {
        directives = parsed as UiDirectivesPayload;
        used = true;
        // Remove this exact fenced block from the cleaned content.
        cleaned = cleaned.replace(match[0], '').trim();
      }
    } catch (e) {
      // Ignore parsing errors – block might not be directives or incomplete.
    }
  }

  // Collapse leftover multiple blank lines after removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return { cleanedContent: cleaned, uiDirectives: directives };
}

/**
 * Convenience helper: strips only (returns content without directives) without parsing result.
 */
export function stripUiDirectives(raw: string): string {
  return parseUiDirectives(raw).cleanedContent;
}
