import { useState, type ReactNode } from 'react'
import { ThemeToggle } from '../theme/ThemeToggle'
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
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('superkanes.sidebar-collapsed') === 'true' }
    catch { return false }
  })
  function collapse(value: boolean) {
    setCollapsed(value)
    try { localStorage.setItem('superkanes.sidebar-collapsed', String(value)) }
    catch { /* Keep the sidebar usable when storage is blocked. */ }
  }
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#workspace">
        Saltar al contenido
      </a>
      <aside id="workspace-sidebar" className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.brand}>
          <span><AppIcon name="pets" size={30} /></span><span className={styles.brandName}>superkanes.</span>
        </div>
        <div className={styles.clinic}>{organizationControl}</div>
        {collapsed && organizationControl && (
          <button className={styles.organizationShortcut} title="Elegir organización" aria-label="Elegir organización" onClick={() => collapse(false)}>
            <AppIcon name="catalogs" />
          </button>
        )}
        <p className={styles.label}>ESPACIO DE TRABAJO</p>
        <nav aria-label="Navegación principal">
          {items.map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span><AppIcon name={item.id} /></span>
              <span className={styles.navLabel}>{item.label}</span>
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
          aria-label={logoutBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h10" /></svg>
          <span className={styles.navLabel}>{logoutBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</span>
        </button>
      </aside>
      <div className={styles.body}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button type="button" className={styles.sidebarToggle} aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} title={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'} aria-expanded={!collapsed} aria-controls="workspace-sidebar" onClick={() => collapse(!collapsed)}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /><path d={collapsed ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'} /></svg>
            </button>
            <span>Mi clínica /{' '}
            <strong>{items.find((item) => item.id === active)?.label}</strong>
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main id="workspace" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}
