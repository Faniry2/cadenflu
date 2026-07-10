import { useNavigate, useParams } from 'react-router-dom'
import { useEvent, useDeleteEvent } from '../hooks/useEvents'
import { EventForm } from '../components/EventForm'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../utils/datetime'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const { data: event, isLoading } = useEvent(id!)
  const deleteEvent = useDeleteEvent()

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cet événement ?')) return
    await deleteEvent.mutateAsync(id!)
    navigate('/calendar')
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          Événement introuvable.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 truncate">{event.title}</h1>
        <span className="text-xs text-gray-400">
          {formatDateTime(event.start_utc, timezone)}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EventForm
          event={event}
          onSuccess={() => navigate('/calendar')}
          onCancel={() => navigate(-1)}
        />
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
            className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 transition-colors"
          >
            {deleteEvent.isPending ? 'Suppression…' : 'Supprimer cet événement'}
          </button>
        </div>
      </div>
    </div>
  )
}
