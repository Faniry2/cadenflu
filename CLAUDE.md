# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Le dépôt local du code backend se trouve dans `/Users/admin/Sites/cadenflu_backend`.

**Avant tout travail touchant l'API** : lire `SYNC.md` à la racine de ce repo, qui trace l'état du contrat API entre backend et frontend, et le mettre à jour une fois `npm run sync:api` + `src/api/models.ts` synchronisés.

### Mécanisme de travail parallèle back/front

Pour une feature qui touche les deux repos, ne pas lancer les subagents `backend` et `frontend` (`.claude/agents/`) direct en aveugle. Suivre cet ordre :

1. Esquisser le **contrat API** de la feature (endpoint(s), schéma request/response — pas l'implémentation).
2. L'écrire dans `SYNC.md` (section "Contrat API en cours"), dans ce repo ET dans sa copie `/Users/admin/Sites/cadenflu_backend/SYNC.md`.
3. Lancer les deux subagents en parallèle : `backend` implémente la vraie logique derrière le contrat, `frontend` code contre le contrat esquissé sans attendre que le backend ait fini.
4. Si le backend dévie du contrat en cours de route, mettre à jour `SYNC.md` et répercuter côté frontend.

Si le contrat API existe déjà et est stable, sauter l'étape 1-2 et lancer les deux subagents en parallèle direct. Si la feature est trop incertaine pour esquisser un contrat fiable, coder le backend d'abord et dériver le contrat de ce qui existe réellement (séquentiel, pas de parallélisme forcé).

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
src/api/models.ts       — Hand-maintained named type aliases (ClientRead, EventRead, ...) over src/api/types.ts's
                          generated `components["schemas"][...]` shapes. Import types from here, never from
                          src/api/types.ts directly — the rest of the app (hooks, pages, components) does this.
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

**Email verification:** `POST /auth/login` returns 403 with `{ detail: 'email_not_verified' }` (`EmailNotVerifiedError`) when the account hasn't confirmed its email yet. `LoginPage` catches this and offers `auth.resendVerification(email)` (`POST /auth/resend-verification`). The confirmation link lands on `/verify-email?token=...`, handled by `VerifyEmailPage`, which calls `auth.verifyEmail(token)` (`POST /auth/verify-email`).

### Date/timezone pattern

All API dates are UTC ISO strings. The rule is:
- **Display:** always convert with `src/utils/datetime.ts` helpers (`toLocal`, `formatDateTime`, etc.) using `user.timezone` from `authStore`
- **Send to API:** always UTC — use `toUTC()` / `localToUTCIso()`
- Never do raw `new Date()` timezone manipulation; always use Luxon

### Conflict check flow

`useConflictCheck` (`src/hooks/useConflicts.ts`) debounces calls to `POST /events/check-conflicts` at 400 ms during `EventForm` input. This endpoint does not persist anything. The full `POST /events` create call returns `{ event, conflicts, suggestions }`. The frontend never computes overlaps itself.

### API type sync

When the backend changes, update `src/api/openapi.json` then run `npm run sync:api` to regenerate `src/api/types.ts`. TypeScript will then surface any call sites that became incompatible. Add/update the corresponding aliases in `src/api/models.ts` — that file is hand-edited on purpose and is what everything else imports from.

### Clients

Clients have a `client_type` of `'patron' | 'apprenant'` (`ClientType` in `src/api/models.ts`):
- `patron` — the decision-maker/payer (company or individual commissioning the work)
- `apprenant` — the beneficiary (the person actually being trained/coached)

Labels, badge styles, and the `<select>`/radio options for this field live in `src/utils/clientType.ts` (`CLIENT_TYPE_LABELS`, `CLIENT_TYPE_BADGE_STYLES`, `CLIENT_TYPE_OPTIONS`) — reuse these rather than re-deriving labels. `ClientsPage` filters the list by type; `GET /reports` also accepts an optional `client_type` query param for filtering.

Events link to a client via `client_id` + `billable` (both on `EventCreate`/`EventRead` directly, no separate wrapper type). `ClientHoursSummary` (in `src/api/models.ts`) is a frontend-only shape derived by joining `useReport()` rows with `client.forfait_hours` — it is not returned by the backend.

### Routes

```
/login                  LoginPage
/verify-email           VerifyEmailPage — consumes ?token= from the confirmation email link
/                       Dashboard
/calendar               CalendarView (day/week/month, filtered by visible calendar IDs)
/calendar/:date         CalendarView at a specific date
/events/new             EventNewPage — accepts ?start= param to pre-fill from a suggestion click
/events/:id             EventDetailPage (edit + delete)
/clients                ClientsPage — list, create, filter by client type
/clients/:id            ClientDetailPage (edit + archive/reactivate + delete)
/reports                ReportsPage — monthly billing report per client
/agenda                 MultiCalendarPage
/gantt                  GanttPage
/calendars              Calendar list / management
/calendars/:id/share    CalendarSharePage — invite user by UUID with owner/editor/viewer role
/settings               SettingsPage — timezone preference (stored in authStore, not persisted to backend yet)
```
