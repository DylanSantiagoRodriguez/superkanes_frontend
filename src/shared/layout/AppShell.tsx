import type { ReactNode } from 'react'
import { ThemeSelect } from '../theme/ThemeSelect'
import { AppIcon } from '../ui/AppIcon'
import styles from './AppShell.module.css'
export interface NavigationItem {
  id: string
  label: string
  symbol: string
}
export function AppShell({
  items,
  active,
  onNavigate,
  onLogout,
  logoutBusy,
  children,
  organizationControl,
  userName
}: {
  items: readonly NavigationItem[]
  active: string
  onNavigate: (id: string) => void
  onLogout: () => void
  logoutBusy: boolean
  children: ReactNode
  organizationControl?: ReactNode
  userName?: string
}) {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#workspace">
        Saltar al contenido
      </a>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span><AppIcon name="pets" size={30} /></span> superkanes.
        </div>
        <div className={styles.clinic}>{organizationControl}</div>
        <p className={styles.label}>ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          {items.map((item) => (
            <button
              key={item.id}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span><AppIcon name={item.id} /></span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className={styles.bottom}>
          <strong>Sesión activa</strong>
          <small>{userName}</small>
        </div>
        <button
          className={styles.logout}
          onClick={onLogout}
          disabled={logoutBusy}
        >
          {logoutBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <span>
            Mi clínica /{' '}
            <strong>{items.find((item) => item.id === active)?.label}</strong>
          </span>
          <ThemeSelect />
        </header>
        <main id="workspace" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
