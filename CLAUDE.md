# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Type-check + production build
npm run lint         # ESLint (zero warnings threshold)
npm test             # Run tests with Vitest
npm run test:ui      # Vitest with browser UI
npm run sync:api     # Regenerate src/api/types.ts from src/api/openapi.json
```

**Environment:** copy `.env.example` to `.env.local` and set `VITE_API_URL` (default `http://localhost:8000`).

## Architecture

**Cadenflu** is a multi-calendar scheduling frontend. The frontend displays data only — all conflict detection, slot scoring, and availability logic lives exclusively in the backend.

### Data flow layers

```
src/api/client.ts       — Axios instance + JWT refresh interceptor
src/api/endpoints.ts    — Typed API functions (auth, calendars, events, availability, clients, reports, dashboard)
src/api/types.ts        — Auto-generated from src/api/openapi.json via openapi-typescript (do not hand-edit)
src/hooks/use*.ts       — TanStack Query wrappers (useQuery / useMutation) consumed by pages/components
src/store/             — Zustand stores for UI-only state
src/pages/             — Route-level components
src/components/        — Shared UI components
src/utils/             — Pure helpers (datetime, cn)
```

### State management split

- **TanStack Query** owns all server state: events, calendars, dashboard, availability. Mutations invalidate `['events']` or `['calendars']` query keys to trigger refetch.
- **Zustand** (`authStore`, `calendarStore`) holds only UI-local state:
  - `authStore` — JWT tokens (persisted to localStorage as `cadenflu-auth`) + current user
  - `calendarStore` — per-calendar visibility toggles (persisted as `cadenflu-calendars`). **Never** call `visibleIds()` inside a Zustand selector — it returns a new array on every call, causing an infinite re-render loop. Correct pattern: read the raw `visibility` map with a stable selector, then derive the filtered list with `useMemo` in the component:
    ```ts
    const visibility = useCalendarStore((s) => s.visibility)
    const visibleIds = useMemo(
      () => cals.map((c) => c.id).filter((id) => visibility[id] !== false),
      [cals, visibility]
    )
    ```

### Auth / HTTP

`src/api/client.ts` implements transparent token refresh: on any 401, it queues concurrent requests and replays them after a single `POST /auth/refresh`. On refresh failure it redirects to `/login`. The access token is read from `localStorage` on every request via a request interceptor.

### Date/timezone pattern

All API dates are UTC ISO strings. The rule is:
- **Display:** always convert with `src/utils/datetime.ts` helpers (`toLocal`, `formatDateTime`, etc.) using `user.timezone` from `authStore`
- **Send to API:** always UTC — use `toUTC()` / `localToUTCIso()`
- Never do raw `new Date()` timezone manipulation; always use Luxon

### Conflict check flow

`useConflictCheck` (`src/hooks/useConflicts.ts`) debounces calls to `POST /events/check-conflicts` at 400 ms during `EventForm` input. This endpoint does not persist anything. The full `POST /events` create call returns `{ event, conflicts, suggestions }`. The frontend never computes overlaps itself.

### API type sync

When the backend changes, update `src/api/openapi.json` then run `npm run sync:api` to regenerate `src/api/types.ts`. TypeScript will then surface any call sites that became incompatible.

### Routes

```
/login                  LoginPage
/                       Dashboard
/calendar               CalendarView (day/week/month, filtered by visible calendar IDs)
/calendar/:date         CalendarView at a specific date
/events/new             EventNewPage — accepts ?start= param to pre-fill from a suggestion click
/events/:id             EventDetailPage (edit + delete)
/calendars              Calendar list / management
/calendars/:id/share    CalendarSharePage — invite user by UUID with owner/editor/viewer role
/settings               SettingsPage — timezone preference (stored in authStore, not persisted to backend yet)
```
