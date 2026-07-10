import { useMemo, useCallback } from 'react'
import { Calendar, luxonLocalizer } from 'react-big-calendar'
import { DateTime } from 'luxon'
import { useNavigate } from 'react-router-dom'
import { utcIsoToLocalDate, localToUTCIso } from '../utils/datetime'
import type { FreeSlot, EventReadWithClient, CalendarRead, ClientRead } from '../api/types'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = luxonLocalizer(DateTime, { firstDayOfWeek: 1 })

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: EventReadWithClient | FreeSlot
  kind: 'event' | 'slot'
}

interface Props {
  events: EventReadWithClient[]
  freeSlots: FreeSlot[]
  calMap: Record<string, CalendarRead>
  clientMap: Record<string, ClientRead>
  timezone: string
  isLoading?: boolean
}

export function TodayAgendaView({ events, freeSlots, calMap, clientMap, timezone, isLoading }: Props) {
  const navigate = useNavigate()

  const today = useMemo(
    () => DateTime.now().setZone(timezone).toJSDate(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timezone, DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd')]
  )

  const rbcEvents = useMemo<RbcEvent[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: utcIsoToLocalDate(e.start_utc, timezone),
        end: utcIsoToLocalDate(e.end_utc, timezone),
        allDay: e.all_day,
        resource: e,
        kind: 'event' as const,
      })),
    [events, timezone]
  )

  const backgroundEvents = useMemo<RbcEvent[]>(
    () =>
      freeSlots.map((s, i) => ({
        id: `slot-${i}`,
        title: 'Libre',
        start: utcIsoToLocalDate(s.start_utc, timezone),
        end: utcIsoToLocalDate(s.end_utc, timezone),
        allDay: false,
        resource: s,
        kind: 'slot' as const,
      })),
    [freeSlots, timezone]
  )

  const eventPropGetter = useCallback(
    (event: RbcEvent) => {
      const e = event.resource as EventReadWithClient
      const client = e.client_id ? clientMap[e.client_id] : undefined
      const cal = calMap[e.calendar_id]
      const color = client?.color ?? cal?.color ?? '#6366f1'
      return { style: { backgroundColor: color, borderColor: color, color: '#fff' } }
    },
    [calMap, clientMap]
  )

  const handleSelectEvent = useCallback(
    (event: object) => {
      const e = event as RbcEvent
      navigate(`/events/${e.id}`)
    },
    [navigate]
  )

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      navigate(`/events/new?start=${encodeURIComponent(localToUTCIso(start, timezone))}`)
    },
    [navigate, timezone]
  )

  if (isLoading) {
    return <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
  }

  return (
    <Calendar
      localizer={localizer}
      events={rbcEvents}
      backgroundEvents={backgroundEvents}
      view="day"
      date={today}
      onNavigate={() => {}}
      onView={() => {}}
      toolbar={false}
      selectable
      onSelectEvent={handleSelectEvent as never}
      onSelectSlot={handleSelectSlot}
      eventPropGetter={eventPropGetter as never}
      messages={{
        noEventsInRange: 'Aucun événement aujourd\'hui.',
        event: 'Événement',
        time: 'Heure',
        date: 'Date',
        today: "Aujourd'hui",
        previous: 'Précédent',
        next: 'Suivant',
        month: 'Mois',
        week: 'Semaine',
        day: 'Jour',
        agenda: 'Agenda',
        showMore: (n) => `+${n} de plus`,
      }}
      style={{ height: 500 }}
      className="rbc-cadenflu"
    />
  )
}
