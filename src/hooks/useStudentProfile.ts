import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { students } from '../api/endpoints'
import type { StudentProfileWrite, StudentNoteCreate } from '../api/models'

export function useStudentProfile(clientId: string, enabled = true) {
  return useQuery({
    queryKey: ['students', clientId, 'profile'],
    queryFn: () => students.getProfile(clientId),
    enabled: !!clientId && enabled,
    retry: false,
  })
}

export function useUpsertStudentProfile(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentProfileWrite) => students.upsertProfile(clientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', clientId, 'profile'] })
      qc.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useStudentNotes(clientId: string, enabled = true) {
  return useQuery({
    queryKey: ['students', clientId, 'notes'],
    queryFn: () => students.listNotes(clientId),
    enabled: !!clientId && enabled,
  })
}

export function useAddStudentNote(clientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StudentNoteCreate) => students.addNote(clientId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students', clientId, 'notes'] }),
  })
}
