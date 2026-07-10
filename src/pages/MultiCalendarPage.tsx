import { useState, useCallback, useRef, useEffect } from 'react'
import { useCalendars } from '../hooks/useCalendars'
import { AgendaColumn } from '../components/AgendaColumn'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function MultiCalendarPage() {
  const { data: cals = [] } = useCalendars()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const initialized = useRef(false)

  // Init selection once when calendar list first loads
  useEffect(() => {
    if (!initialized.current && cals.length > 0) {
      initialized.current = true
      setSelectedIds(cals.map((c) => c.id))
    }
  }, [cals])

  const toggleCalendar = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  return (
    <div className="flex flex-col p-4 gap-4 relative" style={{ height: '100%' }}>
      {/* Selector bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-700">Agendas affichés</span>
        {cals.length === 0 && (
          <span className="text-sm text-gray-400 animate-pulse">Chargement…</span>
        )}
        {cals.map((cal) => (
          <label
            key={cal.id}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(cal.id)}
              onChange={() => toggleCalendar(cal.id)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span
              className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
              style={{ backgroundColor: cal.color }}
              aria-hidden
            />
            <span className="text-sm text-gray-700">{cal.name}</span>
          </label>
        ))}
      </div>

      {/* Columns area — horizontal scroll when too many calendars, vertical stack on mobile */}
      {selectedIds.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">
            Cochez au moins un agenda ci-dessus pour l'afficher.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto flex-shrink-0 pb-2">
          {selectedIds.map((id) => (
            <ErrorBoundary key={id}>
              <AgendaColumn calendarId={id} />
            </ErrorBoundary>
          ))}
        </div>
      )}
    </div>
  )
}
