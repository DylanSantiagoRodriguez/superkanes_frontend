import { PatientDocuments } from './PatientDocuments'
import { useUnsavedGuard } from './use-unsaved-guard'
import { ClinicalLaboratory } from './ClinicalLaboratory'
import { ClinicalConsents } from './ClinicalConsents'
import { ClinicalFiles } from './ClinicalFiles'
import { downloadClinical } from './clinical-files-api'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import { ApiError, errorMessage } from '../../shared/api/http'
import { RecordEditor } from '../workspace/RecordEditor'
import { label, rowLabel } from '../workspace/model'
import type { Api, Resource, Row } from '../workspace/model'
import { ClinicalDocument } from './ClinicalDocument'
import styles from './PatientChart.module.css'

export interface RevisionDetails {
  revision: Row
  details: Record<string, { data: Row[]; has_more: boolean } | null>
}
const narrativeFields = [
  ['motivo_consulta', 'Motivo de consulta'],
  ['anamnesis', 'S · Anamnesis y antecedentes'],
  ['examen_fisico', 'O · Examen físico y hallazgos'],
  ['evaluacion', 'A · Evaluación clínica'],
  ['plan', 'P · Plan, indicaciones y seguimiento']
]
const detailNames = [
  'medicion_clinica',
  'diagnostico_atencion',
  'prescripcion_item',
  'adjunto_clinico'
]
export function Consultation({
  api,
  attention,
  catalog,
  onDirty,
  onSaved
}: {
  api: Api
  attention: Row
  catalog: Resource[]
  onDirty: (dirty: boolean) => void
  onSaved: () => void
}) {
  const [revisions, setRevisions] = useState<Row[]>([]),
    [chosen, setChosen] = useState('')
  const [data, setData] = useState<RevisionDetails | null>(null),
    [values, setValues] = useState<Record<string, string>>({})
  const [previous, setPrevious] = useState<Row | null>(null)
  const [problem, setProblem] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false)
  const [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useState<{
      name: string
      row?: Row
      prescription?: string
    } | null>(null)
  const [reason, setReason] = useState(''),
    [confirmClose, setConfirmClose] = useState(false)
  const pending = useRef(false),
    submission = useRef<{ signature: string; key: string } | null>(null),
    live = useRef(true)
  const contract = (name: string) => catalog.find((r) => r.name === name)
  const revision = data?.revision
  const dirty =
    !!revision &&
    narrativeFields.some(([key]) => values[key] !== String(revision[key] ?? ''))
  const canWrite =
    revision?.estado === 'borrador' &&
    contract('revision_clinica')?.permissions.update &&
    attention.estado !== 'anulada'
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])
  useUnsavedGuard(dirty)
  const dirtyRef = useRef(dirty)
  useLayoutEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  useEffect(() => {
    let active = true
    async function load() {
      const rows: Row[] = []
      let after: string | undefined
      do {
        const page = await api.list('revision_clinica', after, {
          atencion_id: attention.id
        })
        rows.push(...page.data)
        after = page.page.next ?? undefined
      } while (after && active)
      if (active) {
        rows.sort((a, b) => Number(b.numero) - Number(a.numero))
        setRevisions(rows)
        setChosen((current) => current || rows[0]?.id || '')
      }
    }
    void load().catch((cause) => {
      if (active) setProblem(errorMessage(cause))
    })
    return () => {
      active = false
    }
  }, [api, attention.id, refresh])
  useEffect(() => {
    let active = true
    if (!chosen || dirtyRef.current) return
    api
      .revisionDetails(chosen)
      .then((result) => {
        if (active && !dirtyRef.current) {
          setProblem('')
          setConflict(false)
          setPrevious(null)
          setData(result)
          setValues(
            Object.fromEntries(
              narrativeFields.map(([key]) => [
                key,
                String(result.revision[key] ?? '')
              ])
            )
          )
        }
        return result
      })
      .then(async (result) => {
        if (result.revision.revision_previa_id) {
          const prior = await api.get(
            'revision_clinica',
            String(result.revision.revision_previa_id)
          )
          if (active) setPrevious(prior)
        }
      })
      .catch((cause) => {
        if (active) setProblem(errorMessage(cause))
      })
    return () => {
      active = false
    }
  }, [api, chosen, refresh])
  async function save(
    operations: Record<string, unknown>[] = [],
    close = false
  ): Promise<Row[]> {
    if (!revision || pending.current || conflict)
      throw new Error('Espera a que termine el guardado o recarga la revisión.')
    pending.current = true
    setBusy(true)
    setProblem('')
    setNotice('')
    const body = { revision: values, operations, close },
      signature = JSON.stringify({
        id: revision.id,
        version: revision.version,
        body
      })
    if (submission.current?.signature !== signature)
      submission.current = { signature, key: crypto.randomUUID() }
    try {
      const result = await api.saveClinical(
        revision,
        body,
        submission.current.key
      )
      if (live.current) {
        setData((current) =>
          current ? { ...current, revision: result.revision } : current
        )
        setNotice(
          close
            ? 'Consulta cerrada. El original queda protegido.'
            : 'Consulta guardada.'
        )
        setConfirmClose(false)
        setRefresh((v) => v + 1)
        onSaved()
      }
      return result.details
    } catch (cause) {
      if (live.current) {
        setProblem(errorMessage(cause))
        if (cause instanceof ApiError && [409, 412].includes(cause.status))
          setConflict(true)
      }
      throw cause
    } finally {
      pending.current = false
      if (live.current) setBusy(false)
    }
  }
  async function correct() {
    if (!revision || pending.current || !reason.trim()) return
    pending.current = true
    setBusy(true)
    setProblem('')
    const signature = JSON.stringify({
      id: revision.id,
      version: revision.version,
      reason
    })
    if (submission.current?.signature !== signature)
      submission.current = { signature, key: crypto.randomUUID() }
    try {
      const result = await api.correctClinical(
        revision,
        reason,
        submission.current.key
      )
      setChosen(result.id)
      setRefresh((v) => v + 1)
      setReason('')
      setNotice('Corrección creada. La revisión anterior se conserva.')
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  async function addPrescriptionItem() {
    try {
      let prescription = data?.details.prescripcion?.data[0]?.id
      if (!prescription) {
        const result = await save([{ resource: 'prescripcion', data: {} }])
        prescription = result.find((r) => r.resource === 'prescripcion')?.id
      }
      if (prescription) setEditing({ name: 'prescripcion_item', prescription })
    } catch {
      /* save reports the error */
    }
  }
  const editResource = editing ? contract(editing.name) : undefined
  const editorApi: Api = {
    ...api,
    create: async (name, body) => {
      const rows = await save([
        {
          resource: name,
          data: {
            ...body,
            ...(editing?.prescription
              ? { prescripcion_id: editing.prescription }
              : {})
          }
        }
      ])
      return rows.find((r) => r.resource === name)!
    },
    update: async (name, row, body) => {
      const rows = await save([
        { resource: name, id: row.id, version: row.version, data: body }
      ])
      return rows.find((r) => r.id === row.id)!
    }
  }
  return (
    <section className={styles.consultation} aria-label="Consulta integrada">
      {problem && <p role="alert">{problem}</p>}
      {notice && <p role="status">{notice}</p>}
      <label>
        Revisión clínica
        <select
          disabled={dirty || busy}
          value={chosen}
          onChange={(e) => {
            setData(null)
            setChosen(e.target.value)
          }}
        >
          {revisions.map((row) => (
            <option key={row.id} value={row.id}>
              Revisión {String(row.numero)} · {String(row.estado)}
              {row.revision_previa_id ? ' · Corrección' : ''}
            </option>
          ))}
        </select>
      </label>
      {conflict && (
        <p>
          Conserva tus notas antes de recargar. No se sobrescribirán cambios de
          otro usuario.{' '}
          <button
            onClick={() => {
              setValues(
                Object.fromEntries(
                  narrativeFields.map(([key]) => [
                    key,
                    String(revision![key] ?? '')
                  ])
                )
              )
              setRefresh((v) => v + 1)
            }}
          >
            Recargar revisión y descartar cambios locales
          </button>
        </p>
      )}
      {!data ? (
        <p role="status">Cargando consulta…</p>
      ) : (
        <>
          <p>
            {revision!.estado === 'cerrada'
              ? `Cerrada · ${new Date(String(revision!.cerrada_en)).toLocaleString('es-CO')}`
              : dirty
                ? 'Cambios sin guardar'
                : 'Borrador guardado'}{' '}
            · Revisión {String(revision!.numero)}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void save().catch(() => {})
            }}
          >
            <fieldset
              disabled={!canWrite || busy || conflict}
              className={styles.soap}
            >
              {narrativeFields.map(([key, text]) => (
                <label key={key}>
                  {text}
                  {key === 'motivo_consulta' ? ' *' : ''}
                  <textarea
                    name={key}
                    required={key === 'motivo_consulta'}
                    rows={key === 'motivo_consulta' ? 2 : 4}
                    value={values[key] ?? ''}
                    onChange={(e) =>
                      setValues((current) => ({
                        ...current,
                        [key]: e.target.value
                      }))
                    }
                  />
                </label>
              ))}
            </fieldset>
            {canWrite && (
              <div className={styles.actions}>
                <button disabled={busy || conflict} className={styles.primary}>
                  Guardar consulta
                </button>
                <button
                  type="button"
                  disabled={busy || !dirty}
                  onClick={() => {
                    setValues(
                      Object.fromEntries(
                        narrativeFields.map(([key]) => [
                          key,
                          String(revision![key] ?? '')
                        ])
                      )
                    )
                    setProblem('')
                  }}
                >
                  Descartar notas sin guardar
                </button>
                <button
                  type="button"
                  disabled={busy || conflict}
                  onClick={() => setConfirmClose(true)}
                >
                  Revisar y cerrar consulta
                </button>
              </div>
            )}
          </form>
          {confirmClose && (
            <section role="region" aria-label="Confirmar cierre">
              <h3>Revisar cierre clínico</h3>
              <p>
                Se guardarán las notas actuales y se cerrará la revisión.
                Comprueba la evaluación, el plan y los detalles registrados. Las
                correcciones posteriores conservarán el original.
              </p>
              {['motivo_consulta', 'evaluacion', 'plan'].some(
                (key) => !values[key]?.trim()
              ) && (
                <p role="alert">
                  Completa motivo, evaluación y plan. Indica expresamente lo que
                  no aplica al caso.
                </p>
              )}
              <button
                disabled={
                  busy ||
                  ['motivo_consulta', 'evaluacion', 'plan'].some(
                    (key) => !values[key]?.trim()
                  )
                }
                onClick={() => void save([], true).catch(() => {})}
              >
                Confirmar cierre de consulta
              </button>
              <button onClick={() => setConfirmClose(false)}>
                Seguir editando
              </button>
            </section>
          )}
          {detailNames.map((name) => (
            <section key={name} className={styles.detailSection}>
              <h3>{label(name)}</h3>
              {data.details[name] === null ? (
                <p>No tienes permiso para consultar estos datos.</p>
              ) : (
                <>
                  {!data.details[name]?.data.length && (
                    <p>No hay registros en esta revisión.</p>
                  )}
                  {data.details[name]?.data.map((row) => (
                    <div className={styles.entry} key={row.id}>
                      <strong>
                        {name === 'medicion_clinica'
                          ? `${label(String(row.tipo))}: ${row.valor} ${row.unidad}`
                          : rowLabel(row)}
                      </strong>
                      <p>
                        {[
                          'clasificacion',
                          'observaciones',
                          'via',
                          'frecuencia',
                          'duracion',
                          'instrucciones'
                        ]
                          .filter((k) => row[k] != null)
                          .map((k) => String(row[k]))
                          .join(' · ')}
                      </p>
                      {name === 'adjunto_clinico' && (
                        <button
                          onClick={() =>
                            void downloadClinical(
                              api,
                              String(row.archivo_id),
                              String(row.descripcion ?? 'documento')
                            ).catch((cause) => setProblem(errorMessage(cause)))
                          }
                        >
                          Descargar documento
                        </button>
                      )}
                      {canWrite && contract(name)?.permissions.update && (
                        <button
                          disabled={busy || conflict}
                          onClick={() => setEditing({ name, row })}
                        >
                          Editar {label(name).toLowerCase()}
                        </button>
                      )}
                    </div>
                  ))}
                  {data.details[name]?.has_more && (
                    <p>
                      Esta revisión tiene más de 1000 registros. Consulta el
                      módulo correspondiente para revisar todos.
                    </p>
                  )}
                  {canWrite &&
                    contract(name)?.permissions.create &&
                    name !== 'adjunto_clinico' && (
                      <button
                        disabled={busy || conflict}
                        onClick={() =>
                          name === 'prescripcion_item'
                            ? void addPrescriptionItem()
                            : setEditing({ name })
                        }
                      >
                        Añadir{' '}
                        {name === 'medicion_clinica'
                          ? 'medición'
                          : name === 'diagnostico_atencion'
                            ? 'diagnóstico'
                            : 'medicamento'}
                      </button>
                    )}
                </>
              )}
            </section>
          ))}
          <ClinicalLaboratory
            api={api}
            attention={attention}
            disabled={dirty || busy}
          />
          <ClinicalConsents
            api={api}
            attention={attention}
            catalog={catalog}
            disabled={dirty || busy}
            attachments={data.details.adjunto_clinico?.data ?? []}
          />
          <ClinicalFiles
            api={api}
            revision={revision!}
            catalog={catalog}
            disabled={dirty || busy}
            onSaved={() => setRefresh((value) => value + 1)}
          />
          <details>
            <summary>Versiones del documento guardadas en MinIO</summary>
            <PatientDocuments
              key={`${revision!.id}:${refresh}`}
              api={api}
              patientId={String(attention.mascota_id)}
              revisionId={revision!.id}
            />
          </details>
          {revision!.documento != null && (
            <details>
              <summary>Documento clínico original con formato</summary>
              <p>
                Se conserva como nota complementaria. Los datos estructurados se
                muestran arriba.
              </p>
              <ClinicalDocument
                readOnly
                value={revision!.documento as JSONContent}
              />
            </details>
          )}
          {previous && (
            <details>
              <summary>Comparar con la revisión anterior</summary>
              <p>Motivo: {String(revision!.motivo_cambio)}</p>
              <div className={styles.comparison}>
                {narrativeFields.map(([key, text]) => (
                  <section key={key}>
                    <h4>{text}</h4>
                    <p>Anterior: {String(previous[key] ?? 'Sin registro')}</p>
                    <p>Actual: {values[key] || 'Sin registro'}</p>
                  </section>
                ))}
              </div>
            </details>
          )}
          {revision!.estado === 'cerrada' &&
            contract('revision_clinica')?.permissions.create && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  void correct()
                }}
              >
                <label>
                  Motivo de la corrección
                  <textarea
                    required
                    maxLength={4000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <button disabled={busy || !reason.trim()}>
                  Crear corrección vinculada
                </button>
              </form>
            )}
          {editing && editResource && (
            <RecordEditor
              api={editorApi}
              resource={{
                ...editResource,
                fields: editResource.fields.filter(
                  (f) => !['revision_id', 'prescripcion_id'].includes(f.name)
                )
              }}
              catalog={catalog}
              row={editing.row}
              initialValues={
                editing.name === 'medicion_clinica'
                  ? {
                      tipo: 'peso',
                      unidad: 'kg',
                      medida_en: new Date().toISOString()
                    }
                  : undefined
              }
              title={`Registrar ${label(editing.name).toLowerCase()}`}
              onClose={() => setEditing(null)}
              onSaved={() => {
                setEditing(null)
              }}
            />
          )}
        </>
      )}
    </section>
  )
}
