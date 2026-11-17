import styles from './PatientChart.module.css'
import { useEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/react'
import type { Api, Row } from '../workspace/model'
import { errorMessage } from '../../shared/api/http'
import { ClinicalDocument } from './ClinicalDocument'
import { downloadClinical } from './clinical-files-api'

type DocumentProps = { api: Api; patientId: string; revisionId?: string }

export function PatientDocuments(props: DocumentProps) {
  return (
    <DocumentSearch
      key={`${props.patientId}/${props.revisionId ?? ''}`}
      {...props}
    />
  )
}

function DocumentSearch(props: DocumentProps) {
  const [input, setInput] = useState('')
  const [codigo, setCodigo] = useState('')
  return (
    <section
      className={styles.documentList}
      aria-label="Documentos guardados del paciente"
    >
      <h3>Documentos de historia clínica</h3>
      <p>
        Versiones guardadas del editor, vinculadas a este paciente. Puedes abrir
        su contenido y descargar el original editable. Los PDF de consulta se
        emiten desde una revisión cerrada.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setCodigo(input.trim())
        }}
      >
        <label>
          Buscar por identificador del documento
          <input
            type="search"
            value={input}
            pattern={String.raw`\s*([0-9a-fA-F\-]{3,36})?\s*`}
            title="Introduce de 3 a 36 caracteres hexadecimales o guiones del identificador."
            onChange={(event) => setInput(event.target.value)}
          />
        </label>{' '}
        <button type="submit">Buscar documentos</button>{' '}
        <button
          type="button"
          onClick={() => {
            setInput('')
            setCodigo('')
          }}
        >
          Limpiar búsqueda
        </button>
      </form>
      <DocumentResults key={codigo} {...props} codigo={codigo} />
    </section>
  )
}

function DocumentResults({
  api,
  patientId,
  revisionId,
  codigo
}: DocumentProps & { codigo: string }) {
  const listRequest = useRef<AbortController | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [next, setNext] = useState<string | null>(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  const [document, setDocument] = useState<JSONContent | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    listRequest.current = controller
    api
      .patientDocuments(patientId, undefined, revisionId, controller.signal, codigo)
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
  }, [api, patientId, revisionId, retry, codigo])
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
    const controller = listRequest.current
    if (!controller || controller.signal.aborted) return
    setBusy(true)
    setProblem('')
    try {
      const page = await api.patientDocuments(
        patientId, next, revisionId, controller.signal, codigo
      )
      if (controller.signal.aborted) return
      setRows((current) => [...(current ?? []), ...page.data])
      setNext(page.page.next)
    } catch (error) {
      if (!controller.signal.aborted) setProblem(errorMessage(error))
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <>
      {problem && (
        <p role="alert">
          {problem}{' '}
          <button
            onClick={() => {
              listRequest.current?.abort()
              setRows(null)
              setNext(null)
              setProblem('')
              setBusy(false)
              setSelected(null)
              setDocument(null)
              setRetry((value) => value + 1)
            }}
          >
            Reintentar documentos
          </button>
        </p>
      )}
      {!rows && !problem && <p role="status">Cargando documentos…</p>}
      {rows?.length === 0 && (
        <p>
          {codigo
            ? 'No se encontraron documentos con ese identificador.'
            : 'No hay versiones archivadas para esta selección. Los documentos anteriores a esta función permanecen en sus consultas.'}
        </p>
      )}
      {rows?.map((row) => (
        <article key={row.id} data-document-id={row.id}>
          <h4>
            Revisión {String(row.numero_revision)} · versión guardada{' '}
            {String(row.version_revision)}
          </h4>
          <p style={{ overflowWrap: 'anywhere' }}>
            Identificador del documento: {row.id}
          </p>
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
    </>
  )
}
