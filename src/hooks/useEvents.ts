import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { events } from '../api/endpoints'
import type { EventCreate, EventCreateWithClient, EventUpdate } from '../api/types'

export function useEvents(params: { from_utc: string; to_utc: string; calendar_ids?: string[] }) {
  return useQuery({
    // Valeurs scalaires/tableau dans la clé — pas l'objet params lui-même
    // (un objet recréé à chaque render rendrait la clé instable)
    queryKey: ['events', params.from_utc, params.to_utc, params.calendar_ids ?? null],
    queryFn: () => events.list(params),
    enabled: !!params.from_utc && !!params.to_utc,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => events.get(id),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EventCreate | EventCreateWithClient) => events.create(data as EventCreate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventUpdate }) => events.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => events.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
