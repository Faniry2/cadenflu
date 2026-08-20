import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { auth } from '../api/endpoints'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('verifying')
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    if (!token) {
      setStatus('error')
      return
    }

    auth
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-1">Cadenflu</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {status === 'verifying' && (
            <p className="text-sm text-gray-600">Vérification de votre email…</p>
          )}
          {status === 'success' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email vérifié</h2>
              <p className="text-sm text-gray-600 mb-4">
                Votre compte est activé. Vous pouvez maintenant vous connecter.
              </p>
              <Link
                to="/login"
                className="block w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Se connecter
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h2>
              <p className="text-sm text-gray-600 mb-4">
                Ce lien de vérification n'est plus valide. Vous pouvez en demander un nouveau depuis la page de connexion.
              </p>
              <Link
                to="/login"
                className="block w-full py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
