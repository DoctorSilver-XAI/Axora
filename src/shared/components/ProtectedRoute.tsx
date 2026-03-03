import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@shared/contexts/AuthContext'

const AUTH_TIMEOUT_MS = 8000

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => {
      console.warn('[ProtectedRoute] Auth loading timed out, redirecting to login')
      setTimedOut(true)
    }, AUTH_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  if (isLoading && !timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface gap-4">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Chargement...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
