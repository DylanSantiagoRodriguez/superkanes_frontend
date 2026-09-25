import styles from './ui.module.css'
export function StatCard({ label, value, detail, symbol }: { label: string; value: number; detail: string; symbol: string }) {
  return <article className={styles.stat}><div><span>{label}</span><span className={styles.symbol} aria-hidden="true">{symbol}</span></div><strong>{value}</strong><p>{detail}</p></article>
}
