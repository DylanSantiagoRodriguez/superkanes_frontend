import type { ReactNode } from 'react'
import styles from './AppShell.module.css'
export interface NavigationItem { id: string; label: string; symbol: string }
export function AppShell({ items, active, onNavigate, onLogout, logoutBusy, children }: {
  items: readonly NavigationItem[]; active: string; onNavigate: (id: string) => void;
  onLogout: () => void; logoutBusy: boolean; children: ReactNode;
}) {
  return <div className={styles.shell}>
    <a className={styles.skip} href="#workspace">Saltar al contenido</a>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><span aria-hidden="true">?</span> superkanes.</div>
      <div className={styles.clinic}><strong>Cl?nica Superkanes</strong><span>Sede principal ? Demo</span></div>
      <p className={styles.label}>ESPACIO DE TRABAJO</p>
      <nav aria-label="Navegaci?n principal">{items.map(item => <button key={item.id} aria-current={active === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>)}</nav>
      <div className={styles.bottom}><strong>Sesi?n activa</strong><small>Superkanes</small></div>
      <button className={styles.logout} onClick={onLogout} disabled={logoutBusy}>{logoutBusy ? 'Cerrando sesi?n?' : 'Cerrar sesi?n ?'}</button>
    </aside>
    <div className={styles.body}><header className={styles.topbar}><span>Mi cl?nica / <strong>{items.find(item => item.id === active)?.label}</strong></span><span className={styles.demo}>Vista de demostraci?n</span></header><main id="workspace" tabIndex={-1} className={styles.main}>{children}</main></div>
  </div>
}
