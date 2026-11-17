import { useEffect, useState } from 'react'
import styles from './ThemeSelect.module.css'

type Appearance = 'light' | 'dark' | 'system'
function appearance(value: unknown): Appearance {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function ThemeSelect() {
  const [preference, setPreference] = useState<Appearance>(() =>
    appearance(document.documentElement.dataset.appearance)
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.appearance = preference
      document.documentElement.dataset.theme = preference === 'system'
        ? (media.matches ? 'dark' : 'light')
        : preference
    }
    apply()
    media.addEventListener('change', apply)
    const sync = (event: StorageEvent) => {
      if (event.key === 'superkanes.appearance' || event.key === null)
        setPreference(appearance(event.newValue))
    }
    window.addEventListener('storage', sync)
    return () => {
      media.removeEventListener('change', apply)
      window.removeEventListener('storage', sync)
    }
  }, [preference])

  return (
    <label className={styles.control}>
      <span>Apariencia</span>
      <select value={preference} onChange={(event) => {
        const next = appearance(event.target.value)
        setPreference(next)
        try { localStorage.setItem('superkanes.appearance', next) }
        catch { /* Keep the in-memory preference when storage is unavailable. */ }
      }}>
        <option value="system">Sistema</option>
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
      </select>
    </label>
  )
}
