import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clients } from '../api/endpoints'
import type { ClientCreate, ClientUpdate } from '../api/models'

export interface ClientSearchParams {
  nom?: string
  prenom?: string
  email?: string
  telephone?: string
  inscription_date?: string
}

const QUERY_KEY = ['clients']

export function useClients() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => clients.list(),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: () => clients.get(id),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClientCreate) => clients.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdate }) =>
      clients.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => clients.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

function hasSearchParams(params: ClientSearchParams): boolean {
  return Object.values(params).some((v) => !!v?.trim())
}

export function useClientSearch(params: ClientSearchParams) {
  return useQuery({
    queryKey: ['clients', 'search', params],
    queryFn: () => clients.search(params),
    enabled: hasSearchParams(params),
  })
}

export function useClientAgenda(clientId: string) {
  return useQuery({
    queryKey: ['clients', clientId, 'agenda'],
    queryFn: () => clients.agenda(clientId),
    enabled: !!clientId,
  })
}
