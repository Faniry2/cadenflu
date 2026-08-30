import { useEffect, useRef, useMemo } from 'react'
import { DateTime } from 'luxon'
import { useAuthStore } from '../store/authStore'
import { useEvents } from './useEvents'

const ALERT_MIN = 10

function playBeep() {
  try {
    const ctx = new AudioContext()
    // Trois bips courts montants
    const freqs = [660, 880, 1100]
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.22
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.35, t0 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.20)
      osc.start(t0)
      osc.stop(t0 + 0.22)
    })
  } catch {
    // AudioContext bloqué par le navigateur (pas d'interaction utilisateur)
  }
}

function sendNotification(title: string, startLabel: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(`⏰ ${title}`, {
    body: `Commence à ${startLabel} (dans ${ALERT_MIN} min)`,
    icon: '/favicon.ico',
    tag:  `cadenflu-reminder-${title}-${startLabel}`,
  })
}

export function useEventReminders() {
  const timezone     = useAuthStore((s) => s.user?.timezone ?? 'UTC')
  const isAuth       = useAuthStore((s) => s.isAuthenticated())

  // Plage : maintenant → +24 h  (stable par minute pour éviter le churn de queryKey)
  const { fromUtc, toUtc } = useMemo(() => {
    const base = DateTime.now().setZone(timezone).startOf('minute')
    return {
      fromUtc: base.toUTC().toISO()!,
      toUtc:   base.plus({ hours: 24 }).toUTC().toISO()!,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone, Math.floor(Date.now() / 60_000)])  // recalcule chaque minute

  const { data: events = [] } = useEvents({
    from_utc: fromUtc,
    to_utc:   toUtc,
    enabled:  isAuth,
  } as Parameters<typeof useEvents>[0])

  // IDs déjà planifiés (survit aux re-renders)
  const scheduled = useRef<Set<string>>(new Set())
  // Map id → timer handle pour cleanup
  const timers    = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Demande de permission au premier montage
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!isAuth) return
    const nowMs = Date.now()

    events.forEach((event) => {
      // Clé unique par événement + heure de début (couvre les mises à jour)
      const key = `${event.id}::${event.start_utc}`
      if (scheduled.current.has(key)) return

      const startMs = new Date(event.start_utc).getTime()
      const alertMs = startMs - ALERT_MIN * 60_000
      const delayMs = alertMs - nowMs

      // Planifie uniquement si l'alerte est dans le futur (et < 24 h)
      if (delayMs > 0 && delayMs < 24 * 60 * 60_000) {
        scheduled.current.add(key)
        const timer = setTimeout(() => {
          const startLabel = DateTime.fromISO(event.start_utc, { zone: 'utc' })
            .setZone(timezone)
            .toFormat('HH:mm')
          playBeep()
          sendNotification(event.title, startLabel)
          timers.current.delete(key)
        }, delayMs)
        timers.current.set(key, timer)
      }
    })
  }, [events, isAuth, timezone])

  // Nettoyage à la déconnexion / unmount
  useEffect(() => {
    if (!isAuth) {
      timers.current.forEach((t) => clearTimeout(t))
      timers.current.clear()
      scheduled.current.clear()
    }
  }, [isAuth])

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t))
    }
  }, [])
}
