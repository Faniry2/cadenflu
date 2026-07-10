import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CalendarVisibility {
  [calendarId: string]: boolean
}

interface CalendarState {
  visibility: CalendarVisibility
  setVisible: (id: string, visible: boolean) => void
  toggleVisible: (id: string) => void
  initCalendar: (id: string) => void
  visibleIds: (allIds: string[]) => string[]
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      visibility: {},

      setVisible: (id, visible) =>
        set((s) => ({ visibility: { ...s.visibility, [id]: visible } })),

      toggleVisible: (id) =>
        set((s) => ({ visibility: { ...s.visibility, [id]: !s.visibility[id] } })),

      initCalendar: (id) =>
        set((s) => {
          if (id in s.visibility) return s
          return { visibility: { ...s.visibility, [id]: true } }
        }),

      visibleIds: (allIds) => {
        const { visibility } = get()
        return allIds.filter((id) => visibility[id] !== false)
      },
    }),
    { name: 'cadenflu-calendars' }
  )
)
