import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DateTime } from 'luxon'
import { useCalendars } from '../hooks/useCalendars'
import { useClients } from '../hooks/useClients'
import { useCreateEvent, useUpdateEvent } from '../hooks/useEvents'
import { useConflictCheck } from '../hooks/useConflicts'
import { useCalendarStore } from '../store/calendarStore'
import { useAuthStore } from '../store/authStore'
import { ConflictBanner } from './ConflictBanner'
import { ConflictGantt } from './ConflictGantt'
import { SuggestionList } from './SuggestionList'
import type { EventRead, EventReadWithClient, SlotSuggestion } from '../api/types'
import { localToUTCIso, toLocal } from '../utils/datetime'

const schema = z
  .object({
    title: z.string().min(1, 'Le titre est requis'),
    calendar_id: z.string().min(1, "Veuillez sélectionner un agenda"),
    client_id: z.string().optional(),
    billable: z.boolean(),
    start: z.string().min(1, 'Date de début requise'),
    end: z.string().min(1, 'Date de fin requise'),
    all_day: z.boolean(),
    location: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high']),
    rrule: z.string().optional(),
  })
  .refine((d) => !d.all_day || d.start <= d.end, {
    message: 'La fin doit être après le début',
    path: ['end'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  event?: EventRead
  defaultSuggestion?: SlotSuggestion
  defaultCalendarId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const toLocalInput = (utcIso: string, tz: string) =>
  DateTime.fromISO(utcIso, { zone: 'utc' }).setZone(tz).toFormat("yyyy-MM-dd'T'HH:mm")

export function EventForm({ event, defaultSuggestion, defaultCalendarId, onSuccess, onCancel }: Props) {
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const { data: cals = [] } = useCalendars()
  const { data: clientList = [] } = useClients()
  const visibility = useCalendarStore((s) => s.visibility)
  const visibleIds = useMemo(
    () => cals.map((c) => c.id).filter((id) => visibility[id] !== false),
    [cals, visibility]
  )
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const { conflicts, checking, check, reset } = useConflictCheck()
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])

  const defaultStart = defaultSuggestion
    ? toLocalInput(defaultSuggestion.start_utc, timezone)
    : event
    ? toLocalInput(event.start_utc, timezone)
    : DateTime.now().setZone(timezone).startOf('hour').plus({ hours: 1 }).toFormat("yyyy-MM-dd'T'HH:mm")

  const defaultEnd = defaultSuggestion
    ? toLocalInput(defaultSuggestion.end_utc, timezone)
    : event
    ? toLocalInput(event.end_utc, timezone)
    : DateTime.now().setZone(timezone).startOf('hour').plus({ hours: 2 }).toFormat("yyyy-MM-dd'T'HH:mm")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? '',
      calendar_id: defaultCalendarId ?? event?.calendar_id ?? visibleIds[0] ?? cals[0]?.id ?? '',
      client_id: (event as EventReadWithClient)?.client_id ?? '',
      billable: (event as EventReadWithClient)?.billable ?? true,
      start: defaultStart,
      end: defaultEnd,
      all_day: event?.all_day ?? false,
      location: event?.location ?? '',
      description: event?.description ?? '',
      priority: event?.priority ?? 'normal',
      rrule: event?.rrule ?? '',
    },
  })

  const [watchTitle, watchStart, watchEnd, watchCalendarId, watchAllDay, watchClientId] = watch([
    'title', 'start', 'end', 'calendar_id', 'all_day', 'client_id',
  ])

  // Double fuseau — heure dans le fuseau du client sélectionné
  const selectedClient = clientList.find((c) => c.id === watchClientId)
  const clientTimezone = selectedClient?.timezone
  const clientStartDisplay =
    clientTimezone && watchStart && clientTimezone !== timezone
      ? toLocal(localToUTCIso(new Date(watchStart), timezone), clientTimezone).toFormat('HH:mm')
      : null
  const clientEndDisplay =
    clientTimezone && watchEnd && clientTimezone !== timezone
      ? toLocal(localToUTCIso(new Date(watchEnd), timezone), clientTimezone).toFormat('HH:mm')
      : null

  useEffect(() => {
    if (!watchStart || !watchEnd || !watchCalendarId) return
    check({
      calendar_ids: cals.map((c) => c.id),
      start_utc: localToUTCIso(new Date(watchStart), timezone),
      end_utc: localToUTCIso(new Date(watchEnd), timezone),
      exclude_event_id: event?.id,
    })
    return reset
  }, [watchStart, watchEnd, watchCalendarId, cals, timezone, event?.id, check, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      calendar_id: values.calendar_id,
      title: values.title,
      description: values.description || null,
      location: values.location || null,
      start_utc: localToUTCIso(new Date(values.start), timezone),
      end_utc: localToUTCIso(new Date(values.end), timezone),
      all_day: values.all_day,
      priority: values.priority,
      rrule: values.rrule || null,
      client_id: values.client_id || null,
      billable: values.billable,
    }

    try {
      if (event) {
        await updateEvent.mutateAsync({ id: event.id, data: payload })
        onSuccess?.()
      } else {
        const res = await createEvent.mutateAsync(payload)
        setSuggestions(res.suggestions ?? [])
        if (res.conflicts.every((c) => c.severity !== 'blocking')) {
          onSuccess?.()
        }
      }
    } catch {
      // erreur affichée via createEvent.error / updateEvent.error ci-dessous
    }
  }

  const handleSuggestionSelect = (s: SlotSuggestion) => {
    setValue('start', toLocalInput(s.start_utc, timezone))
    setValue('end', toLocalInput(s.end_utc, timezone))
    setSuggestions([])
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Titre */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Titre <span aria-hidden>*</span>
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Nom de l'événement"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
      </div>

      {/* Client + Facturable */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
            Client
          </label>
          <select
            id="client_id"
            {...register('client_id')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">— Aucun —</option>
            {clientList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-1.5">
            <input
              id="billable"
              type="checkbox"
              {...register('billable')}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="billable" className="text-sm text-gray-700 font-medium">
              Facturable
            </label>
          </div>
          {selectedClient && (
            <p className="text-xs text-indigo-500 font-medium flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ backgroundColor: selectedClient.color }}
                aria-hidden
              />
              {selectedClient.name}
            </p>
          )}
        </div>
      </div>

      {/* Agenda */}
      <div>
        <label htmlFor="calendar_id" className="block text-sm font-medium text-gray-700">
          Agenda <span aria-hidden>*</span>
        </label>
        <select
          id="calendar_id"
          {...register('calendar_id')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {cals.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.calendar_id && (
          <p className="mt-1 text-xs text-red-600">{errors.calendar_id.message}</p>
        )}
      </div>

      {/* Dates + double fuseau */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start" className="block text-sm font-medium text-gray-700">
            Début <span aria-hidden>*</span>
          </label>
          <input
            id="start"
            type={watchAllDay ? 'date' : 'datetime-local'}
            {...register('start')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {clientStartDisplay && (
            <p className="mt-0.5 text-xs text-indigo-500">
              {clientStartDisplay} ({clientTimezone})
            </p>
          )}
          {errors.start && <p className="mt-1 text-xs text-red-600">{errors.start.message}</p>}
        </div>
        <div>
          <label htmlFor="end" className="block text-sm font-medium text-gray-700">
            Fin <span aria-hidden>*</span>
          </label>
          <input
            id="end"
            type={watchAllDay ? 'date' : 'datetime-local'}
            {...register('end')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {clientEndDisplay && (
            <p className="mt-0.5 text-xs text-indigo-500">
              {clientEndDisplay} ({clientTimezone})
            </p>
          )}
          {errors.end && <p className="mt-1 text-xs text-red-600">{errors.end.message}</p>}
        </div>
      </div>

      {/* Toute la journée */}
      <div className="flex items-center gap-2">
        <input
          id="all_day"
          type="checkbox"
          {...register('all_day')}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="all_day" className="text-sm text-gray-700">
          Toute la journée
        </label>
      </div>

      {/* Lieu */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Lieu
        </label>
        <input
          id="location"
          type="text"
          {...register('location')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Visio, téléphone, adresse…"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          rows={2}
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      {/* Priorité */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          Priorité
        </label>
        <select
          id="priority"
          {...register('priority')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="low">Basse</option>
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
        </select>
      </div>

      {/* Récurrence */}
      <div>
        <label htmlFor="rrule" className="block text-sm font-medium text-gray-700">
          Récurrence
        </label>
        <select
          id="rrule"
          {...register('rrule')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Aucune</option>
          <option value="FREQ=DAILY">Tous les jours</option>
          <option value="FREQ=WEEKLY">Toutes les semaines</option>
          <option value="FREQ=MONTHLY">Tous les mois</option>
        </select>
      </div>

      {/* Conflits temps réel */}
      {checking && (
        <p className="text-xs text-gray-400 animate-pulse">Vérification des conflits…</p>
      )}
      <ConflictBanner conflicts={conflicts} clientName={selectedClient?.name} />
      {conflicts.length > 0 && watchStart && watchEnd && (
        <ConflictGantt
          newTitle={watchTitle}
          newStartUtc={localToUTCIso(new Date(watchStart), timezone)}
          newEndUtc={localToUTCIso(new Date(watchEnd), timezone)}
          conflicts={conflicts}
        />
      )}

      {/* Suggestions */}
      <SuggestionList suggestions={suggestions} onSelect={handleSuggestionSelect} />

      {/* Erreur API */}
      {(createEvent.error || updateEvent.error) && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          Erreur : {((createEvent.error ?? updateEvent.error) as Error).message ?? 'Impossible d\'enregistrer l\'événement.'}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || conflicts.some((c) => c.severity === 'blocking')}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement…' : event ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  )
}
