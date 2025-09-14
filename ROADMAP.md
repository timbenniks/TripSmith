# TripSmith Roadmap

> Living document. Keep concise; link deeper architecture details in `.github/copilot-instructions.md` where needed.

## MVP todo list

- Weather & Disruption Advisories in itinerary (non-destructive helpful notes insertion; no itinerary rewrite).
- Smart deep links for flights, venues, hotels, transit in final itinerary. Prefer Google services.
- Trip management.
  - Delete,
  - Share (needs to be accessible without logging in),
  - Share over email,
  - Export PDF,
  - Export ICS Calendar.
- Advanced Analytics (Plausible integration once baseline metrics stable).
- Google Oauth login
  - Needed: privacy policy page and terms of service page.
- Admin
  - Dashboard UI (trip counts, user activity, system diagnostics, analytics).
  - User tools: manage users, resend confirmation.

## Backlog

- Full accessibility review and fixes.
- Basic Test Harness (Vitest): suggestion engine cases + itinerary JSON extraction edge cases.
- Performance optimization (loading times, API response times).
- Monetization (Stripe).
  - include feature flags, feature user plans, administration UI, impersonate user.

**Editing Rules:** Keep sections lean; move deep rationale to architecture guide. Avoid duplicating live code comments.
