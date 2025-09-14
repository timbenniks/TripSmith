# Suggestions Module

Refactor extraction from `suggestion-bubbles-bar.tsx` to reduce complexity.

## Files

- `flight-segments-form.tsx` – Multi‑leg flight entry UI (outbound / inbound) with a11y semantics, live region messaging via parent.
- `hotel-details-form.tsx` – Hotel name + stay dates with reversed range auto-swap.
- `travel-dates-form.tsx` – Start/end dates form with span display and validation.
- `../../lib/suggestions-utils.ts` – Pure helpers: canonical ID mapping + contextual suggestion builder + shared `InternalSuggestion` type.

## Principles

1. Pure logic (suggestion construction, canonical mapping) lives in `lib/`.
2. Components are presentational + controlled: all state is owned by the parent bar.
3. Accessibility parity preserved: ESC closes forms, focus restoration handled in parent, live-region strings still emitted by bar.
4. No regeneration side-effects performed inside form components (parent sets `pendingRegen` + `stagedEdits`).
5. Testability: pure functions now isolated and can be unit tested without React.

## Suggestion Engine Hook

Implemented: `useSuggestionEngine` now lives in `lib/suggestions-utils.ts`.

### Responsibilities

1. Merge contextual + aggregated deterministic + AI directive-driven suggestions.
2. Apply suppression rules (dismissals, staged logistic edits while `pendingRegen`, early-noise heuristics for seasonal / etiquette / transit hints).
3. Interpret `ui_directives` actions: `hide`, `show`, `prefillMode`, `sendMode`, `highlight`, `orderingHints`.
4. Canonical ID normalization & de-duplication with highlight precedence.
5. Debounced polite live-region announcement when the effective suggestion set changes.

### Component Impact

`suggestion-bubbles-bar.tsx` no longer holds merge/effect complexity; it:

- Builds contextual suggestions via `buildContextualSuggestions`.
- Manages form open/close, staged edit flags, dismissals, and announcements.
- Consumes the finalized `suggestions` array from the hook for rendering.

### Testing Strategy (Deferred)

Because the hook is isolated and pure aside from React state/refs, future tests can:

- Feed synthetic contextual/api/directive inputs and snapshot resulting IDs/modes.
- Assert suppression under `pendingRegen` + `stagedEdits` permutations.
- Verify directive ordering + highlight precedence.
- Mock `onAnnounce` to ensure debounce behavior (advance fake timers).

No tests added yet to avoid dependency bloat; hook design intentionally supports later Jest/Vitest coverage.
