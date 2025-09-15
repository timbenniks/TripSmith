# TripSmith Roadmap

> Agent & contributor oriented. High signal, low fluff. Detailed architectural rationale lives in `.github/copilot-instructions.md`.

---

## 1. Product Vision (Condensed)

Plan trips through a conversational + structured hybrid flow: fast logistics capture, explicit regeneration, cinematic UI. Next phase: enrich itineraries with trusted contextual intelligence (weather/disruption), actionable links, and sharing/export surfaces while hardening platform (auth variants, analytics, admin, tests, performance, monetization runway).

## 2. Guiding Principles

1. Non-destructive enhancements: advisory layers append; never silently overwrite core itinerary JSON.
2. Explicit user intent for heavy regen (already implemented) preserved across new features.
3. Accessibility + performance baselines must not regress (WCAG AA baseline & no gratuitous animation on trip pages).
4. Observability before monetization: instrumentation precedes pricing.
5. Small vertical slices: each task merges to main production-ready.
6. Feature flags for anything that touches billing or external risk (Stripe, public sharing).

## 3. Status Legend

`[NS]` Not Started `[IP]` In Progress `[RDY]` Ready for QA `[BLK]` Blocked `[DONE]` Complete `[HLD]` On Hold

## 4. Feature / Track Codes

| Code | Track / Feature                                                   |
| ---- | ----------------------------------------------------------------- |
| F1   | Weather & Disruption Advisories (Deferred)                        |
| F2   | Smart Deep Links (flights, venues, hotels, transit)               |
| F3   | Trip Management Core (Delete, Public Share, Email Share, Exports) |
| F3D  | Delete Trip (sub-slice)                                           |
| F3S  | Sharing (public link + email)                                     |
| F3X  | Export Layer (PDF + ICS)                                          |
| F4   | Google OAuth Login                                                |
| F5   | Advanced Analytics (Plausible + custom events)                    |
| F6   | Admin Dashboard & User Tools                                      |
| TD1  | Accessibility Full Audit & Fixes                                  |
| TD2  | Test Harness (Vitest)                                             |
| TD3  | Performance Optimization Pass                                     |
| TD4  | Codebase Simplification & Convergence                             |
| M1   | Monetization (Stripe + Plans + Feature Flags)                     |

> Consolidation: Export PDF + ICS under F3X to share transformation pipeline (render → convert → deliver).

## 5. High-Level Dependency Graph

```
F1 (advisories) -> optional input to itinerary renderer (no blocking deps)
F2 depends on stable itinerary schema (current) + link enrichment util
F3S (public share) depends on stable auth + trip read endpoint (exists) + share-token table
F3X depends on itinerary renderer stability + PDF/ICS generation modules
F4 (Google OAuth) independent, but precedes M1 (plans may tie to provider identity consistency)
F5 (Analytics) should land before Admin (F6) & Monetization (M1)
F6 depends on F5 events + base auth + optional F4 for expanded identity coverage
M1 depends on F4 (multi-provider), F5 (metrics), partial F6 (admin view) and TD2 (tests on billing logic)
TD tasks cut across; TD2 ideally before M1 billing logic
```

## 6. PRDs (Concise)

### F2 Smart Deep Links

Goal: Add actionable links (Google Flights, Maps search, Hotel, Transit directions) to itinerary items.
Scope (In): Deterministic URL builders; safe encoding; appended link metadata under each relevant object (e.g., flight, daily activity). Batch post-processing after itinerary JSON parse.
Scope (Out): Affiliate integration, dynamic price scraping.
User Stories:

- I can click a flight link to open a prefilled Google Flights search.
- I can open a venue location directly on Google Maps.
  Data: Extend objects with `links: { flight?: string; maps?: string; hotel?: string; transit?: string }`.
  Acceptance:

1. No 4xx for constructed URLs (basic encode tests).
2. Links only appear when required fields available.
3. Feature flag `DEEP_LINKS_ENABLED` toggles enrichment.
   Status: [IP]
   Progress: Flight link builder, Maps link builder, itinerary renderer integration, and architecture docs shipped behind flag `NEXT_PUBLIC_DEEP_LINKS_ENABLED`.
   Next Slice Targets:
   - F2-BE-3 Hotel search link builder (property + city + check-in/out)
   - F2-BE-4 Transit directions URL builder (origin/destination heuristics)
   - F2-FE-2 A11y: improved aria-label tooltips + focus styles for link icons
   - F2-QA-1 (post TD2) Vitest snapshot/encoding tests for builders
   - F2-AN-1 Analytics event `deep_link_click` (after F5 baseline)
   - F2-OBS-1 Suppression telemetry for skipped links (missing required fields)

### F3 Trip Management Core

Umbrella for deletion, sharing, exports.

#### F3D Delete Trip

Goal: Allow user to permanently delete their trip.
Acceptance: Soft confirm modal; RLS ensures only owner; cascade removes chat & itinerary metadata.
Status: [IP]

Progress:

- API route `DELETE /api/trips/[tripId]` with auth + ownership + structured errors [DONE]
- Client service `tripService.deleteTrip` refactored to call API route (centralized logic) [DONE]
- Accessible confirm dialog component (focus trap, ESC, overlay, busy state) [DONE]
- Integrated modal into `MatureTripPage` replacing `window.confirm` [DONE]

Next:

- F3D-FE-1 refine: Add optimistic removal in dashboard list (remove card immediately; revert on failure)
- F3D-DB-1 verify / document cascading delete (RLS + potential future relations) [NS]
- F3D-QA-1 (Deferred until TD2): Authorization + cascade test harness [HLD]

Decision Log:

- Moved deletion responsibility from direct Supabase client calls to API to prepare for future audit logging / soft-delete semantics.
- Confirm dialog implemented as reusable `ConfirmDialog` (UI layer) to support upcoming share revoke & export cancel patterns.

#### F3S Sharing

Goal: Public read-only share links (with optional expiry) and a basic manage flow. Email share is deferred.
Scope (Delivered):

- `trip_shares` table with RLS; unique `public_token`, `created_at`, optional `expires_at`.
- API endpoints: `POST /api/share` (create), `GET /api/share?tripId=...` (list), `DELETE /api/share?token=...` (revoke).
- Public SSR route: `/share/[token]` renders a read-only snapshot via Supabase RPC.
- Share dialog in trip page: native date input for expiry; shows generated URL with Copy; link to Manage.
- Manage Shares dialog: list + copy + revoke (revoke-only; creation lives in Share dialog).
- Robust absolute URL origin resolution (env-first fallback to request headers).
  Acceptance: Expired/invalid tokens 404; revoke removes access; URLs copyable; no PII beyond itinerary snapshot.
  Status: [DONE]

#### F3X Export Layer (PDF + ICS)

Goal: Unified export pipeline producing PDF & calendar file (one per trip) off current itinerary JSON.
Approach: Server function builds normalized itinerary events, passes to PDF renderer (lightweight library, avoid heavy bundlers) & ICS generator (ics package). Store transient artifact in memory stream → response download.
Acceptance:

1. Export does not mutate DB.
2. PDF contains trip header + each day schedule.
3. ICS includes date/time for each daily event with summary.
4. Errors surface user-friendly message; logged via `error-logger`.
   Status: [NS]

### F4 Google OAuth

Goal: Add Google as alternative login provider.
Scope: Supabase provider config, UI button, privacy & terms pages.
Acceptance: User can link existing GitHub account via same email (account linking path documented), else new user created.
Status: [NS]

### F5 Advanced Analytics

Goal: Instrument core funnel + itinerary interactions.
Scope: Integrate Plausible script (feature flag), custom events for: trip_create, trip_delete, regen_itinerary, advisory_fetch, export_pdf, export_ics, share_create.
Acceptance: Events visible in Plausible dashboard; can be toggled off in dev.
Status: [NS]

### F6 Admin Dashboard & User Tools

Goal: Internal-only dashboard to view aggregate metrics & basic user management.
Scope: Protected route `/admin`; metrics cards (trip count, active users last 7d, exports last 7d). User list with ability to resend confirmation (Supabase function) & deactivate (soft flag `deactivated_at`).
Acceptance: Non-admin 403; all queries paginated; no PII beyond email & counts.
Status: [NS]

### TD1 Accessibility Audit

Goal: Full sweep with axe / Playwright. Document issues + fixes.
Status: [NS]

### TD2 Test Harness

Goal: Introduce Vitest + minimal suites (suggestion engine suppression cases, itinerary JSON extraction edge cases, link builder).
Status: [NS]

### TD3 Performance Pass

Goal: Measure & optimize TTFB, hydration cost, reduce bundle drift post-new features.
Status: [NS]

### TD4 Codebase Simplification & Convergence

Goal: Reduce cognitive load, unify streaming/chat paths, and prepare surface for reliable tests & future features (exports, advisories) without duplication.
Scope (In): Extraction of hooks from monoliths, removal/quarantine of deprecated modules, unification of streaming logic, modularization of suggestions engine, introduction of date & link utility modules.
Scope (Out): Architectural rewrites (no state machine yet), full design system overhaul, performance micro-optimizations (covered by TD3).
Success Metrics: Reduced largest component (<400 lines), single streaming implementation, <5% diff in bundle size after refactor, zero regression in itinerary generation.
Risks: Parallel feature work conflicting with file splits → mitigate by landing TD4 tasks before starting F1 & F2 heavy UI changes.
Status: [NS]

### M1 Monetization (Stripe)

Goal: Paid plan gating (exports, advanced advisories tiers) after analytics baseline.
Status: [NS]

## 7. Task Breakdown (Actionable)

Format: `TASK_ID  [Track]  Category  Desc  Status`
Categories: FE, BE, DB, AI, OPS, QA, DOC, SEC

### F2 Deep links

- F2-BE-1 [F2] BE Utility: flight link builder (origin, destination, date) Google Flights URL encode [DONE]
- F2-BE-2 [F2] BE Utility: maps link builder (lat/long or name) [DONE]
- F2-FE-1 [F2] FE Extend itinerary renderer to show link icons (aria-label) [DONE]
- F2-DOC-1 [F2] DOC Update architecture guide (link enrichment section) [DONE]

### TD4 SSR Auth & Route Protection

- TD4-SEC-1 [TD4] OPS Middleware SSR session refresh (bind cookies, call getUser, write back cookies) [DONE]
- TD4-SEC-2 [TD4] BE Standardize API auth checks with getServerClient() + auth.getUser() (optional Bearer) [DONE]
- TD4-SEC-3 [TD4] FE Remove client-side auth redirects/spinners from /trips pages [DONE]
- TD4-SEC-4 [TD4] FE Add server-side gate for /trips via app/trips/layout.tsx [DONE]
- TD4-SEC-5 [TD4] DOC Update architecture guide + file structure for SSR auth [DONE]
- TD4-SEC-6 [TD4] BE Remove /api/auth/ping test endpoint [DONE]
- TD4-OPS-2 [TD4] OPS Upgrade Next.js to 15.4.2 [DONE]
- TD4-BE-4 [TD4] BE Protect Suggestions API with server-side auth check [DONE]

### F3 Trip Management

- F3D-DB-1 [F3D] DB Ensure ON DELETE CASCADE covers related tables [NS]
- F3D-FE-1 [F3D] FE Delete action + confirm modal + optimistic UI [DONE]
- F3D-FE-2 [F3D] FE Remove dashboard delete overlay (delete within trip page) [DONE]
- F3S-DB-1 [F3S] DB Create `trip_shares` table + index on token [DONE]
- F3S-BE-1 [F3S] BE Endpoint POST /api/share (create token + snapshot + expiry) [DONE]
- F3S-BE-2 [F3S] BE Public route `/share/[token]` SSR (read-only snapshot render via RPC) [DONE]
- F3S-BE-3 [F3S] BE GET /api/share (list by tripId) + DELETE /api/share (revoke by token) [DONE]
- F3S-FE-1 [F3S] FE Share dialog: native date input, create + show URL, Copy, link to Manage [DONE]
- F3S-FE-2 [F3S] FE Manage shares dialog: list + copy + revoke (revoke-only) [DONE]
- F3S-FE-3 [F3S] FE Email share form + rate limit client handling [NS]
- F3X-BE-1 [F3X] BE Normalized itinerary event builder (pure) [NS]
- F3X-BE-2 [F3X] BE PDF generator module (no heavy deps) [NS]
- F3X-BE-3 [F3X] BE ICS generator (ics pkg) [NS]
- F3X-FE-1 [F3X] FE Export buttons + loading states [NS]

### F4 Google OAuth

- F4-OPS-1 [F4] OPS Supabase provider config [NS]
- F4-FE-1 [F4] FE Add Google button & provider selection UI [NS]
- F4-DOC-1 [F4] DOC Privacy + Terms pages content draft [NS]

### F5 Analytics

- F5-FE-1 [F5] FE Add Plausible script [NS]
- F5-BE-1 [F5] BE Emit server events for advisory fetch & exports [NS]
- F5-BE-2 [F5] BE Event util wrapper (debounce duplicate events) [NS]

### F6 Admin

- F6-DB-1 [F6] DB Add `roles` or `is_admin` flag to user profile table [NS]
- F6-BE-1 [F6] BE Admin metrics aggregate query service [NS]
- F6-FE-1 [F6] FE Admin dashboard shell + auth guard [NS]
- F6-FE-2 [F6] FE User table (paginate) + resend confirmation action [NS]

### TD1 Accessibility

- TD1-FE-1 [TD1] FE Fix identified critical violations (focus order, labels) [NS]

### TD2 Tests

- TD2-OPS-1 [TD2] OPS Add Vitest config + test script [NS]
- TD2-AI-1 [TD2] AI Unit tests suggestion suppression heuristics [NS]
- TD2-BE-1 [TD2] BE Itinerary JSON extraction edge tests (partial stream cases) [NS]

### TD3 Performance

- TD3-OPS-1 [TD3] OPS Add bundle analyzer script (flag triggered) [NS]
- TD3-FE-1 [TD3] FE Code split export modules [NS]
- TD3-BE-1 [TD3] BE Measure advisory endpoint p95 latency instrumentation [NS]

### TD4 Codebase Simplification

- TD4-FE-1 [TD4] FE Extract `useTripBootstrap` hook from `chat-interface.tsx` (resume logic + date span) [NS]
- TD4-FE-2 [TD4] FE Extract `useStreamingChat` wrapping `handleStreamingResponse` replacing inline send logic [NS]
- TD4-FE-3 [TD4] FE Add `LiveRegions` component; remove inline polite/assertive div duplication [NS]
- TD4-UTIL-1 [TD4] UTIL Create `lib/date-utils.ts` (travel date parsing) and migrate usage [NS]
- TD4-UTIL-2 [TD4] UTIL Create `lib/link-builders.ts` scaffolding (flight/maps placeholders) [NS]
- TD4-UTIL-3 [TD4] UTIL Split `suggestions-utils.ts` into canonical/contextual/engine modules + barrel [NS]
- TD4-LEGACY-1 [TD4] LEGACY Remove unused legacy `lib/pdf-utils.ts` & `lib/markdown-utils.ts` [DONE]
- TD4-TST-1 [TD4] TST Add initial Vitest config + smoke test for itinerary extraction (coordinates with TD2) [NS]
- TD4-FE-4 [TD4] FE Extract `SuggestionBubble` + `SuggestionFormContainer` from `suggestion-bubbles-bar.tsx` [NS]
- TD4-FE-5 [TD4] FE Unify legacy `chat-interface` streaming with mature trip page implementation [NS]
- TD4-FE-6 [TD4] FE Reduce `chat-interface.tsx` below 400 LOC post-extraction [NS]

Note: TD4-TST-1 seeds test harness but full suite expansion remains under TD2. Avoid duplicating configuration effort.

### M1 Monetization (Later)

- M1-DB-1 [M1] DB Plan tables (plans, user_plans, feature_flags) [NS]
- M1-BE-1 [M1] BE Stripe webhook handler (checkout.session.completed) [NS]
- M1-FE-1 [M1] FE Upgrade CTA + paywall wrappers [NS]

## 8. Operational Conventions

- One PR = one task ID (or tightly coupled pair) referencing acceptance criteria.
- Update status inline in this file OR maintain separate issue tracker mapping (optional). Keep file canonical for agents.
- Add new tasks at the bottom of the respective feature block to preserve reference stability.

## 9. Metrics & Alerts (Initial Targets)

- Advisory fetch p95 < 1500ms (external API variable).
- Export generation < 3s for typical 7-day trip.
- Suggestion engine suppression error rate (exceptions) = 0.
- Conversion (trip created → itinerary regenerated) baseline recorded pre-monetization.

## 10. Editing Rules

Keep PRDs concise; move deep algorithm notes to architecture guide. Do not duplicate code comments. Preserve task IDs once published; deprecate by marking `[HLD]` or `[DONE]` not deleting.

---

Backlog Items not yet PRD'ed (expansion candidates): multi-locale, offline mode, collaborative editing, weather alert push, personalization ranking.

## 11. Deferred QA Tasks (Placeholder)

Reintroduced later when test harness (TD2) is active. Original QA task IDs reserved but intentionally omitted from active task list to reduce noise while core implementation slices proceed. When reinstating, use the prior naming pattern:

- F1-QA-1 (Advisories cache hit/miss & fallback rendering)
- F2-QA-1 (Deep link URL correctness & conditional rendering)
- F3D-QA-1 (Delete trip authorization & cascading)
- F3S-QA-1 (Share token revoke + public access matrix)
- F3X-QA-1 (PDF & ICS output snapshot / structural validation)
- F4-QA-1 (Google account linking path)
- F5-QA-1 (Analytics event emission integrity)
- F6-QA-1 (Admin role enforcement & pagination)
- TD1-QA-1 (Automated a11y sweep baseline)
- M1-QA-1 (Monetization downgrade grace period)

Do not reuse these IDs for non-QA scope. Mark them `[NS]` upon reactivation. Until then, QA validation is ad-hoc within implementation PRs.

End of roadmap.
