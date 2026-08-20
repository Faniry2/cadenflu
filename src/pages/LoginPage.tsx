import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { auth } from '../api/endpoints'
import { useAuthStore } from '../store/authStore'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

const registerSchema = loginSchema.extend({
  display_name: z.string().min(1, 'Nom requis'),
  timezone: z.string().default('Europe/Paris'),
})

type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setTokens } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [apiError, setApiError] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleLogin = async (values: LoginForm) => {
    setApiError(null)
    setUnverifiedEmail(null)
    setResendStatus('idle')
    try {
      const tokens = await auth.login(values.email, values.password)
      setTokens(tokens.access_token, tokens.refresh_token)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: unknown }; status?: number } }
      if (axiosErr?.response?.status === 403 && axiosErr?.response?.data?.detail === 'email_not_verified') {
        setUnverifiedEmail(values.email)
        setApiError('Votre email n\'est pas encore vérifié. Vérifiez votre boîte de réception.')
      } else {
        setApiError('Email ou mot de passe incorrect.')
      }
    }
  }

  const handleRegister = async (values: RegisterForm) => {
    setApiError(null)
    try {
      await auth.register(values)
      setRegisteredEmail(values.email)
    } catch {
      setApiError('Erreur lors de la création du compte. L\'email est peut-être déjà utilisé.')
    }
  }

  const handleResend = async (email: string) => {
    setResendStatus('sending')
    try {
      await auth.resendVerification(email)
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-1">Cadenflu</h1>
          <p className="text-gray-500 text-sm">Gestion intelligente multi-agendas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {registeredEmail ? (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Vérifiez votre email</h2>
              <p className="text-sm text-gray-600 mb-4">
                Un email de vérification a été envoyé à <strong>{registeredEmail}</strong>. Cliquez sur le
                lien qu'il contient pour activer votre compte, puis connectez-vous.
              </p>
              {resendStatus === 'sent' && (
                <p className="mb-3 text-sm text-green-700">Email renvoyé avec succès.</p>
              )}
              {resendStatus === 'error' && (
                <p className="mb-3 text-sm text-red-600">Impossible de renvoyer l'email, réessayez plus tard.</p>
              )}
              <button
                onClick={() => handleResend(registeredEmail)}
                disabled={resendStatus === 'sending'}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                {resendStatus === 'sending' ? 'Envoi…' : "Renvoyer l'email de vérification"}
              </button>
              <button
                onClick={() => {
                  setRegisteredEmail(null)
                  setResendStatus('idle')
                  setMode('login')
                }}
                className="block w-full mt-4 py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Aller à la connexion
              </button>
            </div>
          ) : (
          <>
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
              onClick={() => { setMode('login'); setApiError(null); setUnverifiedEmail(null) }}
            >
              Connexion
            </button>
            <button
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
              onClick={() => { setMode('register'); setApiError(null); setUnverifiedEmail(null) }}
            >
              Inscription
            </button>
          </div>

          {apiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
              {apiError}
              {unverifiedEmail && (
                <div className="mt-2">
                  {resendStatus === 'sent' ? (
                    <span className="text-green-700">Email renvoyé avec succès.</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResend(unverifiedEmail)}
                      disabled={resendStatus === 'sending'}
                      className="font-medium text-red-700 underline hover:text-red-800 disabled:opacity-50"
                    >
                      {resendStatus === 'sending' ? 'Envoi…' : "Renvoyer l'email de vérification"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...loginForm.register('email')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...loginForm.register('password')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loginForm.formState.isSubmitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4" noValidate>
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
                  Nom affiché
                </label>
                <input
                  id="display_name"
                  type="text"
                  autoComplete="name"
                  {...registerForm.register('display_name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {registerForm.formState.errors.display_name && (
                  <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.display_name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  {...registerForm.register('email')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {registerForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  {...registerForm.register('password')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Fuseau horaire
                </label>
                <select
                  id="timezone"
                  {...registerForm.register('timezone')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                  <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                  <option value="America/New_York">America/New_York (UTC-5/-4)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={registerForm.formState.isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {registerForm.formState.isSubmitting ? 'Création…' : 'Créer un compte'}
              </button>
            </form>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  )
}
