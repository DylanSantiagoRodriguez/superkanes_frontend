import { GroomingAdmission } from './GroomingAdmission'
import { useEffect, useState } from 'react'
import type { Api, Resource, Row } from '../workspace/model'
import { RecordEditor } from '../workspace/RecordEditor'
import { errorMessage } from '../../shared/api/http'
import { PatientChart } from './PatientChart'
import styles from './PatientChart.module.css'
export function Agenda({ api, catalog, onOpenGrooming }: { api: Api; catalog: Resource[]; onOpenGrooming?: () => void }) {
  const [day, setDay] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [rows, setRows] = useState<Row[]>([]),
    [next, setNext] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState('')
  const [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useState<Row | 'new' | null>(null),
    [appointment, setAppointment] = useState<Row | null>(null)
  const [admission, setAdmission] = useState<Row | null>(null)
  const [notice, setNotice] = useState('')
  const [groomingService, setGroomingService] = useState<'Baño' | 'Peluquería' | undefined>()
  const [reminding, setReminding] = useState<Row | null>(null)
  const contract = catalog.find((r) => r.name === 'cita')!,
    reminder = catalog.find((r) => r.name === 'recordatorio')
  const query = { from: day + 'T00:00:00', to: day + 'T23:59:59.999' }
  useEffect(() => {
    if (!day) return
    const controller = new AbortController()
    api
      .agenda(
        { from: day + 'T00:00:00', to: day + 'T23:59:59.999' },
        controller.signal
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows(result.data)
          setNext(result.page.next)
          setProblem('')
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setProblem(errorMessage(cause))
      })
    return () => controller.abort()
  }, [api, day, refresh])
  async function more() {
    if (!next || busy) return
    setBusy(true)
    try {
      const page = await api.agenda({ ...query, after: next })
      setRows((current) => [...current, ...page.data])
      setNext(page.page.next)
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  async function arrive(row: Row) {
    setBusy(true)
    setProblem('')
    try {
      await api.appointmentArrival(row)
      setRefresh((v) => v + 1)
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  if (appointment)
    return (
      <PatientChart
        api={api}
        patientId={String(appointment.mascota_id)}
        catalog={catalog}
        initialAppointment={appointment}
        onBack={() => {
          setAppointment(null)
          setRefresh((v) => v + 1)
        }}
      />
    )
  return (
    <section className={styles.chart} aria-label="Agenda de atención">
      <div className={styles.filters}>
        <label>
          Día de atención
          <input
            type="date"
            required
            value={day}
            onChange={(e) => {
              if (e.target.value) {
                setDay(e.target.value)
                setRows([])
                setNext(null)
              }
            }}
          />
        </label>
        {contract.permissions.create && (
          <>
            <button onClick={() => { setGroomingService(undefined); setEditing('new') }}>Programar cita</button>
            <button onClick={() => { setGroomingService('Baño'); setEditing('new') }}>Programar baño</button>
            <button onClick={() => { setGroomingService('Peluquería'); setEditing('new') }}>Programar peluquería</button>
          </>
        )}
        <button onClick={() => setRefresh((v) => v + 1)}>
          Actualizar agenda
        </button>
      </div>
      {problem && <p role="alert">{problem}</p>}
      {notice && <p role="status">{notice}</p>}
      {!rows.length && !problem && <p>No hay citas cargadas para este día.</p>}
      <ol className={styles.timeline}>
        {[...rows]
          .sort(
            (a, b) =>
              Date.parse(String(a.inicio)) - Date.parse(String(b.inicio))
          )
          .map((row) => (
            <li key={row.id} className={styles.entry}>
              <div className={styles.entryHeader}>
                <h3>
                  {String(row.nombre_paciente ?? 'Paciente sin acceso')} ·{' '}
                  {String(row.codigo_paciente ?? '')}
                </h3>
                <time>
                  {new Date(String(row.inicio)).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {row.fin ? ` – ${new Date(String(row.fin)).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </time>
              </div>
              <p>
                {String(row.estado)} · {String(row.tipo)}
                {row.llegada_en
                  ? ` · Llegó ${new Date(String(row.llegada_en)).toLocaleTimeString('es-CO')}`
                  : ''}
              </p>
              <p>{String(row.notas ?? '')}</p>
              {contract.permissions.update &&
                ['programada', 'confirmada'].includes(String(row.estado)) &&
                !row.llegada_en && row.tipo !== 'peluqueria' && (
                  <button disabled={busy} onClick={() => void arrive(row)}>
                    Registrar llegada
                  </button>
                )}
              {row.tipo === 'peluqueria' && !row.llegada_en && ['programada', 'confirmada'].includes(String(row.estado)) && contract.permissions.update && catalog.find(r => r.name === 'servicio_peluqueria')?.permissions.create && (
                <button onClick={() => setAdmission(row)}>Registrar ingreso</button>
              )}
              {row.tipo === 'peluqueria' && Boolean(row.llegada_en) && onOpenGrooming && (
                <button onClick={onOpenGrooming}>Abrir Peluquería</button>
              )}
              {row.tipo !== 'peluqueria' && catalog.some((r) => r.name === 'mascota') && (
                <button onClick={() => setAppointment(row)}>
                  Abrir paciente para atender
                </button>
              )}
              {contract.permissions.update && (
                <button onClick={() => { setGroomingService(row.tipo === 'peluqueria' ? row.notas === 'Baño' ? 'Baño' : 'Peluquería' : undefined); setEditing(row) }}>Editar cita</button>
              )}
              {reminder?.permissions.create && (
                <button onClick={() => setReminding(row)}>
                  Programar recordatorio
                </button>
              )}
            </li>
          ))}
      </ol>
      {next && (
        <button disabled={busy} onClick={() => void more()}>
          Cargar más citas
        </button>
      )}
      {admission && <GroomingAdmission api={api} appointment={admission}
        onClose={() => { setAdmission(null); setRefresh(v => v + 1) }}
        onSaved={result => {
          setAdmission(null)
          setNotice(`Ingreso guardado a las ${new Date(String(result.service.llegada_en)).toLocaleTimeString('es-CO')}. Consentimiento pendiente. Completa el seguimiento en Peluquería.`)
          setRefresh(v => v + 1)
        }} />}
      {editing && (
        <RecordEditor
          api={api}
          resource={contract}
          catalog={catalog}
          row={editing === 'new' ? undefined : editing}
          initialValues={{
            inicio: day + 'T09:00:00',
            fin: day + 'T09:30:00',
            tipo: 'clinica'
          }}
          groomingService={groomingService}
          title={editing === 'new' ? groomingService ? `Programar ${groomingService.toLowerCase()}` : 'Programar cita' : 'Editar cita'}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setRefresh((v) => v + 1)
          }}
        />
      )}
      {reminding && reminder && (
        <RecordEditor
          api={api}
          resource={reminder}
          catalog={catalog}
          initialValues={{
            cita_id: reminding.id,
            tutor_id: reminding.tutor_contacto_id,
            canal: 'email',
            clave_idempotencia: crypto.randomUUID()
          }}
          title="Programar recordatorio · envío no conectado"
          onClose={() => setReminding(null)}
          onSaved={() => setReminding(null)}
        />
      )}
    </section>
  )
}
