import { Link } from 'react-router-dom'
import type { ClientRead, ClientHoursSummary } from '../api/types'
import { cn } from '../utils/cn'

interface Props {
  client: ClientRead
  summary?: ClientHoursSummary
  onDelete?: (id: string) => void
}

function ForfaitBar({ hours, forfait }: { hours: number; forfait: number }) {
  const pct = Math.min((hours / forfait) * 100, 100)
  const color =
    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{hours.toFixed(1)}h consommées</span>
        <span>{forfait}h forfait</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ClientCard({ client, summary, onDelete }: Props) {
  const hours = summary?.hours_billed ?? 0
  const forfait = client.forfait_hours
  const overQuota = forfait !== null && hours > forfait
  const nearQuota = forfait !== null && !overQuota && hours / forfait >= 0.8

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5"
            style={{ backgroundColor: client.color }}
            aria-hidden
          />
          <div className="min-w-0">
            <Link
              to={`/clients/${client.id}`}
              className="text-sm font-semibold text-gray-800 hover:text-indigo-600 truncate block"
            >
              {client.name}
            </Link>
            <p className="text-xs text-gray-400">{client.timezone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {overQuota && (
            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              Dépassé
            </span>
          )}
          {nearQuota && !overQuota && (
            <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              Proche quota
            </span>
          )}
          {client.status === 'inactive' && (
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
              Inactif
            </span>
          )}
        </div>
      </div>

      {forfait !== null && <ForfaitBar hours={hours} forfait={forfait} />}

      {summary?.amount_estimated !== null && summary?.amount_estimated !== undefined && (
        <p className="text-xs text-gray-500">
          Montant estimé :{' '}
          <span className="font-semibold text-gray-700">
            {summary.amount_estimated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </p>
      )}

      <div className="flex items-center gap-3 mt-1 pt-2 border-t border-gray-50">
        <Link
          to={`/clients/${client.id}`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Détail
        </Link>
        {onDelete && client.status !== 'inactive' && (
          <button
            onClick={() => onDelete(client.id)}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Archiver
          </button>
        )}
      </div>
    </div>
  )
}
