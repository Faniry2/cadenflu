import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DateTime } from 'luxon'
import {
  useStudentProfile,
  useUpsertStudentProfile,
  useStudentNotes,
  useAddStudentNote,
} from '../hooks/useStudentProfile'
import { useFormations } from '../hooks/useFormations'
import {
  LEARNER_STATUS_OPTIONS,
  PROGRESS_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  STUDENT_CATEGORY_OPTIONS,
} from '../utils/studentStatus'

const schema = z.object({
  formation_id: z.string().min(1, 'Formation requise'),
  category: z.enum(['compta', 'rh', 'bf', 'formation_courte']),
  inscription_date: z.string().min(1, 'Date requise'),
  access_start_date: z.string().min(1, 'Date requise'),
  access_end_date: z.string().min(1, 'Date requise'),
  exam_date: z.string().optional(),
  payment_status: z.enum(['solde', 'mensualise', 'organisme', 'impaye']),
  learner_status: z.enum(['nouveau', 'actif', 'a_risque', 'examen_prevu', 'diplome', 'suspendu', 'cloture']),
  progress_status: z.enum(['bon_rythme', 'a_surveiller', 'distrait', 'bloque', 'suspendu', 'diplome', 'cloture']),
  followup_date: z.string().optional(),
  alert_enabled: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

const CHECKLIST_STEPS = [
  { key: 'onboarding_done', label: 'Onboarding' },
  { key: 'exam_blank_done', label: 'Examen blanc' },
  { key: 'final_exam_done', label: 'Examen final' },
  { key: 'end_training_done', label: 'Fin de formation' },
  { key: 'testimonial_requested', label: 'Témoignage demandé' },
] as const

export function StudentProfileTab({ clientId }: { clientId: string }) {
  const { data: profile, isLoading, isError } = useStudentProfile(clientId)
  const { data: formations = [] } = useFormations()
  const upsertProfile = useUpsertStudentProfile(clientId)
  const { data: notes = [], isLoading: notesLoading } = useStudentNotes(clientId)
  const addNote = useAddStudentNote(clientId)
  const [noteDraft, setNoteDraft] = useState('')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { alert_enabled: true },
  })

  useEffect(() => {
    // Le <select> Formation est non contrôlé : tant que la liste des formations n'a pas
    // fini de charger, l'<option> correspondant à profile.formation_id n'existe pas encore
    // et la valeur posée par reset() serait silencieusement perdue par le navigateur.
    if (profile && formations.length > 0) {
      reset({
        formation_id: profile.formation_id,
        category: profile.category,
        inscription_date: profile.inscription_date,
        access_start_date: profile.access_start_date,
        access_end_date: profile.access_end_date,
        exam_date: profile.exam_date ?? undefined,
        payment_status: profile.payment_status,
        learner_status: profile.learner_status,
        progress_status: profile.progress_status,
        followup_date: profile.followup_date ?? undefined,
        alert_enabled: profile.alert_enabled,
      })
    }
  }, [profile, formations, reset])

  const onSubmit = async (values: FormValues) => {
    try {
      await upsertProfile.mutateAsync({
        formation_id: values.formation_id,
        category: values.category,
        inscription_date: values.inscription_date,
        access_start_date: values.access_start_date,
        access_end_date: values.access_end_date,
        exam_date: values.exam_date || null,
        payment_status: values.payment_status,
        learner_status: values.learner_status,
        progress_status: values.progress_status,
        followup_date: values.followup_date || null,
        alert_enabled: values.alert_enabled,
      })
    } catch {
      // erreur affichée via upsertProfile.error ci-dessous
    }
  }

  const toggleStep = (key: (typeof CHECKLIST_STEPS)[number]['key']) => {
    if (!profile) return
    upsertProfile.mutate({ [key]: !profile[key] })
  }

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return
    await addNote.mutateAsync({ note: noteDraft.trim() })
    setNoteDraft('')
  }

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
  }

  return (
    <div className="space-y-5">
      {isError && !profile && (
        <p className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Aucun profil pédagogique pour ce contact — complétez le formulaire ci-dessous pour en créer un.
        </p>
      )}

      {/* Étapes à cocher */}
      {profile && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Étapes</h2>
          <div className="flex flex-wrap gap-4">
            {CHECKLIST_STEPS.map((step) => (
              <label key={step.key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={profile[step.key]}
                  onChange={() => toggleStep(step.key)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {step.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Formulaire profil */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-gray-700">Profil pédagogique</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Formation *</label>
            <select
              {...register('formation_id')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">—</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>{f.code} — {f.name}</option>
              ))}
            </select>
            {errors.formation_id && <p className="mt-1 text-xs text-red-600">{errors.formation_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Catégorie *</label>
            <select
              {...register('category')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {STUDENT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Statut apprenant</label>
            <select
              {...register('learner_status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {LEARNER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Progression</label>
            <select
              {...register('progress_status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {PROGRESS_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Statut paiement</label>
            <select
              {...register('payment_status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                {...register('alert_enabled')}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Alertes activées
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date d'inscription *</label>
            <input
              type="date"
              {...register('inscription_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.inscription_date && <p className="mt-1 text-xs text-red-600">{errors.inscription_date.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Début d'accès *</label>
            <input
              type="date"
              {...register('access_start_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fin d'accès *</label>
            <input
              type="date"
              {...register('access_end_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date d'examen</label>
            <input
              type="date"
              {...register('exam_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Prochain suivi</label>
            <input
              type="date"
              {...register('followup_date')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {upsertProfile.error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            Erreur : impossible d'enregistrer le profil.
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement…' : profile ? 'Enregistrer' : 'Créer le profil'}
          </button>
        </div>
      </form>

      {/* Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Notes</h2>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Ajouter une note…"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <button
            onClick={handleAddNote}
            disabled={addNote.isPending || !noteDraft.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
        {notesLoading ? (
          <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
        ) : notes.length === 0 ? (
          <p className="text-xs text-gray-400">Aucune note pour ce contact.</p>
        ) : (
          <ul className="space-y-2">
            {[...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((n) => (
              <li key={n.id} className="text-sm text-gray-700 border-b border-gray-50 pb-2 last:border-0">
                <p>{n.note}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {DateTime.fromISO(n.created_at).toFormat('dd/MM/yyyy HH:mm')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
