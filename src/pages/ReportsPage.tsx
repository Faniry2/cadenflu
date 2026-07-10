import { useState } from 'react'
import { DateTime } from 'luxon'
import { useReport } from '../hooks/useReports'
import { Link } from 'react-router-dom'

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const prev = () => {
    const d = DateTime.fromFormat(value, 'yyyy-MM').minus({ months: 1 })
    onChange(d.toFormat('yyyy-MM'))
  }
  const next = () => {
    const d = DateTime.fromFormat(value, 'yyyy-MM').plus({ months: 1 })
    if (d <= DateTime.now()) onChange(d.toFormat('yyyy-MM'))
  }
  const label = DateTime.fromFormat(value, 'yyyy-MM').toLocaleString({ month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center gap-3">
      <button onClick={prev} className="p-1 rounded hover:bg-gray-100 text-gray-500">‹</button>
      <span className="text-base font-semibold text-gray-800 capitalize min-w-36 text-center">{label}</span>
      <button
        onClick={next}
        disabled={DateTime.fromFormat(value, 'yyyy-MM').plus({ months: 1 }) > DateTime.now()}
        className="p-1 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-30"
      >
        ›
      </button>
    </div>
  )
}

export function ReportsPage() {
  const [month, setMonth] = useState(DateTime.now().toFormat('yyyy-MM'))
  const { data, isLoading } = useReport(month)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Récapitulatif</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Aucune donnée pour cette période.
        </div>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <p className="text-3xl font-bold text-gray-900">{data.total_hours.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-1">heures totales</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
              <p className="text-3xl font-bold text-gray-900">
                {data.total_amount_estimated !== null
                  ? data.total_amount_estimated.toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    })
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">montant total estimé</p>
            </div>
          </div>

          {/* Tableau par client */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Événements</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Heures</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Montant estimé</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.client_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/clients/${row.client_id}`}
                        className="flex items-center gap-2 hover:text-indigo-600"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: row.client_color }}
                          aria-hidden
                        />
                        <span className="font-medium text-gray-800">{row.client_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.events_count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {row.hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.amount_estimated !== null
                        ? row.amount_estimated.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-700">Total</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {data.rows.reduce((s, r) => s + r.events_count, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800">{data.total_hours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right text-gray-800">
                    {data.total_amount_estimated !== null
                      ? data.total_amount_estimated.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
