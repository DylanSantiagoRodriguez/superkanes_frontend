import { canNavigate } from './use-unsaved-guard'
import { WeightHistory } from './WeightHistory'
import { downloadClinical } from './clinical-files-api'
import { useEffect, useState } from 'react'
import { ApiError, errorMessage } from '../../shared/api/http'
import { Panel } from '../../shared/ui/Panel'
import { PatientPhoto } from '../workspace/PatientPhoto'
import { RecordEditor } from '../workspace/RecordEditor'
import { label, rowLabel } from '../workspace/model'
import type { Api, Page, Resource, Row } from '../workspace/model'
import { Consultation } from './Consultation'
import styles from './PatientChart.module.css'

export interface PatientSummary {
  patient: Row
  species: Row | null
  breed: Row | null
  guardian: Row | null
  overview: Record<string, Page | null>
}
const sections = [
  ['resumen', 'Resumen'],
  ['historia', 'Historia clínica'],
  ['consultas', 'Consultas'],
  ['mediciones', 'Mediciones'],
  ['diagnosticos', 'Diagnósticos'],
  ['tratamientos', 'Tratamientos'],
  ['examenes', 'Exámenes'],
  ['vacunas', 'Vacunación'],
  ['documentos', 'Adjuntos'],
  ['reportes', 'Documentos emitidos'],
  ['consentimientos', 'Consentimientos'],
  ['controles', 'Controles'],
  ['pendientes', 'Pendientes vacunales']
]
const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Sin fecha'
function age(value: unknown) {
  if (!value) return 'Edad no registrada'
  const birth = new Date(String(value) + 'T12:00:00'),
    now = new Date()
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    now.getMonth() -
    birth.getMonth()
  if (now.getDate() < birth.getDate()) months--
  return months < 0
    ? 'Fecha por revisar'
    : months < 12
      ? `${months} meses`
      : `${Math.floor(months / 12)} años, ${months % 12} meses`
}
export function PatientChart({
  api,
  patientId,
  catalog,
  onBack,
  initialAppointment
}: {
  api: Api
  patientId: string
  catalog: Resource[]
  onBack: () => void
  initialAppointment?: Row
}) {
  const [summary, setSummary] = useState<PatientSummary | null>(null)
  const [problem, setProblem] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [section, setSection] = useState('resumen')
  const [creating, setCreating] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [attention, setAttention] = useState<Row | null>(null)
  const contract = (name: string) => catalog.find((item) => item.name === name)
  useEffect(() => {
    const controller = new AbortController()
    api
      .patientSummary(patientId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setSummary(result)
          setProblem('')
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setProblem(errorMessage(cause))
      })
    return () => controller.abort()
  }, [api, patientId, refresh])
  const patient = summary?.patient
  return (
    <article className={styles.chart} aria-label="Ficha clínica del paciente">
      <button
        disabled={dirty}
        onClick={() => {
          if (canNavigate()) onBack()
        }}
      >
        ← Volver a pacientes
      </button>
      {problem && (
        <p role="alert">
          {problem}{' '}
          <button onClick={() => setRefresh((value) => value + 1)}>
            Reintentar ficha
          </button>
        </p>
      )}
      {!summary ? (
        !problem && <p role="status">Cargando ficha clínica…</p>
      ) : (
        <>
          <header className={styles.header}>
            <PatientPhoto
              api={api}
              id={String(patient!.foto_archivo_id ?? '')}
              name={String(patient!.nombre)}
            />
            <div>
              <p className={styles.eyebrow}>
                FICHA CLÍNICA · {String(patient!.codigo)}
              </p>
              <h2>{String(patient!.nombre)}</h2>
              <p>
                {String(summary.species?.nombre ?? 'Especie no disponible')} ·{' '}
                {String(
                  summary.breed?.nombre ?? 'Raza no registrada o no disponible'
                )}{' '}
                · {String(patient!.sexo)}
              </p>
              <p>
                {age(patient!.fecha_nacimiento)}
                {patient!.nacimiento_estimado ? ' (estimada)' : ''} ·{' '}
                {String(patient!.estado)}
              </p>
              <p>
                Tutor principal:{' '}
                {summary.guardian
                  ? rowLabel(summary.guardian)
                  : 'No disponible'}
              </p>
              <p>
                Último peso registrado:{' '}
                {summary.overview.peso === null
                  ? 'Sin acceso'
                  : summary.overview.peso?.data[0]
                    ? `${summary.overview.peso.data[0].valor} kg · ${date(summary.overview.peso.data[0].fecha)}`
                    : 'Sin mediciones'}
              </p>
            </div>
            <div className={styles.actions}>
              {contract('atencion_clinica')?.permissions.create &&
                contract('revision_clinica')?.permissions.create &&
                patient!.estado === 'activa' && (
                  <button
                    className={styles.primary}
                    onClick={() => {
                      if (canNavigate()) setCreating('atencion_clinica')
                    }}
                  >
                    Iniciar consulta
                  </button>
                )}
              {contract('cita')?.permissions.create && (
                <button
                  onClick={() => {
                    if (canNavigate()) setCreating('cita')
                  }}
                >
                  Programar control
                </button>
              )}
              {contract('alerta_mascota')?.permissions.create && (
                <button
                  onClick={() => {
                    if (canNavigate()) setCreating('alerta_mascota')
                  }}
                >
                  Registrar alerta
                </button>
              )}
            </div>
          </header>
          <section className={styles.alerts} aria-label="Alertas clínicas">
            <strong>Alertas y antecedentes relevantes</strong>
            {summary.overview.alertas === null ? (
              <p>
                No tienes acceso a las alertas. No se puede confirmar su
                ausencia.
              </p>
            ) : summary.overview.alertas?.data.length ? (
              <>
                {summary.overview.alertas.data.map((row) => (
                  <p key={row.id}>
                    <strong>
                      {String(row.severidad)} · {String(row.tipo)}:
                    </strong>{' '}
                    {String(row.descripcion)}
                  </p>
                ))}
                {summary.overview.alertas.page.next && (
                  <button onClick={() => setSection('alertas')}>
                    Ver todas las alertas
                  </button>
                )}
              </>
            ) : (
              <p>
                No hay alertas registradas. Confirma los antecedentes durante la
                consulta.
              </p>
            )}
          </section>
          {dirty && (
            <p role="status">Guarda la consulta antes de cambiar de sección.</p>
          )}
          <nav className={styles.tabs} aria-label="Secciones del paciente">
            {sections.map(([id, text]) => (
              <button
                disabled={dirty}
                key={id}
                aria-current={section === id ? 'page' : undefined}
                onClick={() => {
                  if (!canNavigate()) return
                  setSection(id)
                  setAttention(null)
                }}
              >
                {text}
              </button>
            ))}
          </nav>
          {attention ? (
            <Panel
              title="Consulta seleccionada"
              action={
                <button
                  disabled={dirty}
                  onClick={() => {
                    if (canNavigate()) setAttention(null)
                  }}
                >
                  Volver a la historia
                </button>
              }
            >
              <Consultation
                key={attention.id}
                api={api}
                attention={attention}
                catalog={catalog}
                onDirty={setDirty}
                onSaved={() => setRefresh((value) => value + 1)}
              />
            </Panel>
          ) : section === 'resumen' ? (
            <div className={styles.grid}>
              {(
                [
                  ['revisiones', 'Últimas notas clínicas'],
                  ['vacunas', 'Últimas vacunas'],
                  ['controles', 'Controles programados'],
                  ['pendientes', 'Pendientes vacunales']
                ] as const
              ).map(([key, title]) => (
                <Panel key={key} title={title}>
                  {summary.overview[key] === null ? (
                    <p>Sin permiso para consultar esta información.</p>
                  ) : !summary.overview[key]?.data.length ? (
                    <p>No hay registros disponibles.</p>
                  ) : (
                    summary.overview[key]!.data.map((row) => (
                      <div className={styles.entry} key={row.id}>
                        <strong>{rowLabel(row)}</strong>
                        <p>
                          {date(row.fecha)} · {String(row.estado ?? '')}
                        </p>
                        {row.motivo_consulta != null && (
                          <p>{String(row.motivo_consulta)}</p>
                        )}
                      </div>
                    ))
                  )}
                  <button
                    onClick={() =>
                      setSection(key === 'revisiones' ? 'consultas' : key)
                    }
                  >
                    Consultar registros
                  </button>
                </Panel>
              ))}
            </div>
          ) : (
            <PatientRecords
              key={`${section}:${refresh}`}
              api={api}
              patientId={patientId}
              section={section}
              onAttention={setAttention}
            />
          )}
          {creating && contract(creating) && (
            <RecordEditor
              api={api}
              resource={contract(creating)!}
              catalog={catalog}
              initialValues={{
                mascota_id: patientId,
                ...(creating === 'atencion_clinica'
                  ? {
                      fecha_atencion: new Date().toISOString(),
                      ...(initialAppointment &&
                      ['programada', 'confirmada'].includes(
                        String(initialAppointment.estado)
                      )
                        ? {
                            cita_id: initialAppointment.id,
                            sede_id: initialAppointment.sede_id,
                            tutor_presente_id:
                              initialAppointment.tutor_contacto_id
                          }
                        : {})
                    }
                  : {}),
                ...(creating === 'cita'
                  ? { tipo: 'clinica', tutor_contacto_id: summary.guardian?.id }
                  : {})
              }}
              title={
                creating === 'atencion_clinica'
                  ? 'Nueva consulta del paciente'
                  : creating === 'cita'
                    ? 'Programar control del paciente'
                    : 'Registrar alerta clínica'
              }
              onClose={() => setCreating(null)}
              onSaved={(saved) => {
                setCreating(null)
                setRefresh((value) => value + 1)
                setSection(
                  creating === 'atencion_clinica' ? 'consultas' : 'resumen'
                )
                if (creating === 'atencion_clinica') setAttention(saved)
              }}
            />
          )}
        </>
      )}
    </article>
  )
}
function PatientRecords({
  api,
  patientId,
  section,
  onAttention
}: {
  api: Api
  patientId: string
  section: string
  onAttention: (row: Row) => void
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(false),
    [problem, setProblem] = useState('')
  const [query, setQuery] = useState({
    search: '',
    from: '',
    to: '',
    type: section === 'examenes' ? 'laboratorio' : ''
  })
  const [applied, setApplied] = useState(query),
    [refresh, setRefresh] = useState(0)
  const [unavailable, setUnavailable] = useState<string[]>([])
  const parameters = (after?: string) => ({
    ...applied,
    from: applied.from ? `${applied.from}T00:00:00` : '',
    to: applied.to ? `${applied.to}T23:59:59.999` : '',
    ...(after ? { after } : {})
  })
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true)
    setProblem('')
    setRows([])
    setNext(null)
    api
      .patientRecords(
        patientId,
        section === 'examenes' ? 'historia' : section,
        parameters(),
        controller.signal
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          setRows(result.data)
          setNext(result.page.next)
          setUnavailable(result.unavailable ?? [])
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setProblem(
            cause instanceof ApiError && cause.status === 403
              ? 'No tienes permiso para consultar esta sección.'
              : errorMessage(cause)
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
    // applied is the committed filter; typing does not trigger requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, patientId, section, applied, refresh])
  async function more() {
    if (!next || busy) return
    setBusy(true)
    setProblem('')
    try {
      const result = await api.patientRecords(
        patientId,
        section === 'examenes' ? 'historia' : section,
        parameters(next)
      )
      setRows((current) => [...current, ...result.data])
      setNext(result.page.next)
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  const fields = [
    'motivo_consulta',
    'nombre_profesional',
    'nombre',
    'procedimiento',
    'alcance',
    'tipo',
    'valor',
    'unidad',
    'descripcion',
    'severidad',
    'clasificacion',
    'observaciones',
    'descripcion_emitida',
    'via',
    'frecuencia',
    'duracion',
    'instrucciones',
    'descripcion_vacuna_emitida',
    'lote',
    'indicacion',
    'numero_revision',
    'estado_revision'
  ]
  return (
    <section aria-label="Registros del paciente">
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault()
          setApplied({ ...query })
        }}
      >
        <label>
          Buscar en los registros
          <input
            value={query.search}
            maxLength={100}
            onChange={(e) => setQuery({ ...query, search: e.target.value })}
          />
        </label>
        <label>
          Desde
          <input
            type="date"
            value={query.from}
            onChange={(e) => setQuery({ ...query, from: e.target.value })}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={query.to}
            min={query.from}
            onChange={(e) => setQuery({ ...query, to: e.target.value })}
          />
        </label>
        {section === 'historia' && (
          <label>
            Tipo de evento
            <select
              value={query.type}
              onChange={(e) => setQuery({ ...query, type: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="clinica">Consulta</option>
              <option value="vacunacion">Vacunación</option>
              <option value="peluqueria">Peluquería</option>
              <option value="laboratorio">Laboratorio</option>
            </select>
          </label>
        )}
        <button disabled={busy}>Aplicar filtros</button>
      </form>
      {section === 'diagnosticos' || section === 'tratamientos' ? (
        <p>
          Registros históricos por revisión. Su presencia aquí no confirma que
          sigan activos.
        </p>
      ) : null}
      {unavailable.length > 0 && (
        <p>
          No se incluyen eventos sin permiso:{' '}
          {unavailable.map(label).join(', ')}.
        </p>
      )}
      {problem && (
        <p role="alert">
          {problem}{' '}
          <button onClick={() => setRefresh((value) => value + 1)}>
            Reintentar registros
          </button>
        </p>
      )}
      {!busy && !problem && !rows.length && (
        <p>No hay registros para estos filtros.</p>
      )}
      {section === 'mediciones' && <WeightHistory rows={rows} />}
      <ol className={styles.timeline}>
        {rows.map((row) => (
          <li key={`${row.tipo_evento}:${row.id}`} className={styles.entry}>
            <div className={styles.entryHeader}>
              <strong>
                {label(String(row.tipo_evento))} ·{' '}
                {String(row.estado ?? row.estado_revision ?? '')}
              </strong>
              <time dateTime={String(row.fecha)}>{date(row.fecha)}</time>
            </div>
            <dl>
              {fields
                .filter((key) => row[key] != null)
                .map((key) => (
                  <div key={key}>
                    <dt>{label(key)}</dt>
                    <dd>{String(row[key])}</dd>
                  </div>
                ))}
            </dl>
            {(section === 'consultas' || row.tipo_evento === 'clinica') && (
              <button onClick={() => onAttention((row.registro as Row) ?? row)}>
                Abrir consulta
              </button>
            )}
            {row.tipo_evento === 'laboratorio' && (
              <button
                onClick={async () => {
                  try {
                    onAttention(
                      await api.get(
                        'atencion_clinica',
                        String((row.registro as Row).atencion_id)
                      )
                    )
                  } catch (cause) {
                    setProblem(errorMessage(cause))
                  }
                }}
              >
                Abrir consulta y resultados
              </button>
            )}
            {row.archivo_id != null && (
              <button
                onClick={() =>
                  void downloadClinical(
                    api,
                    String(row.archivo_id),
                    String(row.descripcion ?? `${row.tipo ?? 'documento'}.pdf`)
                  ).catch((cause) => setProblem(errorMessage(cause)))
                }
              >
                Descargar documento
              </button>
            )}
            {row.atencion_id != null && (
              <button
                onClick={async () => {
                  try {
                    onAttention(
                      await api.get('atencion_clinica', String(row.atencion_id))
                    )
                  } catch (cause) {
                    setProblem(errorMessage(cause))
                  }
                }}
              >
                Ver consulta de origen
              </button>
            )}
          </li>
        ))}
      </ol>
      {busy && <p role="status">Cargando registros…</p>}
      {next && (
        <button disabled={busy} onClick={() => void more()}>
          Cargar más registros
        </button>
      )}
    </section>
  )
}
