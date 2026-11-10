import { useEffect, useMemo, useState } from 'react'
import { ApiError, errorMessage } from '../../shared/api/http'
import { RecordEditor } from '../workspace/RecordEditor'
import type { Api, Resource, Row } from '../workspace/model'
import { WeightHistory } from './WeightHistory'
import styles from './PatientChart.module.css'

export function PatientWeightPanel({
  api,
  patientId,
  catalog,
  refresh,
  onSaved,
  appointment
}: {
  api: Api
  patientId: string
  catalog: Resource[]
  refresh: number
  onSaved: () => void
  appointment?: Row
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(true)
  const [editing, setEditing] = useState(false)
  const [retry, setRetry] = useState(0)
  const measurement = catalog.find((r) => r.name === 'medicion_clinica')
  useEffect(() => {
    const controller = new AbortController()
    api
      .patientRecords(patientId, 'peso', { limit: '100' }, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) {
          setRows(page.data)
          setNext(page.page.next)
          setProblem('')
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setProblem(
            e instanceof ApiError && e.status === 403
              ? 'No tienes permiso para consultar pesos.'
              : errorMessage(e)
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false)
      })
    return () => controller.abort()
  }, [api, patientId, refresh, retry])
  const weightApi = useMemo(
    () => ({
      ...api,
      create: (_name: string, body: Record<string, unknown>, key: string) =>
        api.savePatientWeight(patientId, body, key),
      list: (
        name: string,
        after?: string,
        filter?: Record<string, unknown>,
        signal?: AbortSignal
      ) =>
        api.list(
          name,
          after,
          name === 'cita' ? { ...filter, mascota_id: patientId } : filter,
          signal
        )
    }),
    [api, patientId]
  )
  const resource: Resource = {
    name: 'peso_mascota',
    permissions: {
      create: Boolean(measurement?.permissions.create),
      update: false,
      delete: false
    },
    deletion: 'none',
    deletionEffect: null,
    transitions: null,
    fields: [
      {
        name: 'valor',
        type: 'numeric(8,3)',
        nullable: false,
        required: true,
        enum: [],
        default: null,
        create: true,
        update: false,
        reference: null
      },
      {
        name: 'medida_en',
        type: 'timestamptz',
        nullable: false,
        required: true,
        enum: [],
        default: null,
        create: true,
        update: false,
        reference: null
      },
      {
        name: 'sede_id',
        type: 'uuid',
        nullable: false,
        required: true,
        enum: [],
        default: null,
        create: true,
        update: false,
        reference: { resource: 'sede', field: 'id' }
      },
      {
        name: 'cita_id',
        type: 'uuid',
        nullable: true,
        required: false,
        enum: [],
        default: null,
        create: true,
        update: false,
        reference: { resource: 'cita', field: 'id' }
      },
      {
        name: 'notas',
        type: 'text',
        nullable: true,
        required: false,
        enum: [],
        default: null,
        create: true,
        update: false,
        reference: null
      }
    ]
  }
  async function more() {
    if (!next || busy) return
    setBusy(true)
    try {
      const page = await api.patientRecords(patientId, 'peso', {
        limit: '100',
        after: next
      })
      setRows((current) => [...current, ...page.data])
      setNext(page.page.next)
    } catch (e) {
      setProblem(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={styles.profileCard} aria-label="Seguimiento del peso">
      <h3>Evolución del peso</h3>
      <p>Registra el peso medido en cada visita, en kilogramos.</p>
      {measurement?.permissions.create && (
        <button className={styles.primary} onClick={() => setEditing(true)}>
          Registrar peso
        </button>
      )}
      {busy && <p role="status">Cargando pesos…</p>}
      {problem ? (
        <p role="alert">
          {problem}{' '}
          <button onClick={() => setRetry((n) => n + 1)}>
            Reintentar pesos
          </button>
        </p>
      ) : (
        <>
          {!busy && !rows.length && <p>Aún no hay pesajes registrados.</p>}
          {rows.length > 0 && (
            <>
              <WeightHistory rows={rows} />
              <details>
                <summary>
                  Ver registros de peso ({rows.length}
                  {next ? '+' : ''})
                </summary>
                <ol className={styles.weightList}>
                  {rows.map((row) => (
                    <li key={`${row.tipo_evento}:${row.id}`}>
                      <strong>{String(row.valor)} kg</strong> ·{' '}
                      {new Date(String(row.medida_en)).toLocaleString('es-CO')}
                      <p>
                        {row.tipo_evento === 'peso_mascota'
                          ? 'Registro manual'
                          : 'Medición de consulta'}
                        {row.notas ? ` · ${String(row.notas)}` : ''}
                      </p>
                    </li>
                  ))}
                </ol>
              </details>
            </>
          )}
          {next && (
            <button disabled={busy} onClick={() => void more()}>
              Cargar pesos anteriores
            </button>
          )}
        </>
      )}
      {editing && (
        <RecordEditor
          api={weightApi}
          resource={resource}
          catalog={catalog}
          initialValues={{
            medida_en: new Date().toISOString(),
            ...(appointment
              ? { cita_id: appointment.id, sede_id: appointment.sede_id }
              : {})
          }}
          title="Registrar peso (kg)"
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            onSaved()
          }}
        />
      )}
    </section>
  )
}
