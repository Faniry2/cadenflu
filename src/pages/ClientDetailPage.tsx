import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClient, useUpdateClient, useDeleteClient, useClientAgenda } from '../hooks/useClients'
import { useReport } from '../hooks/useReports'
import { useStudentProfile } from '../hooks/useStudentProfile'
import { useAuthStore } from '../store/authStore'
import { DateTime } from 'luxon'
import { formatDateTime, formatLocal } from '../utils/datetime'
import { CLIENT_TYPE_LABELS, CLIENT_TYPE_BADGE_STYLES, CLIENT_TYPE_OPTIONS, clientDisplayName } from '../utils/clientType'
import { RISK_COLOR_BADGE_STYLES, RISK_COLOR_FALLBACK_STYLE } from '../utils/studentStatus'
import { StudentProfileTab } from '../components/StudentProfileTab'
import { cn } from '../utils/cn'

const schema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().optional(),
  email: z.union([z.literal(''), z.string().email('Email invalide')]).optional(),
  telephone: z.string().optional(),
  color: z.string(),
  timezone: z.string(),
  rate_per_hour: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().positive().optional().nullable()
  ),
  forfait_hours: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().positive().optional().nullable()
  ),
  client_type: z.enum(['patron', 'apprenant']),
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
  const [tab, setTab] = useState<'infos' | 'pedagogie'>('infos')
  const isApprenant = client?.client_type === 'apprenant'
  const { data: profile } = useStudentProfile(id!, isApprenant)
  const { data: agenda, isLoading: isAgendaLoading } = useClientAgenda(id!)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: client
      ? {
          nom: client.nom,
          prenom: client.prenom,
          email: client.email ?? '',
          telephone: client.telephone ?? '',
          color: client.color,
          timezone: client.timezone,
          rate_per_hour: client.rate_per_hour ?? undefined,
          forfait_hours: client.forfait_hours ?? undefined,
          client_type: client.client_type,
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
          nom: values.nom,
          prenom: values.prenom ?? '',
          email: values.email || null,
          telephone: values.telephone || null,
          color: values.color,
          timezone: values.timezone,
          rate_per_hour: values.rate_per_hour ?? null,
          forfait_hours: values.forfait_hours ?? null,
          client_type: values.client_type,
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
          <h1 className="text-2xl font-bold text-gray-900 truncate">{clientDisplayName(client)}</h1>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${CLIENT_TYPE_BADGE_STYLES[client.client_type]}`}
          >
            {CLIENT_TYPE_LABELS[client.client_type]}
          </span>
          {isApprenant && profile?.risk_color && (
            <span
              className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                RISK_COLOR_BADGE_STYLES[profile.risk_color] ?? RISK_COLOR_FALLBACK_STYLE
              )}
            >
              Risque {profile.risk_color}
            </span>
          )}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom *</label>
              <input
                type="text"
                {...register('nom')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.nom && <p className="mt-1 text-xs text-red-600">{errors.nom.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prénom</label>
              <input
                type="text"
                {...register('prenom')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="tel"
                {...register('telephone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="col-span-2">
              <span className="block text-sm font-medium text-gray-700 mb-1">Type de client</span>
              <div className="flex gap-4">
                {CLIENT_TYPE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="radio" value={opt.value} {...register('client_type')} />
                    {opt.label}
                  </label>
                ))}
              </div>
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

      {/* Onglets */}
      {isApprenant && (
        <div className="flex gap-2 mb-5 border-b border-gray-200">
          {(['infos', 'pedagogie'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'infos' ? 'Infos' : 'Suivi pédagogique'}
            </button>
          ))}
        </div>
      )}

      {tab === 'pedagogie' && isApprenant ? (
        <StudentProfileTab clientId={client.id} />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{client.email ?? <span className="text-gray-400">—</span>}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Téléphone</span>
              <span className="font-medium">{client.telephone ?? <span className="text-gray-400">—</span>}</span>
            </div>
          </div>
        </section>

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
                  {row.amount_estimated != null
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

        {/* Agenda du client */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Rendez-vous</h2>
          {isAgendaLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : agenda && agenda.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {agenda.map((ev) => (
                <li key={ev.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(ev.start_utc, userTz)} → {formatLocal(ev.end_utc, userTz)}
                    </p>
                  </div>
                  <Link
                    to={`/events/${ev.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0"
                  >
                    Détail
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Aucun rendez-vous pour ce client.</p>
          )}
        </section>
      </div>
      )}
    </div>
  )
}
