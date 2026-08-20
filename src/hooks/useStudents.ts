import { useQuery } from '@tanstack/react-query'
import { students } from '../api/endpoints'
import type { LearnerStatus, ProgressStatus } from '../api/models'

interface StudentFilters {
  learner_status?: LearnerStatus
  progress_status?: ProgressStatus
}

export function useStudents(filters?: StudentFilters, enabled = true) {
  return useQuery({
    queryKey: ['students', filters ?? {}],
    queryFn: () => students.list(filters),
    enabled,
  })
}
