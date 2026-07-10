import { useCalendars } from '../hooks/useCalendars'
import { useCalendarStore } from '../store/calendarStore'
import { cn } from '../utils/cn'

const typeLabels: Record<string, string> = {
  personal: 'Personnel',
  work: 'Travail',
  team: 'Équipe',
  resource: 'Ressource',
}

export function CalendarSelector() {
  const { data: cals = [], isLoading } = useCalendars()

  // Sélecteurs ciblés — re-render uniquement si visibility ou toggleVisible changent,
  // pas sur n'importe quelle mise à jour du store (évite la cascade avec useCalendars)
  const visibility = useCalendarStore((s) => s.visibility)
  const toggleVisible = useCalendarStore((s) => s.toggleVisible)

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1" role="group" aria-label="Agendas">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
        Mes agendas
      </p>
      {cals.map((cal) => {
        const visible = visibility[cal.id] !== false
        return (
          <label
            key={cal.id}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none text-sm',
              'hover:bg-gray-100 transition-colors',
              !visible && 'opacity-50'
            )}
          >
            <input
              type="checkbox"
              checked={visible}
              onChange={() => toggleVisible(cal.id)}
              className="sr-only"
              aria-label={`Afficher l'agenda ${cal.name}`}
            />
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0 border"
              style={visible ? { backgroundColor: cal.color, borderColor: cal.color } : {}}
              aria-hidden="true"
            />
            <span className="flex-1 truncate font-medium text-gray-700">{cal.name}</span>
            <span className="text-xs text-gray-400">{typeLabels[cal.type]}</span>
          </label>
        )
      })}
    </div>
  )
}
