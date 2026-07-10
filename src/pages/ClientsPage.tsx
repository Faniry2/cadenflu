import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClients, useCreateClient, useUpdateClient } from '../hooks/useClients'
import { useReport } from '../hooks/useReports'
import { ClientCard } from '../components/ClientCard'
import type { ClientHoursSummary } from '../api/types'

const schema = z.object({
  name: z.string().min(1, 'Nom requis'),
  color: z.string().default('#6366f1'),
  timezone: z.string().default('Europe/Paris'),
  rate_per_hour: z.coerce.number().positive().optional(),
  forfait_hours: z.coerce.number().positive().optional(),
})

type FormValues = z.infer<typeof schema>

const TIMEZONES = [
  'Europe/Paris', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Australia/Sydney', 'UTC',
]

export function ClientsPage() {
  const { data: clientList = [], isLoading } = useClients()
  const { data: report } = useReport()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const [showForm, setShowForm] = useState(false)

  const summaryByClient: Record<string, ClientHoursSummary> = {}
  report?.rows.forEach((r) => {
    summaryByClient[r.client_id] = {
      client_id: r.client_id,
      client_name: r.client_name,
      client_color: r.client_color,
      hours_billed: r.hours,
      forfait_hours: clientList.find((c) => c.id === r.client_id)?.forfait_hours ?? null,
      amount_estimated: r.amount_estimated,
    }
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', timezone: 'Europe/Paris' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await createClient.mutateAsync({
        name: values.name,
        color: values.color,
        timezone: values.timezone,
        rate_per_hour: values.rate_per_hour ?? null,
        forfait_hours: values.forfait_hours ?? null,
      })
      reset()
      setShowForm(false)
    } catch {
      // erreur affichée via createClient.error ci-dessous
    }
  }

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archiver ce client ?')) return
    await updateClient.mutateAsync({ id, data: { status: 'inactive' } })
  }

  const activeClients = clientList.filter((c) => c.status === 'active')
  const inactiveClients = clientList.filter((c) => c.status === 'inactive')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouveau client'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-800">Créer un client</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                Nom <span aria-hidden>*</span>
              </label>
              <input
                id="client-name"
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Nom du client ou de l'entreprise"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="client-color" className="block text-sm font-medium text-gray-700">
                Couleur
              </label>
              <input
                id="client-color"
                type="color"
                {...register('color')}
                className="mt-1 h-9 w-full rounded-md border-gray-300 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="client-tz" className="block text-sm font-medium text-gray-700">
                Fuseau horaire du client
              </label>
              <select
                id="client-tz"
                {...register('timezone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="client-rate" className="block text-sm font-medium text-gray-700">
                Taux horaire (€)
              </label>
              <input
                id="client-rate"
                type="number"
                min={0}
                step={0.01}
                {...register('rate_per_hour')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. 75"
              />
            </div>

            <div>
              <label htmlFor="client-forfait" className="block text-sm font-medium text-gray-700">
                Forfait mensuel (h)
              </label>
              <input
                id="client-forfait"
                type="number"
                min={0}
                {...register('forfait_hours')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. 20"
              />
            </div>
          </div>

          {createClient.error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              Erreur : {(createClient.error as Error).message ?? 'Impossible de créer le client.'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setShowForm(false) }}
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
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : activeClients.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-3">Aucun client actif.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
          >
            Ajouter votre premier client →
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {activeClients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                summary={summaryByClient[c.id]}
                onDelete={handleArchive}
              />
            ))}
          </div>

          {inactiveClients.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                Clients archivés ({inactiveClients.length})
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                {inactiveClients.map((c) => (
                  <ClientCard key={c.id} client={c} summary={summaryByClient[c.id]} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  )
}
