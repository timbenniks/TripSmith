# System Monitoring - PRD

## Purpose

Give admins visibility into system health: API performance, DB health, export pipeline, and recent incidents.

## Metrics & Views

- Overall status (healthy/warning/critical)
- Service status cards (API Gateway, Database, Auth, Storage)
- Key metrics: API request volume/success rate/latency, DB connections/query time, export success/latency
- Recent events (warnings/errors/info)

## Data Sources

- Postgres logs/metrics (via Supabase logs APIs where applicable):
  - API: `app/api/*` response times via application-side measurement and logging to DB table `admin_events`
  - Exports: measure generation time in existing export routes (already added) and log to `admin_events`
- Supabase Logs (optional enhancement): fetch recent auth/storage errors via Supabase logs API
- Plausible (optional): error or performance proxy via custom events if needed

## Storage Schema (App-Managed)

- New table `public.admin_events` (append-only)
  - id uuid default gen_random_uuid()
  - event_type text check in ('api_request','export_perf','error','info','warning')
  - service text
  - details jsonb
  - created_at timestamptz default now()
- Index on `created_at desc`

## Access Pattern

- Admin-only server routes `/api/admin/system/*`:
  - GET `/status` (overall derived status)
  - GET `/services` (array with responseTime/uptime/lastCheck)
  - GET `/metrics` (API + DB + Exports snapshots, last 24h)
  - GET `/events?limit=50` (recent events)

## Derivations

- Overall status:
  - healthy if error rate < 1% and avg API p95 < 500ms; warning if < 5% or p95 < 1000ms; else critical
- Uptime: ratio of successful requests over total in the window

## Implementation Plan

1. Create `public.admin_events` via migration.
2. Add server helpers to write events (API request timings, export timings, error logs).
3. Implement `/api/admin/system/*` routes with SSR admin check.
4. Wire `components/admin/system-monitoring.tsx` to these endpoints.
5. Add lightweight caching on endpoints (5–15s) to avoid heavy queries.

## Security

- Admin-only endpoints; no raw PII in events. Details JSON should be scrubbed.

## Acceptance Criteria

- Dashboard shows real metrics and events updated in near-real time.
- Export performance matches what's recorded by export routes.
- Overall status toggles correctly based on thresholds.

## Out of Scope

- External APM integration (Sentry, Datadog) – future enhancement.
