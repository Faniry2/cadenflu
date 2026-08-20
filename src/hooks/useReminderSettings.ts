import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { students } from '../api/endpoints'
import type { ReminderSettingsUpdateRequest } from '../api/models'

export function useReminderSettings() {
  return useQuery({
    queryKey: ['students', 'reminder-settings'],
    queryFn: () => students.getReminderSettings(),
  })
}

export function useUpdateReminderSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ReminderSettingsUpdateRequest) => students.updateReminderSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', 'reminder-settings'] })
    },
  })
}
