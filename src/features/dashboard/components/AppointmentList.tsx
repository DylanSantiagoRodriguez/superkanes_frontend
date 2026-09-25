import { useRef, useState } from 'react'
import { Badge } from '../../../shared/ui/Badge'
import type { BadgeTone } from '../../../shared/ui/Badge'
import { Panel } from '../../../shared/ui/Panel'
import type { Appointment, AppointmentStatus } from '../types'
import styles from '../pages/DashboardPage.module.css'
const tones: Record<AppointmentStatus, BadgeTone> = { Confirmada: 'neutral', 'En espera': 'warning', 'En atenci?n': 'info', Finalizada: 'success' }
export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  const [filter, setFilter] = useState('Todos')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Appointment | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const query = search.trim().toLocaleLowerCase('es')
  const filtered = appointments.filter(item => (filter === 'Todos' || item.service === filter) && `${item.pet} ${item.owner}`.toLocaleLowerCase('es').includes(query))
  return <Panel title="Agenda del d?a" description="Cada paciente, en el momento indicado." action={<Badge>{appointments.length} citas</Badge>}>
    <div className={styles.filters}><label>Servicio<select value={filter} onChange={event => setFilter(event.target.value)}>{['Todos', 'Consulta', 'Peluquer?a', 'Vacunaci?n'].map(value => <option key={value}>{value}</option>)}</select></label><label>Buscar paciente o tutor<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre de mascota o tutor" /></label></div>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Citas del d?a"><table className={styles.table}><thead><tr><th scope="col">Hora</th><th scope="col">Paciente / tutor</th><th scope="col">Servicio</th><th scope="col">Estado</th><th scope="col">Detalle</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td className={styles.time}>{item.time}</td><td><strong>{item.pet}</strong><small>{item.owner}</small></td><td>{item.service}</td><td><Badge tone={tones[item.status]}>{item.status}</Badge></td><td><button className={styles.link} aria-label={`Ver cita de ${item.pet}`} onClick={() => { setSelected(item); dialog.current?.showModal() }}>Ver ?</button></td></tr>)}</tbody></table></div>
    {filtered.length === 0 && <p className={styles.empty} role="status">No hay citas que coincidan con la b?squeda.</p>}
    <p className={styles.tableFooter} aria-live="polite">Mostrando {filtered.length} de {appointments.length} citas ? Datos de ejemplo</p>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="appointment-title"><div className={styles.dialogHeader}><Badge tone="warning">Cita de ejemplo</Badge><button className={styles.link} onClick={() => dialog.current?.close()} aria-label="Cerrar detalle">Cerrar ?</button></div><h2 id="appointment-title">Cita de {selected?.pet}</h2><p>{selected?.breed}</p><dl><dt>Tutor</dt><dd>{selected?.owner}</dd><dt>Servicio</dt><dd>{selected?.service}</dd><dt>Hora</dt><dd>{selected?.time}</dd><dt>Profesional</dt><dd>{selected?.professional}</dd><dt>Estado</dt><dd>{selected?.status}</dd></dl></dialog>
  </Panel>
}
