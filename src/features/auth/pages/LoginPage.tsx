import { AppIcon } from '../../../shared/ui/AppIcon'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { authErrorMessage, login } from '../api/auth'
import type { Session } from '../api/auth'
import { PetIllustration } from '../components/PetIllustration'
import styles from './LoginPage.module.css'

export function LoginPage({ onLogin, message }: { onLogin: (session: Session) => void; message: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(message)
  const [help, setHelp] = useState(false)
  const pending = useRef(false)
  const emailInput = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      onLogin(await login(email.trim(), password))
      setPassword('')
      setVisible(false)
    } catch (cause) { setError(authErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.story} aria-label="Superkanes, gestión veterinaria y peluquería">
        <a className={styles.brand} href="/" aria-label="Superkanes, inicio"><span className={styles.brandIcon} aria-hidden="true"><AppIcon name="pets" size={27} /></span> superkanes<span className={styles.brandDot}>.</span></a>
        <div className={styles.storyContent}>
          <span className={styles.eyebrow}>CERCA DE QUIENES CUIDAN</span>
          <h1>Ellos ponen el amor.<br />Tú, el cuidado.<br /><em>Nosotros, el orden.</em></h1>
          <p>Tu clínica veterinaria y peluquería, conectadas en un mismo lugar. Más tiempo para lo que de verdad importa.</p>
          <div className={styles.illustration}><PetIllustration /><span className={styles.careBadge}><span aria-hidden="true">♡</span> Cada patita cuenta</span></div>
          <div className={styles.features}><span>Salud veterinaria</span><span>Peluquería</span><span>Gestión integral</span></div>
        </div>
        <p className={styles.storyFooter}>Hecho para cuidar de ellos. Y de tu equipo.</p>
      </section>
      <section className={styles.access} aria-labelledby="login-title">
        <span className={styles.topNote}><span aria-hidden="true">●</span> TU ESPACIO DE TRABAJO</span>
        <div className={styles.formContainer}>
          <div className={styles.welcomeIcon} aria-hidden="true"><AppIcon name="pets" size={28} /></div>
              <p className={styles.eyebrow}>UN NUEVO DÍA PARA CUIDAR</p>
              <h2 id="login-title">Qué bueno verte de nuevo.</h2>
              <p className={styles.subtitle}>Inicia sesión para acceder a tu clínica.</p>
              <form onSubmit={submit} aria-busy={busy}>
                <label className={styles.label} htmlFor="email">Correo electrónico</label>
                <input ref={emailInput} className={styles.input} id="email" name="email" type="email" autoComplete="username" placeholder="nombre@tuclinica.com" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} autoCapitalize="none" spellCheck={false} />
                <label className={styles.label} htmlFor="password">Contraseña</label>
                <div className={styles.passwordField}>
                  <input className={styles.input} id="password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Ingresa tu contraseña" required maxLength={512} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
                  <button type="button" className={styles.reveal} onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} disabled={busy}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg>
                  </button>
                </div>
                <div className={styles.helpRow}><button className={styles.textButton} type="button" onClick={() => setHelp(!help)} aria-expanded={help} aria-controls="access-help">¿Olvidaste tu contraseña?</button></div>
                {help && <p id="access-help" className={styles.notice}>Contacta al administrador de tu clínica para recuperar tu acceso. Él podrá proporcionarte las instrucciones para restablecer tu contraseña.</p>}
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button className={styles.submit} type="submit" disabled={busy}><span>{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</span><span aria-hidden="true">{busy ? '◌' : '→'}</span></button>
                <p className={styles.secure}><svg width="14" height="16" viewBox="0 0 16 18" fill="none" stroke="currentColor" aria-hidden="true"><rect x="3" y="8" width="10" height="8" rx="2" /><path d="M5 8V5a3 3 0 0 1 6 0v3" /></svg> Acceso exclusivo para tu equipo</p>
              </form>
              <div className={styles.accountHelp}><strong>¿Es tu primera vez aquí?</strong><p>Solicita tu cuenta al administrador de tu clínica.</p></div>
        </div>
        <footer className={styles.footer}><span>© {new Date().getFullYear()} Superkanes</span><span>Cuidamos cada detalle.</span></footer>
      </section>
    </main>
  )
}
