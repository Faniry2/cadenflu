import { apiClient } from './client'
import type {
  UserCreate,
  UserRead,
  TokenResponse,
  EmailVerifyRequest,
  ResendVerificationRequest,
  MessageResponse,
  CalendarCreate,
  CalendarUpdate,
  CalendarRead,
  ShareCreate,
  ShareRead,
  EventCreate,
  EventUpdate,
  EventRead,
  EventCreateResponse,
  CheckConflictsRequest,
  ConflictDetail,
  AvailabilityResponse,
  DashboardResponse,
  ClientCreate,
  ClientUpdate,
  ClientRead,
  ReportResponse,
  StudentRead,
  StudentProfileRead,
  StudentProfileWrite,
  StudentNoteCreate,
  StudentNoteRead,
  LearnerStatus,
  ProgressStatus,
  TaskRead,
  TaskCreate,
  TaskUpdate,
  TaskPriority,
  TaskStatus,
  FormationRead,
  ReminderSettingsResponse,
  ReminderSettingsUpdateRequest,
} from './models'

// Auth
export const auth = {
  register: (data: UserCreate) =>
    apiClient.post<UserRead>('/auth/register', data).then((r) => r.data),

  login: (username: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return apiClient
      .post<TokenResponse>('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then((r) => r.data)
  },

  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token }).then((r) => r.data),

  verifyEmail: (token: string) =>
    apiClient
      .post<UserRead>('/auth/verify-email', { token } satisfies EmailVerifyRequest)
      .then((r) => r.data),

  resendVerification: (email: string) =>
    apiClient
      .post<MessageResponse>('/auth/resend-verification', { email } satisfies ResendVerificationRequest)
      .then((r) => r.data),
}

// Calendars
export const calendars = {
  list: () => apiClient.get<CalendarRead[]>('/calendars').then((r) => r.data),

  get: (id: string) => apiClient.get<CalendarRead>(`/calendars/${id}`).then((r) => r.data),

  create: (data: CalendarCreate) =>
    apiClient.post<CalendarRead>('/calendars', data).then((r) => r.data),

  update: (id: string, data: CalendarUpdate) =>
    apiClient.patch<CalendarRead>(`/calendars/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/calendars/${id}`),

  share: (calendarId: string, data: ShareCreate) =>
    apiClient.post<ShareRead>(`/calendars/${calendarId}/share`, data).then((r) => r.data),
}

// Events
export const events = {
  list: (params: { from_utc: string; to_utc: string; calendar_ids?: string[] }) =>
    apiClient
      .get<EventRead[]>('/events', {
        params: {
          from_utc: params.from_utc,
          to_utc: params.to_utc,
          ...(params.calendar_ids && { calendar_ids: params.calendar_ids }),
        },
        paramsSerializer: (p) => {
          const parts: string[] = []
          for (const [k, v] of Object.entries(p)) {
            if (Array.isArray(v)) v.forEach((i) => parts.push(`${k}=${encodeURIComponent(i)}`))
            else parts.push(`${k}=${encodeURIComponent(v as string)}`)
          }
          return parts.join('&')
        },
      })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<EventRead>(`/events/${id}`).then((r) => r.data),

  create: (data: EventCreate) =>
    apiClient.post<EventCreateResponse>('/events', data).then((r) => r.data),

  update: (id: string, data: EventUpdate) =>
    apiClient.put<EventRead>(`/events/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/events/${id}`),

  checkConflicts: (data: CheckConflictsRequest) =>
    apiClient.post<ConflictDetail[]>('/events/check-conflicts', data).then((r) => r.data),
}

// Availability
export const availability = {
  get: (params: {
    from_utc: string
    to_utc: string
    calendar_ids: string[]
    duration_min?: number
  }) =>
    apiClient
      .get<AvailabilityResponse>('/availability', {
        params,
        paramsSerializer: (p) => {
          const parts: string[] = []
          for (const [k, v] of Object.entries(p)) {
            if (Array.isArray(v)) v.forEach((i) => parts.push(`${k}=${encodeURIComponent(i)}`))
            else parts.push(`${k}=${encodeURIComponent(v as string)}`)
          }
          return parts.join('&')
        },
      })
      .then((r) => r.data),

  suggestions: (event_id: string) =>
    apiClient.get('/suggestions', { params: { event_id } }).then((r) => r.data),
}

// Clients
export const clients = {
  list: () => apiClient.get<ClientRead[]>('/clients').then((r) => r.data),

  get: (id: string) => apiClient.get<ClientRead>(`/clients/${id}`).then((r) => r.data),

  create: (data: ClientCreate) =>
    apiClient.post<ClientRead>('/clients', data).then((r) => r.data),

  update: (id: string, data: ClientUpdate) =>
    apiClient.patch<ClientRead>(`/clients/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/clients/${id}`),

  search: (params: {
    nom?: string
    prenom?: string
    email?: string
    telephone?: string
    inscription_date?: string
  }) => apiClient.get<ClientRead[]>('/clients/search', { params }).then((r) => r.data),

  agenda: (id: string) =>
    apiClient.get<EventRead[]>(`/clients/${id}/agenda`).then((r) => r.data),
}

// Reports
export const reports = {
  get: (month: string) =>
    apiClient.get<ReportResponse>('/reports', { params: { month } }).then((r) => r.data),
}

// Dashboard
export const dashboard = {
  get: (range: string = 'week') =>
    apiClient.get<DashboardResponse>('/dashboard', { params: { range } }).then((r) => r.data),
}

// Students (CSM — clients de type 'apprenant')
export const students = {
  list: (params?: { learner_status?: LearnerStatus; progress_status?: ProgressStatus }) =>
    apiClient.get<StudentRead[]>('/students', { params }).then((r) => r.data),

  getProfile: (clientId: string) =>
    apiClient.get<StudentProfileRead>(`/students/${clientId}/profile`).then((r) => r.data),

  upsertProfile: (clientId: string, data: StudentProfileWrite) =>
    apiClient.patch<StudentProfileRead>(`/students/${clientId}/profile`, data).then((r) => r.data),

  listNotes: (clientId: string) =>
    apiClient.get<StudentNoteRead[]>(`/students/${clientId}/notes`).then((r) => r.data),

  addNote: (clientId: string, data: StudentNoteCreate) =>
    apiClient.post<StudentNoteRead>(`/students/${clientId}/notes`, data).then((r) => r.data),

  getReminderSettings: () =>
    apiClient.get<ReminderSettingsResponse>('/students/reminder-settings').then((r) => r.data),

  updateReminderSettings: (data: ReminderSettingsUpdateRequest) =>
    apiClient.put<ReminderSettingsResponse>('/students/reminder-settings', data).then((r) => r.data),
}

// Tasks
export const tasks = {
  list: (params?: { status?: TaskStatus; priority?: TaskPriority; client_id?: string }) =>
    apiClient.get<TaskRead[]>('/tasks', { params }).then((r) => r.data),

  create: (data: TaskCreate) => apiClient.post<TaskRead>('/tasks', data).then((r) => r.data),

  update: (id: string, data: TaskUpdate) =>
    apiClient.patch<TaskRead>(`/tasks/${id}`, data).then((r) => r.data),
}

// Formations
export const formations = {
  list: () => apiClient.get<FormationRead[]>('/formations').then((r) => r.data),
}
