import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { useClients } from '../hooks/useClients'
import { useReport } from '../hooks/useReports'
import { useCalendars } from '../hooks/useCalendars'
import { useAuthStore } from '../store/authStore'
import { CalendarDayColumn } from '../components/CalendarDayColumn'
import { DateTime } from 'luxon'
import type { DayScore } from '../api/types'

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{score}</span>
    </div>
  )
}

function ForfaitBar({ hours, forfait }: { hours: number; forfait: number }) {
  const pct = Math.min((hours / forfait) * 100, 100)
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-orange-400' : 'bg-green-400'
  return (
    <div className="mt-1.5">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function DayScoreRow({ ds }: { ds: DayScore }) {
  return (
    <div className="grid grid-cols-4 gap-2 items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600 col-span-1">{ds.date}</span>
      <div className="col-span-2"><ScoreBar score={ds.score} /></div>
      <div className="flex gap-2 justify-end text-xs text-gray-500">
        <span title="Conflits" className="text-red-500">{ds.conflicts_count} ⚠</span>
        <span>{ds.events_count} 📅</span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const timezone = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const { data: dashData, isLoading: dashLoading } = useDashboard()
  const { data: clientList = [] } = useClients()
  const { data: calList = [] } = useCalendars()
  const currentMonth = DateTime.now().toFormat('yyyy-MM')
  const { data: report } = useReport(currentMonth)

  const todayDate = DateTime.now().setZone(timezone).toFormat('yyyy-MM-dd')
  const todayRange = useMemo(() => {
    const day = DateTime.fromFormat(todayDate, 'yyyy-MM-dd', { zone: timezone })
    return {
      from_utc: day.startOf('day').toUTC().toISO()!,
      to_utc: day.endOf('day').toUTC().toISO()!,
    }
  }, [todayDate, timezone])

  const calMap = useMemo(
    () => Object.fromEntries(calList.map((c) => [c.id, c])),
    [calList]
  )
  const clientMap = useMemo(
    () => Object.fromEntries(clientList.map((c) => [c.id, c])),
    [clientList]
  )

  const monthLabel = DateTime.fromFormat(currentMonth, 'yyyy-MM').toLocaleString({
    month: 'long', year: 'numeric',
  })

  const activeClients = clientList.filter((c) => c.status === 'active')
  const forfaitAlerts = activeClients.filter((c) => {
    if (c.forfait_hours === null) return false
    const row = report?.rows.find((r) => r.client_id === c.id)
    const hours = row?.hours ?? 0
    return hours / c.forfait_hours >= 0.8
  })

  if (dashLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  const conflicts = dashData?.upcoming_conflicts ?? []
  const dayScores = dashData?.day_scores ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <Link
          to="/events/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Nouvel événement
        </Link>
      </div>

      {/* Alertes forfait */}
      {forfaitAlerts.length > 0 && (
        <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
          <span className="text-lg" aria-hidden>⚠️</span>
          <div>
            <p className="text-sm font-semibold text-orange-800">Alertes forfait</p>
            <ul className="mt-1 space-y-0.5">
              {forfaitAlerts.map((c) => {
                const row = report?.rows.find((r) => r.client_id === c.id)
                const hours = row?.hours ?? 0
                const pct = c.forfait_hours ? Math.round((hours / c.forfait_hours) * 100) : 0
                return (
                  <li key={c.id} className="text-xs text-orange-700">
                    <Link to={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>{' '}
                    — {hours.toFixed(1)}h / {c.forfait_hours}h ({pct}%)
                    {pct >= 100 && <span className="ml-1 font-bold text-red-600">DÉPASSÉ</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heures par client ce mois */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span aria-hidden>👤</span> Clients — {monthLabel}
            </h2>
            <Link to="/reports" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Voir le récap →
            </Link>
          </div>

          {activeClients.length === 0 ? (
            <div className="text-sm text-gray-400">
              Aucun client.{' '}
              <Link to="/clients" className="text-indigo-600 underline">
                Ajouter un client
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {activeClients.map((c) => {
                const row = report?.rows.find((r) => r.client_id === c.id)
                const hours = row?.hours ?? 0
                return (
                  <li key={c.id}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: c.color }}
                          aria-hidden
                        />
                        <Link
                          to={`/clients/${c.id}`}
                          className="font-medium text-gray-800 hover:text-indigo-600 truncate"
                        >
                          {c.name}
                        </Link>
                      </div>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        {hours.toFixed(1)}h
                        {c.forfait_hours !== null && (
                          <span className="text-gray-400"> / {c.forfait_hours}h</span>
                        )}
                        {row?.amount_estimated !== null && row?.amount_estimated !== undefined && (
                          <span className="ml-2 text-xs text-gray-400">
                            {row.amount_estimated.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        )}
                      </span>
                    </div>
                    {c.forfait_hours !== null && (
                      <ForfaitBar hours={hours} forfait={c.forfait_hours} />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Conflits */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span aria-hidden>⚠️</span> Conflits détectés
            {conflicts.length > 0 && (
              <span className="ml-auto text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {conflicts.length}
              </span>
            )}
          </h2>
          {conflicts.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun conflit détecté.</p>
          ) : (
            <ul className="space-y-2">
              {conflicts.map((c, i) => {
                const conf = c as { severity?: string; event_id?: string; client_id?: string }
                const conflictClient = conf.client_id ? clientMap[conf.client_id] : undefined
                return (
                  <li key={i} className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {conflictClient && (
                          <span
                            className="w-2 h-2 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: conflictClient.color }}
                            aria-hidden
                          />
                        )}
                        <span className="font-medium text-red-800">
                          {conf.severity ?? 'Conflit'}
                          {conflictClient && ` — ${conflictClient.name}`}
                        </span>
                      </div>
                      {conf.event_id && (
                        <Link
                          to={`/events/${conf.event_id}`}
                          className="text-xs text-red-600 underline hover:text-red-800 flex-shrink-0"
                        >
                          Voir
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Agenda du jour — une colonne par calendrier */}
        <section className="bg-gray-50 rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <span aria-hidden>🗓️</span> Agenda d'aujourd'hui
            <span className="text-xs font-normal text-gray-400">
              {DateTime.now().setZone(timezone).toLocaleString({ weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </h2>
          {calList.length === 0 ? (
            <p className="text-sm text-gray-400">
              Aucun agenda.{' '}
              <Link to="/calendars" className="text-indigo-600 underline">Créer un agenda</Link>
            </p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {calList.map((cal) => (
                <CalendarDayColumn
                  key={cal.id}
                  cal={cal}
                  calMap={calMap}
                  clientMap={clientMap}
                  timezone={timezone}
                  todayRange={todayRange}
                />
              ))}
            </div>
          )}
        </section>

        {/* Score de planification */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span aria-hidden>📊</span> Score de planification
          </h2>
          {dayScores.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée disponible.</p>
          ) : (
            <div>
              {dayScores.map((ds) => (
                <DayScoreRow key={ds.date} ds={ds} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
