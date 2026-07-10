import type { SlotSuggestion } from '../api/types'
import { formatDateTime } from '../utils/datetime'
import { useAuthStore } from '../store/authStore'

interface Props {
  suggestions: SlotSuggestion[]
  onSelect: (s: SlotSuggestion) => void
}

export function SuggestionList({ suggestions, onSelect }: Props) {
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')

  if (suggestions.length === 0) return null

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-700 mb-2">Créneaux suggérés</p>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className="w-full text-left rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <span className="font-medium">Créneau {i + 1} : </span>
              {formatDateTime(s.start_utc, timezone)} → {formatDateTime(s.end_utc, timezone)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
