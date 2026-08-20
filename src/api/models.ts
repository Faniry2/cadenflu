import type { components } from './types'

export type UserCreate = components['schemas']['UserCreate']
export type UserRead = components['schemas']['UserRead']
export type TokenResponse = components['schemas']['TokenResponse']
export type EmailVerifyRequest = components['schemas']['EmailVerifyRequest']
export type ResendVerificationRequest = components['schemas']['ResendVerificationRequest']
export type MessageResponse = components['schemas']['MessageResponse']

export type CalendarCreate = components['schemas']['CalendarCreate']
export type CalendarUpdate = components['schemas']['CalendarUpdate']
export type CalendarRead = components['schemas']['CalendarRead']
export type CalendarType = components['schemas']['CalendarType']

export type ShareCreate = components['schemas']['ShareCreate']
export type ShareRead = components['schemas']['ShareRead']
export type ShareRole = components['schemas']['ShareRole']

export type EventCreate = components['schemas']['EventCreate']
export type EventUpdate = components['schemas']['EventUpdate']
export type EventRead = components['schemas']['EventRead']
export type EventCreateResponse = components['schemas']['EventCreateResponse']
export type EventPriority = components['schemas']['EventPriority']
export type EventStatus = components['schemas']['EventStatus']

export type CheckConflictsRequest = components['schemas']['CheckConflictsRequest']
export type ConflictDetail = components['schemas']['ConflictDetail']
export type ConflictType = components['schemas']['ConflictType']
export type ConflictSeverity = components['schemas']['ConflictSeverity']

export type AvailabilityResponse = components['schemas']['AvailabilityResponse']
export type FreeSlot = components['schemas']['FreeSlot']
export type SlotSuggestion = components['schemas']['SlotSuggestion']

export type DashboardResponse = components['schemas']['DashboardResponse']
export type DayScore = components['schemas']['DayScore']

export type ClientCreate = components['schemas']['ClientCreate']
export type ClientUpdate = components['schemas']['ClientUpdate']
export type ClientRead = components['schemas']['ClientRead']
export type ClientType = components['schemas']['ClientType']
export type ClientStatus = 'active' | 'inactive'

export type ReportResponse = components['schemas']['ReportResponse']
export type ReportRow = components['schemas']['ReportRow']

// ── CSM (clients de type 'apprenant') ──────────────────────────────────────

export type StudentCategory = components['schemas']['StudentCategory']
export type PaymentStatus = components['schemas']['PaymentStatus']
export type LearnerStatus = components['schemas']['LearnerStatus']
export type ProgressStatus = components['schemas']['ProgressStatus']

export type StudentProfileRead = components['schemas']['StudentProfileRead']
export type StudentProfileWrite = components['schemas']['StudentProfileWrite']
// Item de GET /students : identité client minimale + profil pédagogique (null si pas encore créé)
export type StudentRead = components['schemas']['StudentRead']

export type StudentNoteCreate = components['schemas']['StudentNoteCreate']
export type StudentNoteRead = components['schemas']['StudentNoteRead']

export type FormationRead = components['schemas']['FormationRead']

// Réglages de rappel de suivi (stale_followup) par statut de progression, scope par owner.
// Voir GET/PUT /students/reminder-settings (contrat dans SYNC.md).
export type ReminderSettingItem = components['schemas']['ReminderSettingItem']
export type ReminderSettingsResponse = components['schemas']['ReminderSettingsRead']
export type ReminderSettingUpdate = components['schemas']['ReminderSettingWrite']
export type ReminderSettingsUpdateRequest = components['schemas']['ReminderSettingsUpdate']

export type TaskPriority = components['schemas']['TaskPriority']
export type TaskStatus = components['schemas']['TaskStatus']
export type TaskCreate = components['schemas']['TaskCreate']
export type TaskUpdate = components['schemas']['TaskUpdate']
export type TaskRead = components['schemas']['TaskRead']

export type ValidationError = components['schemas']['ValidationError']
export type HTTPValidationError = components['schemas']['HTTPValidationError']
export type InvalidCredentialsError = components['schemas']['InvalidCredentialsError']
export type EmailNotVerifiedError = components['schemas']['EmailNotVerifiedError']
export type InvalidOrExpiredTokenError = components['schemas']['InvalidOrExpiredTokenError']

// Non exposé par le backend : dérivé côté frontend à partir de ReportRow + ClientRead.forfait_hours
export interface ClientHoursSummary {
  client_id: string
  client_name: string
  client_color: string
  hours_billed: number
  forfait_hours: number | null
  amount_estimated: number | null
}
