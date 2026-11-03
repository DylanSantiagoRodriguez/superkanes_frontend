import { useEffect, useRef, useState } from 'react'
import { LoginPage } from './features/auth/pages/LoginPage'
import {
  authErrorMessage,
  logout,
  refreshSession
} from './features/auth/api/auth'
import type { Session } from './features/auth/api/auth'
import { ApiError } from './shared/api/http'
import { Workspace } from './features/workspace/Workspace'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const generation = useRef(0)
  useEffect(() => {
    let active = true
    refreshSession()
      .then((value) => {
        if (active) setSession(value)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!session) return
    const current = generation.current
    let active = true
    const timer = window.setTimeout(
      () => {
        refreshSession()
          .then((value) => {
            if (active && generation.current === current) setSession(value)
          })
          .catch(() => {
            if (active && generation.current === current) {
              setSession(null)
              setMessage('Tu sesión ha vencido. Inicia sesión nuevamente.')
            }
          })
      },
      Math.max(1000, (session.expiresIn - 60) * 1000)
    )
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [session])
  async function signOut() {
    if (!session || pending.current) return
    pending.current = true
    setBusy(true)
    setMessage('')
    generation.current += 1
    try {
      await logout(session)
      setSession(null)
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setSession(null)
      else setMessage(authErrorMessage(cause))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  if (loading)
    return (
      <main className="session-loading" role="status">
        Preparando tu espacio de trabajo…
      </main>
    )
  return session ? (
    <Workspace
      session={session}
      onLogout={signOut}
      logoutBusy={busy}
      error={message}
      onExpired={() => {
        generation.current += 1
        setSession(null)
        setMessage('Tu sesión ha vencido. Inicia sesión nuevamente.')
      }}
    />
  ) : (
    <LoginPage
      message={message}
      onLogin={(value) => {
        generation.current += 1
        setMessage('')
        setSession(value)
      }}
    />
  )
}
