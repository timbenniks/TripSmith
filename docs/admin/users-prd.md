# Admin User Management - PRD

## Purpose

Enable admins to browse, search, and filter users; view basic activity; and prepare for future role and status management.

## Views / Features

- Users table with: email, role, created_at, last_sign_in_at, trip_count, status
- Search by email, filter by role (admin/user), filter by status (active/inactive)
- Pagination (server-side) for large datasets

## Data Sources

- Users: `auth.users`
  - id, email, created_at, last_sign_in_at, user_metadata.role (string)
- Trips per user: `public.trips` (count grouped by user_id)
- Status heuristic: active if `last_sign_in_at IS NOT NULL` in last 90 days; else inactive

## Access Pattern

- Admin-only server route: `/api/admin/users/list?query=&role=&status=&page=&pageSize=`
- Returns paginated list + totals

## API Endpoint

- GET `/api/admin/users/list`
  - Query params:
    - `query`: email contains (ILIKE)
    - `role`: `admin` | `user` | empty
    - `status`: `active` | `inactive` | empty
    - `page`: number (default 1)
    - `pageSize`: number (default 20, max 100)
  - Response:
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "email": "user@example.com",
          "role": "admin" | "user",
          "created_at": "2024-01-02T03:04:05Z",
          "last_sign_in_at": "2024-02-03T03:04:05Z",
          "trip_count": 5,
          "status": "active" | "inactive"
        }
      ],
      "page": 1,
      "pageSize": 20,
      "total": 123
    }
    ```

## SQL Outline

- Base: from `auth.users u`
- Join: `left join (select user_id, count(*) as trip_count from public.trips group by user_id) t on t.user_id = u.id`
- Role: `coalesce((u.raw_user_meta_data->>'role')::text, 'user')`
- Status: `case when u.last_sign_in_at >= now() - interval '90 days' then 'active' else 'inactive' end as status`
- Filters: `u.email ilike '%' || :query || '%'`, role/status matches
- Pagination: `limit :pageSize offset (:page-1) * :pageSize`

## Security & Privacy

- Admin-only route (`isAdmin(user)`); never expose raw metadata beyond necessary fields.
- No PII beyond email/dates; no sensitive auth tokens.

## Implementation Plan

1. Create `/api/admin/users/list` with SSR auth and SQL.
2. Add query param parsing and server-side validation.
3. Wire `components/admin/user-management.tsx` to call endpoint and remove mocks.
4. Add basic empty/loading/error states.

## Acceptance Criteria

- Real user data loads with search, role filter, status filter, and pagination.
- Trip counts per user are accurate.
- No client can access without admin role.

## Out of Scope

- Editing user roles from UI (can be a future admin action)
- Deactivating users
