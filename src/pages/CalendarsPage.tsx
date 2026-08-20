import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCalendars, useCreateCalendar, useUpdateCalendar, useDeleteCalendar } from '../hooks/useCalendars'
import type { CalendarRead } from '../api/models'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  color: z.string().default('#6366f1'),
  type: z.enum(['personal', 'work', 'team', 'resource']).default('personal'),
  default_buffer_min: z.coerce.number().int().min(0).default(30),
})

type FormValues = z.infer<typeof schema>

const typeLabels: Record<string, string> = {
  personal: 'Personnel',
  work: 'Travail',
  team: 'Équipe',
  resource: 'Ressource',
}

function CalendarFormFields({ register, errors }: {
  register: ReturnType<typeof useForm<FormValues>>['register']
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors']
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label htmlFor="cal-name" className="block text-sm font-medium text-gray-700">
          Nom <span aria-hidden>*</span>
        </label>
        <input
          id="cal-name"
          type="text"
          autoFocus
          {...register('name')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="cal-color" className="block text-sm font-medium text-gray-700">
          Couleur
        </label>
        <input
          id="cal-color"
          type="color"
          {...register('color')}
          className="mt-1 h-9 w-full rounded-md border-gray-300 cursor-pointer"
        />
      </div>
      <div>
        <label htmlFor="cal-type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="cal-type"
          {...register('type')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label htmlFor="cal-buffer" className="block text-sm font-medium text-gray-700">
          Marge par défaut (min)
        </label>
        <input
          id="cal-buffer"
          type="number"
          min={0}
          {...register('default_buffer_min')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </div>
  )
}

function EditCalendarForm({ cal, onDone }: { cal: CalendarRead; onDone: () => void }) {
  const updateCal = useUpdateCalendar()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: cal.name,
      color: cal.color,
      type: cal.type as FormValues['type'],
      default_buffer_min: cal.default_buffer_min,
    },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)
    try {
      await updateCal.mutateAsync({ id: cal.id, data: values })
      onDone()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown }; status?: number } }
      const detail = axiosErr?.response?.data?.detail
      const status = axiosErr?.response?.status
      if (typeof detail === 'string') {
        setSubmitError(`Erreur ${status} : ${detail}`)
      } else {
        setSubmitError(`Erreur ${status ?? 'réseau'} — vérifiez les logs du backend.`)
      }
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-3">
      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {submitError}
        </p>
      )}
      <CalendarFormFields register={register} errors={errors} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

function CalendarCard({
  cal,
  isEditing,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  cal: CalendarRead
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-sm flex-shrink-0"
            style={{ backgroundColor: cal.color }}
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">{cal.name}</p>
            <p className="text-xs text-gray-400">
              {typeLabels[cal.type]} · Marge : {cal.default_buffer_min} min
              {cal.role && ` · Rôle : ${cal.role}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/calendars/${cal.id}/share`}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Partager
          </Link>
          {(!cal.role || cal.role === 'owner') && (
            <>
              <button
                type="button"
                onClick={isEditing ? onCancelEdit : onEdit}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {isEditing ? 'Annuler' : 'Modifier'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(cal.id)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <EditCalendarForm cal={cal} onDone={onCancelEdit} />
      )}
    </div>
  )
}

export function CalendarsPage() {
  const { data: cals = [], isLoading } = useCalendars()
  const createCal = useCreateCalendar()
  const deleteCal = useDeleteCalendar()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', type: 'personal', default_buffer_min: 30 },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)
    try {
      await createCal.mutateAsync(values)
      reset()
      setShowForm(false)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown }; status?: number } }
      const detail = axiosErr?.response?.data?.detail
      const status = axiosErr?.response?.status
      if (typeof detail === 'string') {
        setSubmitError(`Erreur ${status} : ${detail}`)
      } else if (Array.isArray(detail)) {
        setSubmitError(`Erreur ${status} : ${detail.map((d: { msg?: string }) => d.msg).join(', ')}`)
      } else {
        setSubmitError(`Erreur ${status ?? 'réseau'} — vérifiez les logs du backend.`)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet agenda ?')) return
    try {
      await deleteCal.mutateAsync(id)
      if (editingId === id) setEditingId(null)
    } catch {
      window.alert('Impossible de supprimer cet agenda.')
    }
  }

  const toggleForm = () => {
    setShowForm((v) => !v)
    setSubmitError(null)
    reset()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes agendas</h1>
        <button
          type="button"
          onClick={toggleForm}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouvel agenda'}
        </button>
      </div>

      {showForm && (
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-800">Créer un agenda</h2>
          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {submitError}
            </p>
          )}
          <CalendarFormFields register={register} errors={errors} />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={toggleForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : cals.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucun agenda. Créez votre premier agenda ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          {cals.map((c) => (
            <CalendarCard
              key={c.id}
              cal={c}
              isEditing={editingId === c.id}
              onEdit={() => setEditingId(c.id)}
              onCancelEdit={() => setEditingId(null)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
