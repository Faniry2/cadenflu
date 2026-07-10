import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCalendar, useShareCalendar } from '../hooks/useCalendars'

const schema = z.object({
  user_id: z.string().uuid('UUID invalide'),
  role: z.enum(['editor', 'viewer']).default('viewer'),
})

type FormValues = z.infer<typeof schema>

export function CalendarSharePage() {
  const { id } = useParams<{ id: string }>()
  const { data: cal, isLoading } = useCalendar(id!)
  const shareCal = useShareCalendar()
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'viewer' },
  })

  const onSubmit = async (values: FormValues) => {
    await shareCal.mutateAsync({ calendarId: id!, data: values })
    reset()
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Partager « {cal?.name} »
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Invitez un utilisateur à accéder à cet agenda.
      </p>

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          Invitation envoyée avec succès.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
              ID de l'utilisateur (UUID)
            </label>
            <input
              id="user_id"
              type="text"
              {...register('user_id')}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
            />
            {errors.user_id && (
              <p className="mt-1 text-xs text-red-600">{errors.user_id.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Rôle
            </label>
            <select
              id="role"
              {...register('role')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="viewer">Lecteur (viewer)</option>
              <option value="editor">Éditeur (editor)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Envoi…' : 'Partager'}
          </button>
        </form>
      </div>
    </div>
  )
}
