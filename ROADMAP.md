# TripSmith Roadmap

> Living document. Keep concise; link deeper architecture details in `.github/copilot-instructions.md` where needed.

## 1. Status Snapshot

| Area                  | State             | Notes                                                         |
| --------------------- | ----------------- | ------------------------------------------------------------- |
| Core Architecture     | Stable            | Refactored utilities, suggestion engine hook shipped          |
| Accessibility         | Baseline Complete | Automation (axe / Playwright) deferred                        |
| Suggestions Engine    | V1 Stable         | Hash‑gated updates, directive parsing, suppression heuristics |
| Streaming / Itinerary | Stable            | JSON-only regeneration explicit, partial edits staged         |
| Performance           | Good              | Removed legacy PDF + heavy animations on trip pages           |
| Testing               | Minimal           | Smoke script only; unit/integration pending                   |

## 2. Near-Term (Next 4–6 Weeks)

1. Weather & Disruption Advisories (non-destructive helpfulNotes insertion; no itinerary rewrite).
2. User Preferences (schema + prompt enrichment; allow opt-out) — adds personalization seed.
3. ICS Calendar Export (server-generated from structured itinerary; no client PDF libs).
4. Suggestion Engine Ranking Layer (weight contextual vs deterministic vs directive sources).
5. Basic Test Harness (Vitest/Jest): suggestion engine cases + itinerary JSON extraction edge cases.

## 3. Engine Evolution

| Goal                  | Detail                                                      | Exit Criteria                                   |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Ranking Weights       | Introduce scoring pipeline (contextual, server, directives) | Deterministic order with tie-break docs         |
| Directive Schema v1   | Freeze `ui_directives` shape + version key                  | Validation + fallback path implemented          |
| Personalization Hooks | Use user preferences to bias suggestion scores              | Score delta visible in debug output             |
| Safe Expansion Guard  | Token length & section diffusion controls on regeneration   | Regen fails safely with truncated summary + log |

## 4. Quality & Testing

Planned Layers:

- Unit: `buildContextualSuggestions`, directive application, suppression (pendingRegen + stagedEdits permutations), hash gating (no redundant renders).
- Integration: Streaming endpoint returns fenced JSON; malformed directive block ignored gracefully.
- A11y Automation (Phase 1): axe-core scan of trip page + chat; Playwright script for suggestions keyboard nav.
- Performance Watch: Bundle diff check; streaming first-byte < 1.2s (p95) target (manual for now).

## 5. Observability & Metrics

Initial Metrics (dev console or lightweight endpoint):

- `suggestion_recompute_count`
- `regen_trigger_count`
- `stream_completion_ms` (client measured)
- `directive_parse_fail_count`

Logging Guidelines:

- Warn (not error) on unknown directive IDs.
- Error only on JSON itinerary parse failure post-regeneration.

## 6. Backlog

- Deep Links (Flights, Maps, Transit) – safe param encoding util.
- Budget Heuristic (cost placeholder fields + advisory notes).
- Email Export (HTML itinerary digest) server-rendered.
- Preference Weight Tuning (adjust via feature flag / env gate).
- Multi-trip comparison view (light matrix of duration, cost estimate stub).

## 7. Deferred / Parking Lot

- PDF Export (server-side, after email export baseline).
- Monetization (Stripe: premium exports, advanced heuristics).
- Admin Dashboard (trip counts, user activity, system diagnostics).
- Advanced Analytics (Plausible integration once baseline metrics stable).

## 8. Change Log

| Date       | Change                                      | Notes                                  |
| ---------- | ------------------------------------------- | -------------------------------------- |
| 2025-09-14 | Extracted roadmap from copilot instructions | Added structured sections & priorities |

---

**Editing Rules:** Keep sections lean; move deep rationale to architecture guide. Avoid duplicating live code comments.
