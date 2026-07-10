import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '../store/authStore'

const schema = z.object({
  timezone: z.string().min(1),
})

type FormValues = z.infer<typeof schema>

const TIMEZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC',
]

export function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: user?.timezone ?? 'UTC' },
  })

  const onSubmit = async (values: FormValues) => {
    if (user) {
      setUser({ ...user, timezone: values.timezone })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Profil */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3">Profil</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 flex-shrink-0">Nom</dt>
              <dd className="text-gray-800 font-medium">{user?.display_name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 flex-shrink-0">Email</dt>
              <dd className="text-gray-800">{user?.email}</dd>
            </div>
          </dl>
        </div>

        <hr className="border-gray-100" />

        {/* Fuseau horaire */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Fuseau horaire</h2>
          <p className="text-xs text-gray-500">
            Toutes les dates sont stockées en UTC et affichées dans votre fuseau local.
          </p>
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
              Fuseau horaire
            </label>
            <select
              id="timezone"
              {...register('timezone')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Enregistrer
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Sauvegardé ✓</span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
