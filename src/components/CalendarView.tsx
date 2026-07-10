import { useState, useMemo, useCallback } from 'react'
import { Calendar, luxonLocalizer, type View, type Messages } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import type { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import { DateTime } from 'luxon'
import { useNavigate } from 'react-router-dom'
import { useCalendars } from '../hooks/useCalendars'
import { useClients } from '../hooks/useClients'
import { useEvents } from '../hooks/useEvents'
import { useUpdateEvent } from '../hooks/useEvents'
import { useCalendarStore } from '../store/calendarStore'
import { useAuthStore } from '../store/authStore'
import { utcIsoToLocalDate, toLocal, localToUTCIso } from '../utils/datetime'
import type { EventReadWithClient } from '../api/types'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const localizer = luxonLocalizer(DateTime, { firstDayOfWeek: 1 })

// Calendar enrichi avec le module drag-and-drop officiel
const DnDCalendar = withDragAndDrop(Calendar)

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
  resource: EventReadWithClient
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

export function CalendarView() {
  const navigate = useNavigate()
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const { data: cals = [] } = useCalendars()
  const { data: clientList = [] } = useClients()
  const updateEvent = useUpdateEvent()

  const visibility = useCalendarStore((s) => s.visibility)
  const visibleIds = useMemo(
    () => cals.map((c) => c.id).filter((id) => visibility[id] !== false),
    [cals, visibility]
  )

  const calMap = useMemo(
    () => Object.fromEntries(cals.map((c) => [c.id, c])),
    [cals]
  )
  const clientMap = useMemo(
    () => Object.fromEntries(clientList.map((c) => [c.id, c])),
    [clientList]
  )

  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())

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
    calendar_ids: visibleIds.length > 0 ? visibleIds : undefined,
  })

  const rbcEvents = useMemo(
    () =>
      eventsData.map((e) => ({
        id: e.id,
        title: e.title,
        start: utcIsoToLocalDate(e.start_utc, timezone),
        end: utcIsoToLocalDate(e.end_utc, timezone),
        allDay: e.all_day,
        resource: e as EventReadWithClient,
      })),
    [eventsData, timezone]
  )

  const eventPropGetter = useCallback(
    (event: RbcEvent) => {
      const ev = event.resource
      const client = ev.client_id ? clientMap[ev.client_id] : undefined
      const cal = calMap[ev.calendar_id]
      const color = client?.color ?? cal?.color ?? '#6366f1'
      return {
        style: { backgroundColor: color, borderColor: color, color: '#fff' },
      }
    },
    [calMap, clientMap]
  )

  const EventWrapper = useCallback(
    ({ event }: { event: RbcEvent }) => {
      const ev = event.resource
      const client = ev.client_id ? clientMap[ev.client_id] : undefined
      return (
        <EventItem
          event={event}
          clientColor={client?.color}
          clientName={client?.name}
          clientTimezone={client?.timezone}
          userTimezone={timezone}
        />
      )
    },
    [clientMap, timezone]
  )

  // Convertit un stringOrDate (local, issu de react-big-calendar) en UTC ISO
  const toUtcIso = useCallback(
    (d: Date | string): string =>
      localToUTCIso(typeof d === 'string' ? new Date(d) : d, timezone),
    [timezone]
  )

  // Drag-and-drop : déplacement
  const handleEventDrop = useCallback(
    ({ event, start, end }: EventInteractionArgs<RbcEvent>) => {
      updateEvent.mutate({
        id: event.id,
        data: {
          start_utc: toUtcIso(start as Date | string),
          end_utc: toUtcIso(end as Date | string),
        },
      })
    },
    [updateEvent, toUtcIso]
  )

  // Drag-and-drop : redimensionnement
  const handleEventResize = useCallback(
    ({ event, start, end }: EventInteractionArgs<RbcEvent>) => {
      updateEvent.mutate({
        id: event.id,
        data: {
          start_utc: toUtcIso(start as Date | string),
          end_utc: toUtcIso(end as Date | string),
        },
      })
    },
    [updateEvent, toUtcIso]
  )

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: '400px' }}>
      {isLoading && (
        <div className="text-center text-xs text-gray-400 py-1 animate-pulse">
          Chargement…
        </div>
      )}
      <DnDCalendar
        localizer={localizer}
        events={rbcEvents}
        view={view}
        date={date}
        onView={setView}
        onNavigate={setDate}
        onSelectEvent={(e) => navigate(`/events/${(e as RbcEvent).id}`)}
        onSelectSlot={({ start }: { start: Date }) =>
          navigate(`/events/new?start=${encodeURIComponent(start.toISOString())}`)
        }
        selectable
        popup
        onEventDrop={handleEventDrop as never}
        onEventResize={handleEventResize as never}
        resizable
        eventPropGetter={eventPropGetter as never}
        components={{ event: EventWrapper as never }}
        messages={MESSAGES}
        style={{ height: 'calc(100vh - 7rem)' }}
        className="rbc-cadenflu"
      />
    </div>
  )
}
