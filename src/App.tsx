import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuthStore } from './store/authStore'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CalendarPage } from './pages/CalendarPage'
import { EventNewPage } from './pages/EventNewPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { CalendarsPage } from './pages/CalendarsPage'
import { CalendarSharePage } from './pages/CalendarSharePage'
import { SettingsPage } from './pages/SettingsPage'
import { ClientsPage } from './pages/ClientsPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ReportsPage } from './pages/ReportsPage'
import { MultiCalendarPage } from './pages/MultiCalendarPage'
import { GanttPage } from './pages/GanttPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="calendar/:date" element={<CalendarPage />} />
                <Route path="events/new" element={<EventNewPage />} />
                <Route path="events/:id" element={<EventDetailPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:id" element={<ClientDetailPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="agenda" element={<MultiCalendarPage />} />
                <Route path="gantt" element={<GanttPage />} />
                <Route path="calendars" element={<CalendarsPage />} />
                <Route path="calendars/:id/share" element={<CalendarSharePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
