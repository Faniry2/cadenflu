import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClient, useUpdateClient, useDeleteClient } from '../hooks/useClients'
import { useReport } from '../hooks/useReports'
import { useAuthStore } from '../store/authStore'
import { DateTime } from 'luxon'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  color: z.string(),
  timezone: z.string(),
  rate_per_hour: z.coerce.number().positive().optional().nullable(),
  forfait_hours: z.coerce.number().positive().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

const TIMEZONES = [
  'Europe/Paris', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Australia/Sydney', 'UTC',
]

function ForfaitGauge({ hours, forfait }: { hours: number; forfait: number }) {
  const pct = Math.min((hours / forfait) * 100, 100)
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div>
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span className="font-semibold">{hours.toFixed(1)}h</span>
        <span className="text-gray-400">/ {forfait}h forfait</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 100 && (
        <p className="text-xs text-red-600 font-medium mt-1">
          Forfait dépassé de {(hours - forfait).toFixed(1)}h
        </p>
      )}
      {pct >= 80 && pct < 100 && (
        <p className="text-xs text-orange-500 font-medium mt-1">
          {(forfait - hours).toFixed(1)}h restantes — proche du quota
        </p>
      )}
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const userTz = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const { data: client, isLoading } = useClient(id!)
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const currentMonth = DateTime.now().toFormat('yyyy-MM')
  const { data: report } = useReport(currentMonth)
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: client
      ? {
          name: client.name,
          color: client.color,
          timezone: client.timezone,
          rate_per_hour: client.rate_per_hour ?? undefined,
          forfait_hours: client.forfait_hours ?? undefined,
        }
      : undefined,
  })

  const row = report?.rows.find((r) => r.client_id === id)

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Client introuvable.
        </div>
      </div>
    )
  }

  const nowClient = DateTime.now().setZone(client.timezone)
  const nowUser = DateTime.now().setZone(userTz)
  const tzDifferent = client.timezone !== userTz

  const onSubmit = async (values: FormValues) => {
    try {
      await updateClient.mutateAsync({
        id: client.id,
        data: {
          name: values.name,
          color: values.color,
          timezone: values.timezone,
          rate_per_hour: values.rate_per_hour ?? null,
          forfait_hours: values.forfait_hours ?? null,
        },
      })
      setEditing(false)
    } catch {
      // erreur affichée via updateClient.error ci-dessous
    }
  }

  const handleArchive = async () => {
    if (!window.confirm('Archiver ce client ?')) return
    await updateClient.mutateAsync({ id: client.id, data: { status: 'inactive' } })
  }

  const handleReactivate = async () => {
    await updateClient.mutateAsync({ id: client.id, data: { status: 'active' } })
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer définitivement ce client ? Cette action est irréversible.')) return
    await deleteClient.mutateAsync(client.id)
    navigate('/clients')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/clients" className="text-sm text-gray-400 hover:text-gray-600">
          ← Clients
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="w-5 h-5 rounded flex-shrink-0"
            style={{ backgroundColor: client.color }}
            aria-hidden
          />
          <h1 className="text-2xl font-bold text-gray-900 truncate">{client.name}</h1>
          {client.status === 'inactive' && (
            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
              Archivé
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Modifier
            </button>
          )}
          {client.status === 'active' ? (
            <button
              onClick={handleArchive}
              className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              Archiver
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              Réactiver
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Formulaire d'édition */}
      {editing && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-indigo-200 p-5 mb-5 space-y-4"
        >
          <h2 className="text-sm font-semibold text-gray-800">Modifier le client</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Nom *</label>
              <input
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Couleur</label>
              <input
                type="color"
                {...register('color')}
                className="mt-1 h-9 w-full rounded-md border-gray-300 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fuseau horaire</label>
              <select
                {...register('timezone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Taux horaire (€)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                {...register('rate_per_hour')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. 75"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Forfait mensuel (h)</label>
              <input
                type="number"
                min={0}
                {...register('forfait_hours')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. 20"
              />
            </div>
          </div>

          {updateClient.error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              Erreur : {(updateClient.error as Error).message ?? 'Impossible de modifier le client.'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setEditing(false) }}
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Fuseau horaire */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Fuseau horaire</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Vous ({userTz})</span>
              <span className="font-medium">{nowUser.toFormat('HH:mm')}</span>
            </div>
            {tzDifferent && (
              <div className="flex justify-between">
                <span className="text-gray-500">Client ({client.timezone})</span>
                <span className="font-medium text-indigo-600">{nowClient.toFormat('HH:mm')}</span>
              </div>
            )}
            {tzDifferent && (
              <p className="text-xs text-gray-400 mt-2">
                Décalage : {Math.round(nowClient.offset / 60 - nowUser.offset / 60)}h
              </p>
            )}
          </div>
        </section>

        {/* Tarification */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Tarification</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Taux horaire</span>
              <span className="font-medium">
                {client.rate_per_hour !== null
                  ? `${client.rate_per_hour} €/h`
                  : <span className="text-gray-400">—</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Forfait mensuel</span>
              <span className="font-medium">
                {client.forfait_hours !== null
                  ? `${client.forfait_hours} h`
                  : <span className="text-gray-400">—</span>}
              </span>
            </div>
          </div>
        </section>

        {/* Consommation du mois */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Consommation — {DateTime.fromFormat(currentMonth, 'yyyy-MM').toLocaleString({ month: 'long', year: 'numeric' })}
          </h2>
          {client.forfait_hours !== null ? (
            <ForfaitGauge hours={row?.hours ?? 0} forfait={client.forfait_hours} />
          ) : (
            <p className="text-sm text-gray-400">Aucun forfait défini.</p>
          )}
          {client.rate_per_hour !== null && row && (
            <p className="text-sm text-gray-600 mt-3">
              Montant estimé :{' '}
              <span className="font-semibold text-gray-800">
                {(row.hours * client.rate_per_hour).toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </span>
              {' '}({row.hours.toFixed(1)}h × {client.rate_per_hour}€/h)
            </p>
          )}
        </section>

        {/* Statistiques du mois */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ce mois-ci</h2>
          {row ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{row.hours.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-0.5">heures</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{row.events_count}</p>
                <p className="text-xs text-gray-400 mt-0.5">événements</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {row.amount_estimated !== null
                    ? row.amount_estimated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                    : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">estimé</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnée pour ce mois.</p>
          )}
        </section>
      </div>
    </div>
  )
}
