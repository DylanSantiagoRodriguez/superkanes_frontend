import { useEffect, useState, useSyncExternalStore } from 'react'
import styles from './ThemeToggle.module.css'

type Appearance = 'light' | 'dark' | 'system'
function appearance(value: unknown): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system'
}
const media = window.matchMedia('(prefers-color-scheme: dark)')
function subscribe(callback: () => void) {
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

export function ThemeToggle() {
  const [preference, setPreference] = useState<Appearance>(() =>
    appearance(document.documentElement.dataset.appearance)
  )
  const systemDark = useSyncExternalStore(subscribe, () => media.matches)
  const dark = preference === 'system' ? systemDark : preference === 'dark'
  const action = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  useEffect(() => {
    document.documentElement.dataset.appearance = preference
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [preference, dark])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'superkanes.appearance' || event.key === null)
        setPreference(appearance(event.newValue))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={action}
      title={action}
      onClick={() => {
        const next = dark ? 'light' : 'dark'
        setPreference(next)
        try { localStorage.setItem('superkanes.appearance', next) }
        catch { /* The button remains usable without persistent storage. */ }
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20.5 13a8.6 8.6 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13Z" />}
      </svg>
    </button>
  )
}
