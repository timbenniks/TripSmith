# Admin Overview Dashboard - PRD

## Purpose

Provide at-a-glance product and operational metrics for admins: users, trips, exports, shares, and recent activity.

## KPIs

- Total users / Active users (7/30/90d)
- Total trips (all-time and period)
- Exports generated (PDF/ICS)
- Shares created
- Recent activity feed (latest events)

## Data Sources

- Users: Postgres `auth.users` (fields: id, email, created_at, last_sign_in_at)
- Trips: Postgres `public.trips`
- Shares: Postgres `public.trip_shares`
- Exports/Chat activity: Plausible custom events already tracked by app
  - `trip_export_pdf`, `trip_export_ics`
  - `trip_shared` (can be cross-checked with DB), `chat_message_sent`

## Access Pattern

- All data fetched via server-only admin API routes under `app/api/admin/overview/*` protected by server-side role check (`isAdmin(user)`), returning aggregated JSON.
- Client component calls these routes.

## API Endpoints

- GET `/api/admin/overview/users` → { total, active_7d, active_30d, active_90d }
  - SQL: count(\*) from `auth.users`
  - Active: `last_sign_in_at >= now() - interval 'X days'`
- GET `/api/admin/overview/trips` → { total, created_7d, created_30d }
  - SQL: counts over `public.trips.created_at`
- GET `/api/admin/overview/shares` → { total, created_7d, created_30d }
  - SQL: counts over `public.trip_shares.created_at`
- GET `/api/admin/overview/exports` → { pdf_total, ics_total, by_period }
  - Plausible API: event counts grouped by name and period
- GET `/api/admin/overview/activity` → recent events list (normalized)
  - Compose: last 10 from { latest trips, shares } + Plausible latest event samples (if feasible)

## Plausible Integration (Server)

- Environment:
  - `PLAUSIBLE_API_BASE` (default `https://plausible.io/api/v1`)
  - `PLAUSIBLE_API_KEY` (required)
  - `PLAUSIBLE_SITE_ID` (e.g. domain used in Plausible)
- Calls (examples):
  - GET `/stats/aggregate?site_id=:site&metrics=events&filters=event:name==trip_export_pdf`
  - GET `/stats/timeseries?site_id=:site&period=30d&filters=event:name==trip_export_pdf`

## Security & Privacy

- Server-only routes validate `isAdmin(user)`; no client secrets exposed.
- Do not return PII beyond counts in overview.
- Rate limit Plausible API calls and cache responses (e.g., 30–60s) to avoid quota issues.

## Implementation Plan

1. Create server admin routes under `app/api/admin/overview/*` with SSR auth (`getServerClient()` + `isAdmin`).
2. Implement SQL queries for users, trips, shares.
3. Implement Plausible fetch helper in `lib/plausible-server.ts` for exports and events.
4. Add client fetch in `components/admin/admin-dashboard.tsx` Overview tab.
5. Add simple in-memory cache for server responses (per-node) or use Next.js `fetch` caching with revalidate.

## Acceptance Criteria

- Overview tab displays real totals for users, trips, shares.
- Exports counts come from Plausible for the selected period.
- Recent activity shows latest 10 mixed events (trip created, share created, export generated) with timestamps.
- All endpoints are admin-only and do not leak PII.

## Out of Scope (for this iteration)

- Per-destination breakdowns (lives in Analytics PRD)
- Complex user-level drilldowns
