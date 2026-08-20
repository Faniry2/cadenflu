import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { calendars } from '../api/endpoints'
import type { CalendarCreate, CalendarUpdate, ShareCreate } from '../api/models'
import { useCalendarStore } from '../store/calendarStore'

const QUERY_KEY = ['calendars']

export function useCalendars() {
  // Sélecteur stable — ne cause pas de re-render quand visibility change
  const initCalendar = useCalendarStore((s) => s.initCalendar)

  const query = useQuery({
    queryKey: QUERY_KEY,
    // queryFn doit être pure : aucun set() Zustand ici
    queryFn: () => calendars.list(),
  })

  // Synchronisation du store de visibilité APRÈS que les données arrivent,
  // hors du cycle de rendu de TanStack Query pour éviter la double cascade
  // useSyncExternalStore (Zustand + TanStack Query simultanés).
  useEffect(() => {
    query.data?.forEach((c) => initCalendar(c.id))
  }, [query.data, initCalendar])

  return query
}

export function useCalendar(id: string) {
  return useQuery({
    queryKey: ['calendars', id],
    queryFn: () => calendars.get(id),
    enabled: !!id,
  })
}

export function useCreateCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CalendarCreate) => calendars.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CalendarUpdate }) =>
      calendars.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteCalendar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => calendars.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useShareCalendar() {
  return useMutation({
    mutationFn: ({ calendarId, data }: { calendarId: string; data: ShareCreate }) =>
      calendars.share(calendarId, data),
  })
}
