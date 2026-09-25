import type { ReactNode } from 'react'
import styles from './ui.module.css'
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'info'
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}
