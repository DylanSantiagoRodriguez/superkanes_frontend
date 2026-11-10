import styles from './PatientChart.module.css'
import { useEffect, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import type { Api, Row } from '../workspace/model'
import { errorMessage } from '../../shared/api/http'
import { ClinicalDocument } from './ClinicalDocument'
import { downloadClinical } from './clinical-files-api'

export function PatientDocuments({
  api,
  patientId,
  revisionId
}: {
  api: Api
  patientId: string
  revisionId?: string
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  const [document, setDocument] = useState<JSONContent | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    api
      .patientDocuments(patientId, undefined, revisionId, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted) {
          setProblem('')
          setRows(page.data)
          setNext(page.page.next)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setProblem(errorMessage(error))
      })
    return () => controller.abort()
  }, [api, patientId, revisionId, retry])
  useEffect(() => {
    let active = true
    if (selected)
      void api
        .clinicalFile(String(selected.archivo_id))
        .then(async (blob) => JSON.parse(await blob.text()) as JSONContent)
        .then((value) => {
          if (active) setDocument(value as JSONContent)
        })
        .catch((error) => {
          if (active) setProblem(errorMessage(error))
        })
    return () => {
      active = false
    }
  }, [api, selected, retry])
  async function more() {
    if (!next || busy) return
    setBusy(true)
    try {
      const page = await api.patientDocuments(patientId, next, revisionId)
      setRows((current) => [...(current ?? []), ...page.data])
      setNext(page.page.next)
    } catch (error) {
      setProblem(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className={styles.documentList} aria-label="Documentos guardados del paciente">
      <h3>Documentos de historia clínica</h3>
      <p>
        Versiones guardadas del editor, vinculadas a este paciente. Puedes abrir
        su contenido y descargar el original editable. Los PDF de consulta se
        emiten desde una revisión cerrada.
      </p>
      {problem && (
        <p role="alert">
          {problem}{' '}
          <button onClick={() => setRetry((value) => value + 1)}>
            Reintentar documentos
          </button>
        </p>
      )}
      {!rows && !problem && <p role="status">Cargando documentos…</p>}
      {rows?.length === 0 && (
        <p>
          No hay versiones archivadas en MinIO para esta selección. Los
          documentos anteriores a esta función permanecen en sus consultas.
        </p>
      )}
      {rows?.map((row) => (
        <article key={row.id} data-document-id={row.id}>
          <h4>
            Revisión {String(row.numero_revision)} · versión guardada{' '}
            {String(row.version_revision)}
          </h4>
          <p>
            {new Date(String(row.creado_en)).toLocaleString('es-CO')} ·{' '}
            {String(row.estado_revision)}
          </p>
          <button
            onClick={() => {
              setProblem('')
              setDocument(null)
              setSelected(row)
            }}
          >
            Ver documento guardado
          </button>{' '}
          <button
            onClick={() =>
              void downloadClinical(
                api,
                String(row.archivo_id),
                String(row.nombre_original)
              ).catch((error) => setProblem(errorMessage(error)))
            }
          >
            Descargar original editable (JSON)
          </button>
        </article>
      ))}
      {next && (
        <button disabled={busy} onClick={() => void more()}>
          Cargar más documentos
        </button>
      )}
      {selected && (
        <div>
          <button onClick={() => setSelected(null)}>
            Cerrar documento guardado
          </button>
          {document ? (
            <ClinicalDocument key={selected.id} value={document} readOnly />
          ) : (
            !problem && <p role="status">Abriendo documento guardado…</p>
          )}
        </div>
      )}
    </section>
  )
}
