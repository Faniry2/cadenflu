/**
 * Types générés depuis openapi.json — ne pas éditer manuellement.
 * Régénérer avec : npm run sync:api
 */

export type CalendarType = 'personal' | 'work' | 'team' | 'resource'
export type ShareRole = 'owner' | 'editor' | 'viewer'
export type ConflictSeverity = 'blocking' | 'warning' | 'info'
export type ConflictType = 'overlap' | 'insufficient_buffer' | 'tight' | 'resource_clash'
export type EventPriority = 'low' | 'normal' | 'high'
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled'

export interface UserCreate {
  email: string
  password: string
  display_name: string
  timezone?: string
}

export interface UserRead {
  id: string
  email: string
  display_name: string
  timezone: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface RefreshRequest {
  refresh_token: string
}

export interface CalendarCreate {
  name: string
  color?: string
  type?: CalendarType
  default_buffer_min?: number
}

export interface CalendarUpdate {
  name?: string | null
  color?: string | null
  type?: CalendarType | null
  default_buffer_min?: number | null
}

export interface CalendarRead {
  id: string
  owner_id: string
  name: string
  color: string
  type: CalendarType
  default_buffer_min: number
  created_at: string
  role?: ShareRole | null
}

export interface ShareCreate {
  user_id: string
  role?: ShareRole
}

export interface ShareRead {
  id: string
  calendar_id: string
  user_id: string
  role: ShareRole
}

export interface EventCreate {
  calendar_id: string
  title: string
  description?: string | null
  location?: string | null
  start_utc: string
  end_utc: string
  all_day?: boolean
  buffer_min?: number | null
  priority?: EventPriority
  status?: EventStatus
  rrule?: string | null
}

export interface EventUpdate {
  title?: string | null
  description?: string | null
  location?: string | null
  start_utc?: string | null
  end_utc?: string | null
  all_day?: boolean | null
  buffer_min?: number | null
  priority?: EventPriority | null
  status?: EventStatus | null
  rrule?: string | null
}

export interface EventRead {
  id: string
  calendar_id: string
  title: string
  description: string | null
  location: string | null
  start_utc: string
  end_utc: string
  all_day: boolean
  buffer_min: number | null
  priority: EventPriority
  status: EventStatus
  rrule: string | null
  recurrence_parent_id: string | null
  created_at: string
  updated_at: string
}

export interface ConflictDetail {
  with_event_id: string
  type: ConflictType
  severity: ConflictSeverity
  observed_gap_min: number
}

export interface SlotSuggestion {
  start_utc: string
  end_utc: string
}

export interface EventCreateResponse {
  event: EventRead
  conflicts: ConflictDetail[]
  suggestions: SlotSuggestion[]
}

export interface CheckConflictsRequest {
  calendar_ids: string[]
  start_utc: string
  end_utc: string
  buffer_min?: number
  exclude_event_id?: string | null
}

export interface FreeSlot {
  start_utc: string
  end_utc: string
  duration_min: number
}

export interface AvailabilityResponse {
  free_slots: FreeSlot[]
}

export interface DayScore {
  date: string
  score: number
  conflicts_count: number
  events_count: number
}

export interface DashboardResponse {
  upcoming_conflicts: Record<string, unknown>[]
  free_slots_today: FreeSlot[]
  day_scores: DayScore[]
}

// ── Clients (exposés par le backend dès que /clients est disponible) ──────────

export type ClientStatus = 'active' | 'inactive'

export interface ClientCreate {
  name: string
  color?: string
  timezone?: string
  rate_per_hour?: number | null
  forfait_hours?: number | null
}

export interface ClientUpdate {
  name?: string | null
  color?: string | null
  timezone?: string | null
  rate_per_hour?: number | null
  forfait_hours?: number | null
  status?: ClientStatus | null
}

export interface ClientRead {
  id: string
  owner_id: string
  name: string
  color: string
  timezone: string
  rate_per_hour: number | null
  forfait_hours: number | null
  status: ClientStatus
  created_at: string
}

export interface ClientHoursSummary {
  client_id: string
  client_name: string
  client_color: string
  hours_billed: number
  forfait_hours: number | null
  amount_estimated: number | null
}

export interface ReportRow {
  client_id: string
  client_name: string
  client_color: string
  hours: number
  events_count: number
  amount_estimated: number | null
}

export interface ReportResponse {
  month: string
  rows: ReportRow[]
  total_hours: number
  total_amount_estimated: number | null
}

// ── EventCreate / EventRead — extension client ─────────────────────────────
// Ces champs sont optionnels pour rester compatibles avec le backend actuel.
// Ils seront requis dès que le backend les expose dans /events.

export interface EventCreateWithClient extends EventCreate {
  client_id?: string | null
  billable?: boolean
}

export interface EventReadWithClient extends EventRead {
  client_id?: string | null
  billable?: boolean
}

export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

export interface HTTPValidationError {
  detail?: ValidationError[]
}
