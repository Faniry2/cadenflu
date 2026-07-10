import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DateTime } from 'luxon'
import { useCalendars } from '../hooks/useCalendars'
import { useEvents } from '../hooks/useEvents'
import { useAuthStore } from '../store/authStore'
import { useCalendarStore } from '../store/calendarStore'
import { toLocal } from '../utils/datetime'
import type { CalendarRead, EventRead } from '../api/types'

const LABEL_W = 172  // px — colonne label gauche
const ROW_H    = 36  // px — hauteur de chaque ligne événement
const HEAD_H   = 38  // px — hauteur entête calendrier
const HOURS    = Array.from({ length: 25 }, (_, i) => i) // 0 … 24

function minFromMidnight(dt: DateTime) {
  return dt.hour * 60 + dt.minute + dt.second / 60
}

function toBarGeometry(e: EventRead, tz: string) {
  const start = toLocal(e.start_utc, tz)
  const end   = toLocal(e.end_utc,   tz)
  const s = Math.max(0,    minFromMidnight(start))
  const f = Math.min(1440, minFromMidnight(end))
  return {
    leftPct:  (s / 1440) * 100,
    widthPct: Math.max(((f - s) / 1440) * 100, 0.3),
  }
}

interface Group {
  cal:  CalendarRead
  rows: { event: EventRead; leftPct: number; widthPct: number }[]
}

function HourGrid() {
  return (
    <div className="absolute inset-0 flex pointer-events-none">
      {HOURS.map((h) => (
        <div
          key={h}
          className="flex-1 border-l border-gray-100"
          style={h === 0 ? { borderLeft: 'none' } : {}}
        />
      ))}
    </div>
  )
}

function NowLine({ date, tz }: { date: DateTime; tz: string }) {
  const now = DateTime.now().setZone(tz)
  const isToday = date.hasSame(now, 'day')
  if (!isToday) return null
  const pct = (minFromMidnight(now) / 1440) * 100
  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none"
      style={{ left: `${pct}%` }}
    >
      <div className="w-px h-full bg-red-500 opacity-70" />
      <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
    </div>
  )
}

export function GanttPage() {
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const navigate  = useNavigate()
  const { data: cals = [] } = useCalendars()
  const visibility = useCalendarStore((s) => s.visibility)

  const [date, setDate] = useState(() =>
    DateTime.now().setZone(timezone).startOf('day')
  )

  const visibleCals = useMemo(
    () => cals.filter((c) => visibility[c.id] !== false),
    [cals, visibility]
  )

  const fromUtc = useMemo(() => date.toUTC().toISO()!, [date])
  const toUtc   = useMemo(() => date.plus({ days: 1 }).toUTC().toISO()!, [date])
  const calIds  = useMemo(() => visibleCals.map((c) => c.id), [visibleCals])

  const { data: eventsData = [], isLoading } = useEvents({
    from_utc: fromUtc,
    to_utc:   toUtc,
    calendar_ids: calIds,
  })

  const groups = useMemo((): Group[] =>
    visibleCals.map((cal) => ({
      cal,
      rows: eventsData
        .filter((e) => e.calendar_id === cal.id)
        .map((e) => ({ event: e, ...toBarGeometry(e, timezone) })),
    })),
    [visibleCals, eventsData, timezone]
  )

  const dateLabel = date.setLocale('fr').toFormat("EEEE d MMMM yyyy")

  // Scroll to 7 h au chargement
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      const pct = (7 * 60) / 1440
      scrollRef.current.scrollLeft =
        (scrollRef.current.scrollWidth - LABEL_W) * pct
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Barre de navigation ── */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900 mr-2">Gantt</h1>

        <button
          onClick={() => setDate((d) => d.minus({ days: 1 }))}
          className="px-2.5 py-1 text-sm rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Jour précédent"
        >
          ‹
        </button>
        <button
          onClick={() => setDate(DateTime.now().setZone(timezone).startOf('day'))}
          className="px-3 py-1 text-sm rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
        >
          Aujourd'hui
        </button>
        <button
          onClick={() => setDate((d) => d.plus({ days: 1 }))}
          className="px-2.5 py-1 text-sm rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Jour suivant"
        >
          ›
        </button>

        <span className="text-sm font-medium text-gray-700 capitalize ml-1">
          {dateLabel}
        </span>

        {isLoading && (
          <span className="ml-auto text-xs text-gray-400 animate-pulse">
            Chargement…
          </span>
        )}
      </div>

      {/* ── Corps Gantt ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ minWidth: `${LABEL_W + 960}px` }}>

          {/* Axe horaire (sticky) */}
          <div
            className="flex bg-white border-b border-gray-200 sticky top-0 z-10"
            style={{ paddingLeft: LABEL_W }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-xs text-gray-400 py-2 border-l border-gray-200"
                style={h === 0 ? { borderLeft: 'none' } : {}}
              >
                {String(h).padStart(2, '0')}h
              </div>
            ))}
          </div>

          {/* Groupes */}
          {groups.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">
              Aucun agenda visible — activez-en dans la barre latérale.
            </div>
          ) : (
            groups.map(({ cal, rows }) => (
              <div key={cal.id} className="border-b border-gray-200">

                {/* En-tête calendrier */}
                <div
                  className="flex items-center border-b border-gray-100 bg-white sticky left-0"
                  style={{ height: HEAD_H }}
                >
                  <div
                    className="flex items-center gap-2 px-3 flex-shrink-0 border-r border-gray-100"
                    style={{ width: LABEL_W }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: cal.color }}
                    />
                    <span className="text-xs font-semibold text-gray-800 truncate">
                      {cal.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto tabular-nums">
                      {rows.length}
                    </span>
                  </div>
                  {/* grille vide derrière l'entête */}
                  <div className="relative flex-1 h-full">
                    <HourGrid />
                    <NowLine date={date} tz={timezone} />
                  </div>
                </div>

                {/* Lignes d'événements */}
                {rows.length === 0 ? (
                  <div className="flex" style={{ height: ROW_H }}>
                    <div
                      className="flex-shrink-0 border-r border-gray-100 flex items-center px-3"
                      style={{ width: LABEL_W }}
                    >
                      <span className="text-xs text-gray-300 italic">Aucun événement</span>
                    </div>
                    <div className="relative flex-1 h-full">
                      <HourGrid />
                      <NowLine date={date} tz={timezone} />
                    </div>
                  </div>
                ) : (
                  rows.map(({ event, leftPct, widthPct }) => {
                    const startDt = toLocal(event.start_utc, timezone)
                    const endDt   = toLocal(event.end_utc,   timezone)
                    const timeStr = `${startDt.toFormat('HH:mm')} – ${endDt.toFormat('HH:mm')}`
                    return (
                      <div
                        key={event.id}
                        className="flex items-center border-t border-gray-50"
                        style={{ height: ROW_H }}
                      >
                        {/* Label */}
                        <div
                          className="flex-shrink-0 border-r border-gray-100 px-3 flex flex-col justify-center"
                          style={{ width: LABEL_W }}
                        >
                          <span className="text-xs text-gray-700 truncate font-medium leading-tight">
                            {event.title}
                          </span>
                          <span className="text-xs text-gray-400 tabular-nums leading-tight">
                            {timeStr}
                          </span>
                        </div>

                        {/* Piste */}
                        <div className="relative flex-1 h-full">
                          <HourGrid />
                          <NowLine date={date} tz={timezone} />
                          <button
                            onClick={() => navigate(`/events/${event.id}`)}
                            title={`${event.title} · ${timeStr}`}
                            className="absolute top-1/2 -translate-y-1/2 rounded text-white text-xs font-medium px-2 truncate hover:brightness-90 active:brightness-75 transition-all text-left focus:outline-none focus:ring-2 focus:ring-offset-1"
                            style={{
                              left:            `${leftPct}%`,
                              width:           `${widthPct}%`,
                              height:          `${ROW_H - 10}px`,
                              backgroundColor: cal.color,
                              minWidth:        '6px',
                            }}
                          >
                            {widthPct > 3 ? event.title : ''}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
