import { CalendarView } from '../components/CalendarView'
import { ErrorBoundary } from '../components/ErrorBoundary'

export function CalendarPage() {
  return (
    <div className="flex flex-col p-4" style={{ height: '100%' }}>
      <h1 className="sr-only">Calendrier</h1>
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden p-3"
        style={{ flex: 1, minHeight: 0 }}
      >
        <ErrorBoundary>
          <CalendarView />
        </ErrorBoundary>
      </div>
    </div>
  )
}
