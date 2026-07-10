import { useNavigate, useSearchParams } from 'react-router-dom'
import { EventForm } from '../components/EventForm'

export function EventNewPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const startParam = params.get('start')

  const defaultSuggestion = startParam
    ? { start_utc: startParam, end_utc: new Date(new Date(startParam).getTime() + 3600_000).toISOString() }
    : undefined

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvel événement</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <EventForm
          defaultSuggestion={defaultSuggestion}
          onSuccess={() => navigate('/calendar')}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  )
}
