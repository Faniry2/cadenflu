import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasks } from '../api/endpoints'
import type { TaskCreate, TaskUpdate, TaskPriority, TaskStatus } from '../api/models'

interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  client_id?: string
}

const QUERY_KEY = ['tasks']

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters ?? {}],
    queryFn: () => tasks.list(filters),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskCreate) => tasks.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate }) => tasks.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
