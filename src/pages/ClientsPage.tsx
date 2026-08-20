import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClients, useCreateClient, useUpdateClient, useClientSearch, type ClientSearchParams } from '../hooks/useClients'
import { useReport } from '../hooks/useReports'
import { useStudents } from '../hooks/useStudents'
import { ClientCard } from '../components/ClientCard'
import type { ClientHoursSummary, ClientType } from '../api/models'
import { CLIENT_TYPE_OPTIONS } from '../utils/clientType'

const schema = z
  .object({
    prenom: z.string().optional(),
    nom: z.string().min(1, 'Nom requis'),
    email: z.union([z.literal(''), z.string().email('Email invalide')]).optional(),
    telephone: z.string().optional(),
    color: z.string().default('#6366f1'),
    timezone: z.string().default('Europe/Paris'),
    rate_per_hour: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.coerce.number().positive().optional()
    ),
    forfait_hours: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.coerce.number().positive().optional()
    ),
    client_type: z.enum(['patron', 'apprenant']).default('patron'),
  })
  .refine((data) => data.client_type !== 'apprenant' || !!data.prenom?.trim(), {
    message: 'Prénom requis',
    path: ['prenom'],
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
  const [showSearch, setShowSearch] = useState(false)
  const [searchParams, setSearchParams] = useState<ClientSearchParams>({})
  const { data: searchResults, isFetching: isSearching } = useClientSearch(searchParams)
  const isSearchActive = Object.values(searchParams).some((v) => !!v?.trim())
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all')
  const showApprenants = typeFilter === 'all' || typeFilter === 'apprenant'
  const { data: studentList = [] } = useStudents(undefined, showApprenants)
  const riskColorByClient = Object.fromEntries(
    studentList.filter((s) => s.profile?.risk_color).map((s) => [s.id, s.profile!.risk_color])
  )

  const summaryByClient: Record<string, ClientHoursSummary> = {}
  report?.rows.forEach((r) => {
    summaryByClient[r.client_id] = {
      client_id: r.client_id,
      client_name: r.client_name,
      client_color: r.client_color,
      hours_billed: r.hours,
      forfait_hours: clientList.find((c) => c.id === r.client_id)?.forfait_hours ?? null,
      amount_estimated: r.amount_estimated ?? null,
    }
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { color: '#6366f1', timezone: 'Europe/Paris', client_type: 'patron' },
  })
  const selectedType = watch('client_type')
  const isPatron = selectedType === 'patron'

  const onSubmit = async (values: FormValues) => {
    try {
      await createClient.mutateAsync({
        nom: values.nom.trim(),
        prenom: values.prenom?.trim() ?? '',
        email: values.email || null,
        telephone: values.telephone || null,
        color: values.color,
        timezone: values.timezone,
        // Les apprenants ne sont pas facturés directement (c'est le patron qui paie) :
        // pas de tarification pour ce type, le champ est masqué côté formulaire.
        rate_per_hour: values.client_type === 'patron' ? values.rate_per_hour ?? null : null,
        forfait_hours: values.client_type === 'patron' ? values.forfait_hours ?? null : null,
        client_type: values.client_type,
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

  const filteredClients =
    typeFilter === 'all' ? clientList : clientList.filter((c) => c.client_type === typeFilter)
  const activeClients = filteredClients.filter((c) => c.status === 'active')
  const inactiveClients = filteredClients.filter((c) => c.status === 'inactive')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {showSearch ? 'Fermer la recherche' : 'Rechercher'}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Annuler' : '+ Nouveau client'}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Rechercher un client</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Nom"
              value={searchParams.nom ?? ''}
              onChange={(e) => setSearchParams((p) => ({ ...p, nom: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <input
              type="text"
              placeholder="Prénom"
              value={searchParams.prenom ?? ''}
              onChange={(e) => setSearchParams((p) => ({ ...p, prenom: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <input
              type="text"
              placeholder="Email"
              value={searchParams.email ?? ''}
              onChange={(e) => setSearchParams((p) => ({ ...p, email: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <input
              type="text"
              placeholder="Téléphone"
              value={searchParams.telephone ?? ''}
              onChange={(e) => setSearchParams((p) => ({ ...p, telephone: e.target.value }))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <div>
              <label htmlFor="search-inscription" className="block text-xs text-gray-400 mb-1">
                Date d'inscription (apprenants)
              </label>
              <input
                id="search-inscription"
                type="date"
                value={searchParams.inscription_date ?? ''}
                onChange={(e) => setSearchParams((p) => ({ ...p, inscription_date: e.target.value }))}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm w-full"
              />
            </div>
          </div>
          {isSearchActive && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Effacer la recherche
            </button>
          )}

          {isSearchActive && (
            isSearching ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {searchResults.map((c) => (
                  <ClientCard key={c.id} client={c} summary={summaryByClient[c.id]} riskColor={riskColorByClient[c.id]} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 pt-1">Aucun résultat pour cette recherche.</p>
            )
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-800">Créer un client</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                Nom <span aria-hidden>*</span>
              </label>
              <input
                id="client-name"
                type="text"
                {...register('nom')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={isPatron ? "Nom du client ou de l'entreprise" : "Nom de l'apprenant"}
              />
              {errors.nom && <p className="mt-1 text-xs text-red-600">{errors.nom.message}</p>}
            </div>

            <div>
              <label htmlFor="client-first-name" className="block text-sm font-medium text-gray-700">
                Prénom {!isPatron && <span aria-hidden>*</span>}
              </label>
              <input
                id="client-first-name"
                type="text"
                {...register('prenom')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={isPatron ? 'Prénom (optionnel)' : "Prénom de l'apprenant"}
              />
              {errors.prenom && <p className="mt-1 text-xs text-red-600">{errors.prenom.message}</p>}
            </div>

            <div>
              <label htmlFor="client-email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="client-email"
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. contact@exemple.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="client-telephone" className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                id="client-telephone"
                type="tel"
                {...register('telephone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. 06 12 34 56 78"
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

            {isPatron && (
              <>
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
              </>
            )}
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

      <div className="flex gap-2 mb-4">
        {(['all', 'patron', 'apprenant'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              typeFilter === t
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t === 'all' ? 'Tous' : CLIENT_TYPE_OPTIONS.find((o) => o.value === t)?.label}
          </button>
        ))}
      </div>

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
                riskColor={riskColorByClient[c.id]}
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
