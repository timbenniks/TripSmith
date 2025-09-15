# Admin Analytics Dashboard - PRD

## Purpose

Provide product analytics (funnel, engagement, destinations) to guide decisions.

## Key Metrics

- Visitors → Signups → First Trip → Export/Share funnel (period-selectable: 7/30/90d)
- User growth timeseries
- Top destinations
- Feature usage (exports, shares, chat interactions)

## Data Sources

- Plausible Analytics (primary for funnel/visitors/events)
  - Site ID: env `PLAUSIBLE_SITE_ID`
  - API Key: env `PLAUSIBLE_API_KEY`
- Postgres (for domain data not tracked as events)
  - `public.trips` for destinations, counts

## Access Pattern

- Server routes under `/api/admin/analytics/*` protected by `isAdmin(user)`.
- Client dashboard fetches JSON from these endpoints.

## API Endpoints

- GET `/api/admin/analytics/funnel?period=30d`
  - Response: `{ visitors, signups, firstTrip, exportShare }` + percentages
  - Plausible queries:
    - visitors: `/stats/aggregate?metrics=visitors`
    - signups: filter `event:name==auth_signup`
    - firstTrip: filter `event:name==trip_created`
    - exportShare: sum of `trip_export_pdf|trip_export_ics|trip_shared`
- GET `/api/admin/analytics/growth?period=30d`
  - Timeseries of users and trips
  - users: Plausible `/stats/timeseries?metrics=visitors` or signups by day
  - trips: SQL: count trips grouped by `date_trunc('day', created_at)`
- GET `/api/admin/analytics/destinations?period=30d`
  - Top destinations from `public.trips` within period (group by destination)
- GET `/api/admin/analytics/features?period=30d`
  - Events: counts for `trip_export_pdf`, `trip_export_ics`, `trip_shared`, `chat_message_sent` via Plausible

## Implementation Details

- Create `lib/plausible-server.ts` helper:
  - `fetchAggregate({ event, period })`
  - `fetchTimeseries({ event, period })`
  - Inject auth header `Authorization: Bearer ${PLAUSIBLE_API_KEY}`
- Cache layer: cache Plausible responses per (period,event) with short TTL (30–60s)
- Normalize responses for the dashboard

## Security & Privacy

- Server-side only; no API keys in client.
- Do not expose user-level data in analytics; aggregate only.

## Acceptance Criteria

- All sections render real data with 7/30/90d switches.
- Funnel percentages calculated correctly.
- Top destinations reflect DB truth.

## Out of Scope

- Cohort analysis, retention curves (future)
- Per-user drilldowns
