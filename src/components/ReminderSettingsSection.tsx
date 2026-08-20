import { useEffect, useMemo, useState } from 'react'
import { useReminderSettings, useUpdateReminderSettings } from '../hooks/useReminderSettings'
import { PROGRESS_STATUS_OPTIONS } from '../utils/studentStatus'
import { cn } from '../utils/cn'
import type { ProgressStatus, ReminderSettingItem } from '../api/models'

// Réglages de rappel de suivi (stale_followup) par statut de progression — module CSM.
// Voir SYNC.md pour le contrat GET/PUT /students/reminder-settings.
export function ReminderSettingsSection() {
  const { data, isLoading, isError } = useReminderSettings()
  const updateSettings = useUpdateReminderSettings()
  const [values, setValues] = useState<Partial<Record<ProgressStatus, number>>>({})
  const [saved, setSaved] = useState(false)

  const byStatus = useMemo(() => {
    const map = new Map<ProgressStatus, ReminderSettingItem>()
    data?.settings.forEach((s) => map.set(s.progress_status, s))
    return map
  }, [data])

  useEffect(() => {
    if (!data) return
    const initial: Partial<Record<ProgressStatus, number>> = {}
    data.settings.forEach((s) => {
      initial[s.progress_status] = s.reminder_days
    })
    setValues(initial)
  }, [data])

  const handleChange = (status: ProgressStatus, raw: string) => {
    const n = Number(raw)
    setValues((prev) => ({ ...prev, [status]: Number.isFinite(n) ? n : prev[status] }))
    setSaved(false)
  }

  const dirtyStatuses = useMemo(
    () =>
      PROGRESS_STATUS_OPTIONS.map(({ value }) => value).filter((status) => {
        const entry = byStatus.get(status)
        const val = values[status]
        return entry !== undefined && val !== undefined && val !== entry.reminder_days
      }),
    [values, byStatus]
  )

  const hasInvalid = dirtyStatuses.some((status) => {
    const val = values[status]
    return val === undefined || !Number.isInteger(val) || val < 1
  })

  const handleSubmit = async () => {
    if (dirtyStatuses.length === 0 || hasInvalid) return
    await updateSettings.mutateAsync({
      settings: dirtyStatuses.map((status) => ({
        progress_status: status,
        reminder_days: values[status] as number,
      })),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Chargement…</p>
  }
  if (isError || !data) {
    return <p className="text-sm text-red-600">Impossible de charger les réglages de rappel.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800">Rappels de suivi (CSM)</h2>
        <p className="text-xs text-gray-500 mt-1">
          Nombre de jours sans mise à jour du suivi d'un apprenant avant qu'une alerte « suivi non
          mis à jour » se déclenche, par statut de progression.
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {PROGRESS_STATUS_OPTIONS.map(({ value, label }) => {
          const entry = byStatus.get(value)
          const current = values[value]
          const isDirty = entry !== undefined && current !== undefined && current !== entry.reminder_days
          const isCustom = isDirty || entry?.is_default === false
          const invalid = current === undefined || !Number.isInteger(current) || current < 1

          return (
            <div key={value} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm text-gray-700">{label}</span>
              <span
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                  isCustom ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                )}
              >
                {isCustom ? 'Personnalisé' : 'Par défaut'}
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={current ?? ''}
                onChange={(e) => handleChange(value, e.target.value)}
                className={cn(
                  'w-20 rounded-md border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500',
                  invalid && 'border-red-400 focus:border-red-500 focus:ring-red-500'
                )}
              />
              <span className="text-xs text-gray-400 w-10 flex-shrink-0">jours</span>
            </div>
          )
        })}
      </div>

      {hasInvalid && (
        <p className="text-xs text-red-600">Le nombre de jours doit être un entier supérieur ou égal à 1.</p>
      )}
      {updateSettings.isError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          Erreur : impossible d'enregistrer les réglages de rappel.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={dirtyStatuses.length === 0 || hasInvalid || updateSettings.isPending}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {updateSettings.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Sauvegardé ✓</span>}
      </div>
    </div>
  )
}
