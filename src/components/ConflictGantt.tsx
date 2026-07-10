import { useQueries } from '@tanstack/react-query'
import { DateTime } from 'luxon'
import { events as eventsApi } from '../api/endpoints'
import type { ConflictDetail, EventRead } from '../api/types'
import { useAuthStore } from '../store/authStore'

const severityBar: Record<string, string> = {
  blocking: 'bg-red-400',
  warning: 'bg-orange-400',
  info: 'bg-yellow-400',
}

interface Props {
  newTitle: string
  newStartUtc: string
  newEndUtc: string
  conflicts: ConflictDetail[]
}

interface Row {
  title: string
  startUtc: string
  endUtc: string
  barClass: string
  isNew: boolean
}

function fmt(utc: string, tz: string) {
  return DateTime.fromISO(utc, { zone: 'utc' }).setZone(tz).toFormat('HH:mm')
}

function toMs(utc: string) {
  return new Date(utc).getTime()
}

export function ConflictGantt({ newTitle, newStartUtc, newEndUtc, conflicts }: Props) {
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')

  const queries = useQueries({
    queries: conflicts.map((c) => ({
      queryKey: ['events', c.with_event_id],
      queryFn: () => eventsApi.get(c.with_event_id),
      staleTime: 30_000,
    })),
  })

  const resolved: { event: EventRead; conflict: ConflictDetail }[] = conflicts
    .map((c, i) => ({ conflict: c, event: queries[i]?.data }))
    .filter((x): x is { conflict: ConflictDetail; event: EventRead } => x.event != null)

  if (resolved.length === 0) return null

  const allMs = [
    toMs(newStartUtc),
    toMs(newEndUtc),
    ...resolved.flatMap(({ event }) => [toMs(event.start_utc), toMs(event.end_utc)]),
  ]
  const minMs = Math.min(...allMs)
  const maxMs = Math.max(...allMs)
  const rangeMs = maxMs - minMs || 60_000

  const left = (utc: string) => ((toMs(utc) - minMs) / rangeMs) * 100
  const width = (s: string, e: string) =>
    Math.max(((toMs(e) - toMs(s)) / rangeMs) * 100, 0.5)

  const rows: Row[] = [
    {
      title: newTitle || 'Nouvel événement',
      startUtc: newStartUtc,
      endUtc: newEndUtc,
      barClass: 'bg-indigo-500',
      isNew: true,
    },
    ...resolved.map(({ event, conflict }) => ({
      title: event.title,
      startUtc: event.start_utc,
      endUtc: event.end_utc,
      barClass: severityBar[conflict.severity] ?? 'bg-gray-400',
      isNew: false,
    })),
  ]

  const axisStart = fmt(new Date(minMs).toISOString(), timezone)
  const axisEnd = fmt(new Date(maxMs).toISOString(), timezone)

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
        Diagramme de Gantt
      </p>

      {/* Axe temporel */}
      <div className="flex text-xs text-gray-400 mb-1 pl-[88px] pr-[100px]">
        <span className="flex-1">{axisStart}</span>
        <span>{axisEnd}</span>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Étiquette */}
            <div
              className="w-20 flex-shrink-0 text-right text-xs leading-tight"
              title={row.title}
            >
              <span
                className={
                  row.isNew
                    ? 'font-semibold text-indigo-700'
                    : 'font-medium text-gray-500'
                }
              >
                {row.title.length > 12 ? row.title.slice(0, 11) + '…' : row.title}
              </span>
            </div>

            {/* Piste */}
            <div className="flex-1 relative h-6 bg-gray-200 rounded overflow-hidden">
              {/* Ligne de chevauchement (hachurée) sur la piste du nouvel event */}
              {row.isNew && resolved.map(({ event }, j) => (
                <div
                  key={j}
                  className="absolute top-0 h-full bg-red-200 opacity-60"
                  style={{
                    left: `${left(event.start_utc)}%`,
                    width: `${width(event.start_utc, event.end_utc)}%`,
                  }}
                />
              ))}
              <div
                className={`absolute top-0 h-full rounded ${row.barClass} opacity-90 transition-all`}
                style={{
                  left: `${left(row.startUtc)}%`,
                  width: `${width(row.startUtc, row.endUtc)}%`,
                }}
              />
            </div>

            {/* Horaire */}
            <div className="w-24 flex-shrink-0 text-xs text-gray-400 tabular-nums">
              {fmt(row.startUtc, timezone)}–{fmt(row.endUtc, timezone)}
            </div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="flex gap-3 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />
          Nouvel événement
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />
          Bloquant
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />
          Avertissement
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />
          Info
        </div>
      </div>
    </div>
  )
}
