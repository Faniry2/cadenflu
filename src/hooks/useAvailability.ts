import { useQuery } from '@tanstack/react-query'
import { availability } from '../api/endpoints'

export function useAvailability(params: {
  from_utc: string
  to_utc: string
  calendar_ids: string[]
  duration_min?: number
}) {
  return useQuery({
    queryKey: ['availability', params.from_utc, params.to_utc, params.calendar_ids, params.duration_min ?? null],
    queryFn: () => availability.get(params),
    enabled: params.calendar_ids.length > 0 && !!params.from_utc && !!params.to_utc,
    staleTime: 60_000,
  })
}
