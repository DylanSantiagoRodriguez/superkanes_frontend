import { useEffect, useRef, useState } from 'react'
import { LoginPage } from './features/auth/pages/LoginPage'
import { authErrorMessage, logout } from './features/auth/api/auth'
import type { Session } from './features/auth/api/auth'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(() => { setSession(null); setMessage('Tu sesi?n ha vencido. Inicia sesi?n nuevamente.') }, session.expiresIn * 1000)
    return () => window.clearTimeout(timer)
  }, [session])
  async function signOut() {
    if (!session || pending.current) return
    pending.current = true
    setBusy(true)
    setMessage('')
    try { await logout(session); setSession(null) }
    catch (cause) { setMessage(authErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  return session ? <DashboardPage onLogout={signOut} logoutBusy={busy} error={message} /> : <LoginPage message={message} onLogin={(value) => { setMessage(''); setSession(value) }} />
}
