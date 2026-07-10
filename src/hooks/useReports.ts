import { useQuery } from '@tanstack/react-query'
import { reports } from '../api/endpoints'
import { DateTime } from 'luxon'

export function useReport(month?: string) {
  const currentMonth = month ?? DateTime.now().toFormat('yyyy-MM')
  return useQuery({
    queryKey: ['reports', currentMonth],
    queryFn: () => reports.get(currentMonth),
    staleTime: 60_000,
  })
}
