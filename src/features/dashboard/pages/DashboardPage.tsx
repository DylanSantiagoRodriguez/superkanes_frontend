import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../../shared/layout/AppShell'
import { Panel } from '../../../shared/ui/Panel'
import { Badge } from '../../../shared/ui/Badge'
import { StatCard } from '../../../shared/ui/StatCard'
import { AppointmentList } from '../components/AppointmentList'
import { appointments, demoDate, modules, reminders } from '../data/mockDashboard'
import styles from './DashboardPage.module.css'

export function DashboardPage({ onLogout, logoutBusy, error }: { onLogout: () => void; logoutBusy: boolean; error: string }) {
  const [active, setActive] = useState('overview')
  const title = useRef<HTMLHeadingElement>(null)
  const current = modules.find(item => item.id === active) ?? modules[0]
  useEffect(() => { title.current?.focus() }, [active])
  return <AppShell items={modules} active={active} onNavigate={setActive} onLogout={onLogout} logoutBusy={logoutBusy}>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.heading}><div><p className={styles.eyebrow}>TU CL?NICA, DE UN VISTAZO</p><h1 ref={title} tabIndex={-1}>{active === 'overview' ? 'Todo listo para un nuevo d?a.' : current.label}</h1><p>{active === 'overview' ? 'Consulta la agenda y lo que necesita la atenci?n de tu equipo.' : current.description}</p></div><div className={styles.date}><span>ESCENARIO DE EJEMPLO</span>{demoDate}</div></div>
    {active === 'overview' ? <>
      <div className={styles.stats}>
        <StatCard label="Citas del d?a" value={appointments.length} detail={`${appointments.filter(item => item.status === 'Confirmada').length} confirmadas por atender`} symbol="?" />
        <StatCard label="Atenci?n veterinaria" value={appointments.filter(item => item.service !== 'Peluquer?a').length} detail="Consultas y vacunaci?n" symbol="?" />
        <StatCard label="Peluquer?a" value={appointments.filter(item => item.service === 'Peluquer?a').length} detail="Ba?o, corte y cuidado" symbol="?" />
        <StatCard label="Pendientes" value={reminders.length} detail="Seguimientos por revisar" symbol="?" />
      </div>
      <div className={styles.columns}><AppointmentList appointments={appointments} /><div className={styles.sidePanels}>
        <Panel title="Necesitan atenci?n" description="Peque?os pasos, mejores cuidados.">{reminders.map(item => <button className={styles.reminder} key={item.id} onClick={() => setActive(item.module)}><span className={styles.dot} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.detail}</small></span><span aria-hidden="true">?</span></button>)}</Panel>
        <Panel title="Actividad por servicio" description="Distribuci?n de las citas de ejemplo."><div className={styles.activity}>{['Consulta', 'Peluquer?a', 'Vacunaci?n'].map(service => { const count = appointments.filter(item => item.service === service).length; return <div key={service}><div><span>{service}</span><strong>{count}</strong></div><meter min={0} max={appointments.length} value={count} aria-label={`${service}: ${count} de ${appointments.length} citas`} /></div> })}</div></Panel>
      </div></div>
      <div className={styles.sectionTitle}><h2>Un espacio para cada cuidado</h2><span>Explora lo que construiremos</span></div>
      <div className={styles.moduleGrid}>{modules.filter(item => ['pets', 'clinical', 'grooming'].includes(item.id)).map(item => <button className={styles.moduleCard} key={item.id} onClick={() => setActive(item.id)}><span aria-hidden="true">{item.symbol}</span><strong>{item.label} ?</strong><p>{item.description}</p></button>)}</div>
    </> : active === 'agenda' ? <AppointmentList appointments={appointments} /> : <Panel title={`As? ser? ${current.label.toLocaleLowerCase('es')}`} action={<Badge tone="info">En dise?o</Badge>}><div className={styles.preview}><p>Esta vista presenta el alcance previsto del m?dulo. Las operaciones estar?n disponibles a medida que avancemos en su desarrollo.</p><div className={styles.capabilities}>{current.capabilities.map((item, index) => <article key={item}><span>0{index + 1}</span><h3>{item}</h3><Badge>Pr?ximamente</Badge></article>)}</div><button className={styles.primary} onClick={() => setActive('overview')}>Volver al resumen</button></div></Panel>}
    <footer className={styles.footer}><span>Superkanes ? M?s tiempo para cuidar.</span><span>Datos ficticios. Esta demostraci?n no modifica registros.</span></footer>
  </AppShell>
}
