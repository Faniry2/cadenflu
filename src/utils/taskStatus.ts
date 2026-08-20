import type { TaskPriority, TaskStatus } from '../api/models'

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'Urgent',
  pas_urgent: 'Pas urgent',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  fait: 'Fait',
  reporte: 'Reporté',
}

export const TASK_STATUS_BADGE_STYLES: Record<TaskStatus, string> = {
  a_faire: 'bg-gray-100 text-gray-600',
  en_cours: 'bg-indigo-100 text-indigo-600',
  fait: 'bg-green-100 text-green-700',
  reporte: 'bg-amber-100 text-amber-700',
}

export const TASK_PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABELS).map(
  ([value, label]) => ({ value: value as TaskPriority, label })
)
export const TASK_STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(
  ([value, label]) => ({ value: value as TaskStatus, label })
)
