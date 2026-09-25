import type { ReactNode } from 'react'
import styles from './ui.module.css'
export function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className={styles.panel}><header className={styles.panelHeader}><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>{children}</section>
}
