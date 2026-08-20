import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { DateTime } from 'luxon'
import { useTasks, useCreateTask, useUpdateTask } from '../hooks/useTasks'
import { useClients } from '../hooks/useClients'
import type { TaskPriority, TaskStatus } from '../api/models'
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE_STYLES,
  TASK_STATUS_OPTIONS,
} from '../utils/taskStatus'
import { clientDisplayName } from '../utils/clientType'
import { cn } from '../utils/cn'

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  client_id: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['urgent', 'pas_urgent']).default('pas_urgent'),
  stars: z.coerce.number().min(1).max(3).default(1),
  due_date: z.string().optional(),
  note: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400 text-xs" aria-label={`${count} étoile(s)`}>
      {'★'.repeat(count)}
      <span className="text-gray-200">{'★'.repeat(3 - count)}</span>
    </span>
  )
}

export function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  const { data: taskList = [], isLoading } = useTasks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
  })
  const { data: clientList = [] } = useClients()
  const clientMap = Object.fromEntries(clientList.map((c) => [c.id, c]))

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'pas_urgent', stars: 1 },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      await createTask.mutateAsync({
        title: values.title,
        client_id: values.client_id || null,
        category: values.category || null,
        priority: values.priority,
        stars: values.stars,
        due_date: values.due_date || null,
        note: values.note || null,
        status: 'a_faire',
      })
      reset()
      setShowForm(false)
    } catch {
      // erreur affichée via createTask.error ci-dessous
    }
  }

  const handleStatusChange = (id: string, status: TaskStatus) => {
    updateTask.mutate({ id, data: { status } })
  }

  const sortedTasks = [...taskList].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'urgent' ? -1 : 1
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showForm ? 'Annuler' : '+ Nouvelle tâche'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-gray-800">Créer une tâche</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Titre *</label>
              <input
                type="text"
                {...register('title')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact lié</label>
              <select
                {...register('client_id')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Aucun</option>
                {clientList.map((c) => (
                  <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Catégorie</label>
              <input
                type="text"
                {...register('category')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="ex. relance, suivi..."
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Priorité</span>
              <div className="flex gap-4">
                {TASK_PRIORITY_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700">
                    <input type="radio" value={opt.value} {...register('priority')} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Étoiles</label>
              <select
                {...register('stars')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value={1}>★</option>
                <option value={2}>★★</option>
                <option value={3}>★★★</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date limite</label>
              <input
                type="date"
                {...register('due_date')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Note</label>
              <textarea
                {...register('note')}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {createTask.error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              Erreur : {(createTask.error as Error).message ?? 'Impossible de créer la tâche.'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { reset(); setShowForm(false) }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'a_faire', 'en_cours', 'fait', 'reporte'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            {s === 'all' ? 'Toutes' : TASK_STATUS_LABELS[s]}
          </button>
        ))}
        <span className="w-px bg-gray-200 mx-1" />
        {(['all', 'urgent', 'pas_urgent'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors',
              priorityFilter === p
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            {p === 'all' ? 'Toute priorité' : TASK_PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : sortedTasks.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-16">Aucune tâche.</p>
      ) : (
        <ul className="space-y-2">
          {sortedTasks.map((task) => {
            const client = task.client_id ? clientMap[task.client_id] : undefined
            return (
              <li
                key={task.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Stars count={task.stars} />
                    {task.priority === 'urgent' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                        Urgent
                      </span>
                    )}
                    {task.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {task.category}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="text-[10px] text-gray-400">
                        Limite : {DateTime.fromISO(task.due_date).toFormat('dd/MM/yyyy')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1">{task.title}</p>
                  {task.note && <p className="text-xs text-gray-500 mt-0.5">{task.note}</p>}
                  {client && (
                    <Link
                      to={`/clients/${client.id}`}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-sm inline-block"
                        style={{ backgroundColor: client.color }}
                        aria-hidden
                      />
                      Voir contact — {clientDisplayName(client)}
                    </Link>
                  )}
                </div>

                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                  className={cn(
                    'text-xs font-medium rounded-full px-2.5 py-1 border-0 focus:ring-2 focus:ring-indigo-500 flex-shrink-0',
                    TASK_STATUS_BADGE_STYLES[task.status]
                  )}
                >
                  {TASK_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
