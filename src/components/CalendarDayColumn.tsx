import { useMemo, useCallback } from 'react'
import { Calendar, luxonLocalizer } from 'react-big-calendar'
import { DateTime } from 'luxon'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useAvailability } from '../hooks/useAvailability'
import { utcIsoToLocalDate, localToUTCIso } from '../utils/datetime'
import type { CalendarRead, ClientRead, EventRead } from '../api/models'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = luxonLocalizer(DateTime, { firstDayOfWeek: 1 })

const MESSAGES = {
  noEventsInRange: 'Aucun événement.',
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
  showMore: (n: number) => `+${n} de plus`,
}

interface RbcEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  resource: EventRead | { start_utc: string; end_utc: string; duration_min: number }
}

interface Props {
  cal: CalendarRead
  calMap: Record<string, CalendarRead>
  clientMap: Record<string, ClientRead>
  timezone: string
  todayRange: { from_utc: string; to_utc: string }
}

export function CalendarDayColumn({ cal, calMap, clientMap, timezone, todayRange }: Props) {
  const navigate = useNavigate()

  const calendarIds = useMemo(() => [cal.id], [cal.id])

  const { data: eventsData = [], isLoading } = useEvents({
    from_utc: todayRange.from_utc,
    to_utc: todayRange.to_utc,
    calendar_ids: calendarIds,
  })

  const { data: availData } = useAvailability({
    from_utc: todayRange.from_utc,
    to_utc: todayRange.to_utc,
    calendar_ids: calendarIds,
  })

  const today = useMemo(() => DateTime.now().setZone(timezone).toJSDate(), [timezone])

  const rbcEvents = useMemo<RbcEvent[]>(
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

  const backgroundEvents = useMemo<RbcEvent[]>(
    () =>
      (availData?.free_slots ?? []).map((s, i) => ({
        id: `slot-${i}`,
        title: 'Libre',
        start: utcIsoToLocalDate(s.start_utc, timezone),
        end: utcIsoToLocalDate(s.end_utc, timezone),
        allDay: false,
        resource: s,
      })),
    [availData, timezone]
  )

  const eventPropGetter = useCallback(
    (event: RbcEvent) => {
      const e = event.resource as EventRead
      const client = e.client_id ? clientMap[e.client_id] : undefined
      const color = client?.color ?? calMap[e.calendar_id]?.color ?? cal.color
      return { style: { backgroundColor: color, borderColor: color, color: '#fff' } }
    },
    [cal.color, calMap, clientMap]
  )

  const handleSelectEvent = useCallback(
    (event: object) => navigate(`/events/${(event as RbcEvent).id}`),
    [navigate]
  )

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) =>
      navigate(`/events/new?start=${encodeURIComponent(localToUTCIso(start, timezone))}`),
    [navigate, timezone]
  )

  return (
    <div className="flex flex-col min-w-0 flex-1" style={{ minWidth: '280px', maxWidth: '480px' }}>
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span
          className="w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: cal.color }}
          aria-hidden
        />
        <span className="text-sm font-semibold text-gray-800 truncate">{cal.name}</span>
        {isLoading && (
          <span className="ml-auto text-xs text-gray-400 animate-pulse">…</span>
        )}
        {!isLoading && availData && (
          <span className="ml-auto text-xs text-green-600 flex-shrink-0">
            {availData.free_slots.length} libre{availData.free_slots.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Vue jour */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
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
          messages={MESSAGES}
          style={{ height: 480 }}
          className="rbc-cadenflu"
        />
      </div>
    </div>
  )
}
