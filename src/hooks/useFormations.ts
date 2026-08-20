import { useQuery } from '@tanstack/react-query'
import { formations } from '../api/endpoints'

export function useFormations() {
  return useQuery({
    queryKey: ['formations'],
    queryFn: () => formations.list(),
    staleTime: 5 * 60_000,
  })
}
