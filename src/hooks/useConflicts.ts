import { useState, useCallback, useRef } from 'react'
import { events } from '../api/endpoints'
import type { CheckConflictsRequest, ConflictDetail } from '../api/models'

export function useConflictCheck() {
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([])
  const [checking, setChecking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback((req: CheckConflictsRequest) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!req.start_utc || !req.end_utc || req.calendar_ids.length === 0) {
        setConflicts([])
        return
      }
      try {
        setChecking(true)
        const result = await events.checkConflicts(req)
        setConflicts(result)
      } catch {
        setConflicts([])
      } finally {
        setChecking(false)
      }
    }, 400)
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setConflicts([])
  }, [])

  return { conflicts, checking, check, reset }
}
