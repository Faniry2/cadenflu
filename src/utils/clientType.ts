import type { ClientType } from '../api/models'

export function clientDisplayName(client: { nom: string; prenom: string }): string {
  return client.prenom ? `${client.prenom} ${client.nom}` : client.nom
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  patron: 'Patron',
  apprenant: 'Apprenant',
}

export const CLIENT_TYPE_BADGE_STYLES: Record<ClientType, string> = {
  patron: 'bg-indigo-100 text-indigo-600',
  apprenant: 'bg-teal-100 text-teal-600',
}

export const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'patron', label: CLIENT_TYPE_LABELS.patron },
  { value: 'apprenant', label: CLIENT_TYPE_LABELS.apprenant },
]
