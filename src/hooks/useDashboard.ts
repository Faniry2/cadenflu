import { useQuery } from '@tanstack/react-query'
import { dashboard } from '../api/endpoints'

export function useDashboard(range: string = 'week') {
  return useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => dashboard.get(range),
    staleTime: 60_000,
  })
}
