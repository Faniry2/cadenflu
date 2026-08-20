import type { ConflictDetail } from '../api/models'
import { cn } from '../utils/cn'

interface Props {
  conflicts: ConflictDetail[]
  clientName?: string
  className?: string
}

const severityConfig = {
  blocking: {
    bg: 'bg-red-50 border-red-300',
    icon: '⛔',
    label: 'Bloquant',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    bg: 'bg-orange-50 border-orange-300',
    icon: '⚠️',
    label: 'Avertissement',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-700',
  },
  info: {
    bg: 'bg-yellow-50 border-yellow-300',
    icon: 'ℹ️',
    label: 'Information',
    text: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700',
  },
}

const typeLabels: Record<string, string> = {
  overlap: 'Chevauchement',
  insufficient_buffer: 'Marge insuffisante',
  tight: 'Créneau serré',
  resource_clash: 'Conflit de ressource',
}

export function ConflictBanner({ conflicts, clientName, className }: Props) {
  if (conflicts.length === 0) return null

  return (
    <div className={cn('space-y-2', className)} role="alert" aria-live="polite">
      {conflicts.map((c, i) => {
        const cfg = severityConfig[c.severity]
        return (
          <div key={i} className={cn('flex items-start gap-3 border rounded-lg p-3', cfg.bg)}>
            <span aria-hidden="true" className="text-lg leading-none mt-0.5">
              {cfg.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-sm font-semibold', cfg.text)}>{cfg.label}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', cfg.badge)}>
                  {typeLabels[c.type] ?? c.type}
                </span>
              </div>
              {c.observed_gap_min < 0 ? (
                <p className={cn('text-xs mt-0.5', cfg.text)}>
                  Chevauchement de {Math.abs(c.observed_gap_min)} min avec un autre événement.
                </p>
              ) : c.type === 'insufficient_buffer' ? (
                <p className={cn('text-xs mt-0.5', cfg.text)}>
                  Temps de respiration insuffisant{clientName ? ` avant ou après « ${clientName} »` : ''} : seulement {c.observed_gap_min} min entre deux rendez-vous.
                </p>
              ) : (
                <p className={cn('text-xs mt-0.5', cfg.text)}>
                  Écart constaté : {c.observed_gap_min} min entre les événements.
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
