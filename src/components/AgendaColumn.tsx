import { useState, useMemo, useCallback, memo } from 'react'
import { Calendar, luxonLocalizer, type View, type Messages } from 'react-big-calendar'
import { DateTime } from 'luxon'
import { useNavigate } from 'react-router-dom'
import { useCalendars } from '../hooks/useCalendars'
import { useClients } from '../hooks/useClients'
import { useEvents } from '../hooks/useEvents'
import { useAuthStore } from '../store/authStore'
import { utcIsoToLocalDate, toLocal, localToUTCIso } from '../utils/datetime'
import { EventForm } from './EventForm'
import type { EventRead, SlotSuggestion } from '../api/models'
import { clientDisplayName } from '../utils/clientType'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = luxonLocalizer(DateTime, { firstDayOfWeek: 1 })

const MESSAGES: Messages = {
  today: "Aujourd'hui",
  previous: 'Précédent',
  next: 'Suivant',
  month: 'Mois',
  week: 'Semaine',
  day: 'Jour',
  agenda: 'Agenda',
  date: 'Date',
  time: 'Heure',
  event: 'Événement',
  noEventsInRange: 'Aucun événement sur cette période.',
  showMore: (count: number) => `+${count} de plus`,
}

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: EventRead
}

function EventItem({
  event,
  clientColor,
  clientName,
  clientTimezone,
  userTimezone,
}: {
  event: RbcEvent
  clientColor?: string
  clientName?: string
  clientTimezone?: string
  userTimezone: string
}) {
  const startClient =
    clientTimezone && clientTimezone !== userTimezone
      ? toLocal(event.resource.start_utc, clientTimezone).toFormat('HH:mm')
      : null
  return (
    <span className="flex flex-col leading-tight overflow-hidden">
      <span className="font-medium truncate text-xs">{event.title}</span>
      {clientName && (
        <span className="flex items-center gap-1 opacity-85" style={{ fontSize: '10px' }}>
          {clientColor && (
            <span
              className="w-1.5 h-1.5 rounded-sm inline-block flex-shrink-0"
              style={{ backgroundColor: clientColor }}
            />
          )}
          {clientName}
        </span>
      )}
      {startClient && (
        <span className="opacity-75" style={{ fontSize: '10px' }}>
          {startClient} ({clientTimezone})
        </span>
      )}
    </span>
  )
}

interface AgendaColumnProps {
  calendarId: string
}

export const AgendaColumn = memo(function AgendaColumn({ calendarId }: AgendaColumnProps) {
  const navigate = useNavigate()
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const { data: cals = [] } = useCalendars()
  const { data: clientList = [] } = useClients()

  const cal = useMemo(() => cals.find((c) => c.id === calendarId), [cals, calendarId])
  const clientMap = useMemo(
    () => Object.fromEntries(clientList.map((c) => [c.id, c])),
    [clientList]
  )

  const [size, setSize] = useState<'normal' | 'collapsed' | 'maximized'>('normal')
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())
  const [modalSlot, setModalSlot] = useState<Date | null>(null)

  // Stable array reference — prevents queryKey churn
  const calendarIds = useMemo(() => [calendarId], [calendarId])

  const rangeStart = useMemo(
    () =>
      DateTime.fromJSDate(date, { zone: timezone })
        .startOf(view === 'day' ? 'day' : view === 'month' ? 'month' : 'week')
        .minus({ days: 1 })
        .toUTC()
        .toISO()!,
    [date, view, timezone]
  )
  const rangeEnd = useMemo(
    () =>
      DateTime.fromJSDate(date, { zone: timezone })
        .endOf(view === 'day' ? 'day' : view === 'month' ? 'month' : 'week')
        .plus({ days: 1 })
        .toUTC()
        .toISO()!,
    [date, view, timezone]
  )

  const { data: eventsData = [], isLoading } = useEvents({
    from_utc: rangeStart,
    to_utc: rangeEnd,
    calendar_ids: calendarIds,
  })

  const rbcEvents = useMemo(
    () =>
      eventsData.map((e) => ({
        id: e.id,
        title: e.title,
        start: utcIsoToLocalDate(e.start_utc, timezone),
        end: utcIsoToLocalDate(e.end_utc, timezone),
        allDay: e.all_day,
        resource: e as EventRead,
      })),
    [eventsData, timezone]
  )

  const calColor = cal?.color ?? '#6366f1'

  const eventPropGetter = useCallback(
    (_event: RbcEvent) => ({
      style: { backgroundColor: calColor, borderColor: calColor, color: '#fff' },
    }),
    [calColor]
  )

  const EventWrapper = useCallback(
    ({ event }: { event: RbcEvent }) => {
      const ev = event.resource
      const client = ev.client_id ? clientMap[ev.client_id] : undefined
      return (
        <EventItem
          event={event}
          clientColor={client?.color}
          clientName={client ? clientDisplayName(client) : undefined}
          clientTimezone={client?.timezone}
          userTimezone={timezone}
        />
      )
    },
    [clientMap, timezone]
  )

  const handlePrev = useCallback(() => {
    setDate((d) => {
      const dt = DateTime.fromJSDate(d)
      if (view === 'day') return dt.minus({ days: 1 }).toJSDate()
      if (view === 'month') return dt.minus({ months: 1 }).toJSDate()
      return dt.minus({ weeks: 1 }).toJSDate()
    })
  }, [view])

  const handleNext = useCallback(() => {
    setDate((d) => {
      const dt = DateTime.fromJSDate(d)
      if (view === 'day') return dt.plus({ days: 1 }).toJSDate()
      if (view === 'month') return dt.plus({ months: 1 }).toJSDate()
      return dt.plus({ weeks: 1 }).toJSDate()
    })
  }, [view])

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setModalSlot(start)
  }, [])

  const handleSelectEvent = useCallback(
    (e: object) => navigate(`/events/${(e as RbcEvent).id}`),
    [navigate]
  )

  const modalSuggestion = useMemo((): SlotSuggestion | undefined => {
    if (!modalSlot) return undefined
    return {
      start_utc: localToUTCIso(modalSlot, timezone),
      end_utc: localToUTCIso(new Date(modalSlot.getTime() + 60 * 60 * 1000), timezone),
    }
  }, [modalSlot, timezone])

  /* ── Collapsed (bande verticale étroite) ── */
  if (size === 'collapsed') {
    return (
      <div
        className="flex flex-col items-center border border-gray-200 rounded-xl bg-white overflow-hidden flex-shrink-0 cursor-pointer group"
        style={{ width: '44px', alignSelf: 'stretch' }}
        onClick={() => setSize('normal')}
        title={`Restaurer « ${cal?.name ?? ''} »`}
        role="button"
        aria-expanded={false}
      >
        <div className="w-full h-1.5 flex-shrink-0" style={{ backgroundColor: calColor }} />
        <div className="pt-2 pb-1 flex-shrink-0">
          <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-700" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <span
            className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}
          >
            {cal?.name ?? '…'}
          </span>
        </div>
      </div>
    )
  }

  const isMaximized = size === 'maximized'

  /* ── Normal + Maximized (même structure, positionnement différent) ── */
  return (
    <div
      className={
        isMaximized
          ? 'flex flex-col bg-white z-40 rounded-xl overflow-hidden'
          : 'flex flex-col border border-gray-200 rounded-xl bg-white overflow-hidden flex-shrink-0'
      }
      style={
        isMaximized
          ? { position: 'absolute', inset: 0 }
          : { width: 'clamp(300px, 30vw, 480px)' }
      }
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: calColor }} aria-hidden />
        <span className="font-semibold text-sm text-gray-800 truncate flex-1 min-w-0">
          {cal?.name ?? '…'}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handlePrev} className="px-2 py-0.5 text-xs rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Période précédente">‹</button>
          <button onClick={() => setDate(new Date())} className="px-2 py-0.5 text-xs rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors">Auj.</button>
          <button onClick={handleNext} className="px-2 py-0.5 text-xs rounded border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors" aria-label="Période suivante">›</button>
        </div>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as View)}
          className="text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-600 bg-white flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Vue"
        >
          <option value="day">Jour</option>
          <option value="week">Semaine</option>
          <option value="month">Mois</option>
        </select>

        {/* Bouton réduire — visible seulement en mode normal */}
        {!isMaximized && (
          <button
            onClick={() => setSize('collapsed')}
            className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
            title="Réduire"
            aria-label="Réduire"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 4L6 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {/* Bouton plein écran / restaurer */}
        <button
          onClick={() => setSize(isMaximized ? 'normal' : 'maximized')}
          className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
          title={isMaximized ? 'Restaurer' : 'Plein écran'}
          aria-label={isMaximized ? 'Restaurer' : 'Plein écran'}
        >
          {isMaximized ? (
            /* icône restaurer (réduire depuis plein écran) */
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 11L2 14M11 5l3-3M2 11h4v4M10 2h4v4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            /* icône agrandir */
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {isLoading && (
        <div className="text-center text-xs text-gray-400 py-0.5 animate-pulse bg-gray-50 flex-shrink-0">
          Chargement…
        </div>
      )}

      <Calendar
        localizer={localizer}
        events={rbcEvents}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent as never}
        onSelectSlot={handleSelectSlot}
        selectable
        popup
        toolbar={false}
        eventPropGetter={eventPropGetter as never}
        components={{ event: EventWrapper as never }}
        messages={MESSAGES}
        style={{ height: isMaximized ? 'calc(100vh - 7rem)' : 'calc(100vh - 11rem)' }}
        className="rbc-cadenflu"
      />

      {modalSlot && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setModalSlot(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-event-modal-title"
          >
            <h2 id="new-event-modal-title" className="text-lg font-semibold text-gray-900 mb-4">
              Nouvel événement
            </h2>
            <EventForm
              defaultCalendarId={calendarId}
              defaultSuggestion={modalSuggestion}
              onSuccess={() => setModalSlot(null)}
              onCancel={() => setModalSlot(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
})
