import { PatientChart } from '../clinical/PatientChart'
import { AttentionHistory } from '../clinical/AttentionHistory'
import { ClinicalDocument } from '../clinical/ClinicalDocument'
import type { JSONContent } from '@tiptap/react'
import { PatientPhoto } from './PatientPhoto'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/api/http'
import { Panel } from '../../shared/ui/Panel'
import { display, label, rowLabel } from './model'
import type { Api, Field, Page, Resource, Row } from './model'
import { RecordEditor } from './RecordEditor'
import styles from './Workspace.module.css'
const notices: Record<string, string> = {
  reporte_emitido:
    'Consulta los reportes ya emitidos. La generación de nuevos reportes todavía no está disponible.',
  evento_salida:
    'Consulta los eventos registrados. El envío a servicios externos requiere su proceso de entrega.',
  evento_auditoria:
    'Historial de operaciones registradas. Los eventos no se pueden modificar.',
  archivo:
    'Las fotos se cargan desde la ficha del paciente. Aquí puedes consultar sus archivos registrados.',
  recordatorio:
    'Puedes programar o cancelar recordatorios. El envío automático todavía no está conectado.',
  firma_consentimiento:
    'Consulta las firmas registradas. La captura de una nueva firma requiere un flujo de firma y verificación.',
  usuario:
    'Consulta usuarios existentes. La creación de cuentas con contraseña se realiza mediante el proceso de autenticación y no desde este listado.',
  vacunacion:
    'Una vacunación registrada solo se puede anular con motivo. La corrección se registra como una nueva vacunación.'
}
const managedCreation = new Set(['archivo', 'firma_consentimiento', 'usuario'])
export function ResourceBrowser({
  api,
  resource,
  catalog
}: {
  api: Api
  resource: Resource
  catalog: Resource[]
}) {
  const [chartId, setChartId] = useState<string | null>(null)
  const [page, setPage] = useState<Page | null>(null)
  const [cursor, setCursor] = useState<string | undefined>()
  const [history, setHistory] = useState<(string | undefined)[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Row | null>(null)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [transferring, setTransferring] = useState<Row | null>(null)
  const [deleting, setDeleting] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)
  const detailRef = useRef<HTMLDialogElement>(null)
  const confirmationRef = useRef<HTMLDialogElement>(null)
  const mounted = useRef(true)
  const mutationPending = useRef(false)
  useEffect(() => {
    mounted.current = true
  return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    api
      .list(
        resource.name,
        cursor,
        status ? { estado: status } : undefined,
        controller.signal
      )
      .then((result) => {
        if (!controller.signal.aborted) setPage(result)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setProblem(errorMessage(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [api, resource.name, cursor, status, revision])
  useEffect(() => {
    if (selected) detailRef.current?.showModal()
  }, [selected])
  useEffect(() => {
    if (deleting) confirmationRef.current?.showModal()
  }, [deleting])
  async function open(row: Row, edit = false) {
    setBusy(true)
    setProblem('')
    setNotice('')
    try {
      const fresh = await api.get(resource.name, row.id)
      if (mounted.current) {
        if (edit) {
          setSelected(null)
          setEditing(fresh)
        } else setSelected(fresh)
      }
    } catch (cause) {
      if (mounted.current) setProblem(errorMessage(cause))
    } finally {
      if (mounted.current) setBusy(false)
    }
  }
  function reload() {
    setLoading(true)
    setPage(null)
    setProblem('')
    setSelected(null)
    setDeleting(null)
    setRevision((value) => value + 1)
  }
  function saved() {
    setTransferring(null)
    setEditing(null)
    setNotice('Cambios guardados.')
    reload()
  }
  async function remove() {
    if (!deleting || mutationPending.current) return
    mutationPending.current = true
    setBusy(true)
    setProblem('')
    try {
      await api.remove(resource.name, deleting)
      if (mounted.current) {
        setNotice('Operación completada.')
        reload()
      }
    } catch (cause) {
      if (mounted.current) {
        setProblem(errorMessage(cause))
        setDeleting(null)
      }
    } finally {
      mutationPending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const preferred: Record<string, string[]> = {
    cita: ['inicio', 'mascota_id', 'tutor_contacto_id', 'tipo', 'estado'],
    mascota: ['codigo', 'nombre', 'especie_id', 'estado'],
    atencion_clinica: [
      'fecha_atencion',
      'mascota_id',
      'profesional_id',
      'estado'
    ],
    vacunacion: ['aplicada_en', 'mascota_id', 'vacuna_id', 'estado'],
    servicio_peluqueria: ['fecha_servicio', 'mascota_id', 'estado']
  }
  const visibleFields = resource.fields.filter(
    (field) =>
      ![
        'id',
        'organizacion_id',
        'version',
        'creado_en',
        'actualizado_en',
        'tutor_principal_id'
      ].includes(field.name) && field.type !== 'jsonb'
  )
  const columns = preferred[resource.name]
    ? preferred[resource.name].flatMap((name) => {
        const field = visibleFields.find((item) => item.name === name)
        return field ? [field] : []
      })
    : visibleFields.slice(0, 5)
  const rows = (page?.data ?? []).filter((row) =>
    Object.values(row).some(
      (value) =>
        typeof value !== 'object' &&
        display(value)
          .toLocaleLowerCase('es')
          .includes(search.trim().toLocaleLowerCase('es'))
    )
  )
  const statusField = resource.fields.find(
    (field) => field.name === 'estado' && field.enum.length
  )
  const canEdit = (row: Row) =>
    resource.permissions.update &&
    typeof row.version === 'number' &&
    !(resource.name === 'revision_clinica' && row.estado === 'cerrada') &&
    !['archivo', 'usuario'].includes(resource.name)
  const relation = catalog.find((item) => item.name === 'mascota_tutor')
  const canTransfer =
    resource.name === 'mascota' &&
    resource.permissions.update &&
    relation?.permissions.create &&
    relation.permissions.update
  const deletionLabel =
    resource.deletion === 'hard'
      ? 'Eliminar'
      : resource.deletionEffect?.[1] === 'cancelada' ||
          resource.deletionEffect?.[1] === 'cancelado'
        ? 'Cancelar registro'
        : 'Desactivar'
    if (chartId) return <PatientChart api={api} patientId={chartId} catalog={catalog} onBack={() => setChartId(null)} />
  return (
    <>
      {notices[resource.name] && (
        <p className={styles.notice}>{notices[resource.name]}</p>
      )}
      {problem && (
        <p className={styles.error} role="alert">
          {problem}
        </p>
      )}
      {notice && (
        <p className={styles.success} role="status">
          {notice}
        </p>
      )}
      <Panel
        title={label(resource.name)}
        description="Registros de la organización seleccionada."
        action={
          <div className={styles.actions}>
            <button onClick={reload} disabled={loading || busy}>
              Actualizar
            </button>
            {resource.permissions.create &&
              !managedCreation.has(resource.name) && (
                <button
                  className={styles.primary}
                  onClick={() => {
                    setNotice('')
                    setEditing('new')
                  }}
                >
                  Nuevo registro
                </button>
              )}
          </div>
        }
      >
        <div className={styles.toolbar}>
          <label>
            Buscar en esta página
            <input
              type="search"
              placeholder="Nombre, estado o dato del registro"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {statusField && (
            <label>
              Estado
              <select
                value={status}
                onChange={(event) => {
                  setLoading(true)
                  setPage(null)
                  setProblem('')
                  setStatus(event.target.value)
                  setCursor(undefined)
                  setHistory([])
                }}
              >
                <option value="">Todos</option>
                {statusField.enum.map((value) => (
                  <option key={value} value={value}>
                    {display(value)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {loading ? (
          <p className={styles.empty} role="status">
            Cargando registros…
          </p>
        ) : problem && !page ? (
          <p className={styles.empty}>
            No se pudo cargar la lista. Pulsa Actualizar para reintentar.
          </p>
        ) : (
          <>
            <div
              className={styles.tableScroll}
              tabIndex={0}
              role="region"
              aria-label={label(resource.name)}
            >
              <table>
                <thead>
                  <tr>
                    {columns.map((field) => (
                      <th scope="col" key={field.name}>
                        {label(field.name)}
                      </th>
                    ))}
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      {columns.map((field) => (
                        <td key={`${field.name}-${revision}`}>
                          <DetailValue
                            api={api}
                            field={field}
                            value={row[field.name]}
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          aria-label={`Ver ${rowLabel(row)}`}
                          disabled={busy}
                          onClick={() => void open(row)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <p className={styles.empty} role="status">
                {search
                  ? 'No hay coincidencias en esta página.'
                  : 'Todavía no hay registros para esta consulta.'}
              </p>
            )}
            <div className={styles.pagination}>
              <span>{rows.length} registros en esta página</span>
              <div className={styles.actions}>
                <button
                  disabled={!history.length}
                  onClick={() => {
                    setLoading(true)
                    setPage(null)
                    setProblem('')
                    setCursor(history.at(-1))
                    setHistory((value) => value.slice(0, -1))
                    setSearch('')
                  }}
                >
                  Anterior
                </button>
                <button
                  disabled={!page?.page.next}
                  onClick={() => {
                    setLoading(true)
                    setPage(null)
                    setProblem('')
                    setHistory((value) => [...value, cursor])
                    setCursor(page?.page.next ?? undefined)
                    setSearch('')
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
      {selected && (
        <dialog
          ref={detailRef}
          className={`${styles.dialog} ${['revision_clinica', 'atencion_clinica'].includes(resource.name) ? styles.documentDialog : ''}`}
          aria-labelledby="detail-title"
          onCancel={() => setSelected(null)}
          onClose={() => setSelected(null)}
        >
          <div className={styles.dialogHeader}>
            <h2 id="detail-title">{rowLabel(selected)}</h2>
            <button onClick={() => setSelected(null)}>Cerrar</button>
          </div>
          {resource.name === 'mascota' && <button className={styles.primary} onClick={() => { setChartId(selected.id); setSelected(null) }}>Abrir ficha clínica</button>}
          {resource.name === 'mascota' && <PatientPhoto api={api} id={String(selected.foto_archivo_id ?? '')} name={String(selected.nombre ?? '')} />}
          {resource.name === 'revision_clinica' && selected.documento != null && <ClinicalDocument readOnly value={selected.documento as JSONContent} />}
          {resource.name === 'atencion_clinica' && <AttentionHistory api={api} attention={selected} catalog={catalog} />}
          <dl className={styles.details}>
            {resource.fields
              .filter(
                (field) =>
                  field.name in selected &&
                  !['id', 'organizacion_id', 'version', 'documento', ...(resource.name === 'mascota' ? ['foto_archivo_id'] : [])].includes(field.name)
              )
              .map((field) => (
                <div key={field.name}>
                  <dt>{label(field.name)}</dt>
                  <dd>
                    <DetailValue
                      api={api}
                      field={field}
                      value={selected[field.name]}
                    />
                  </dd>
                </div>
              ))}
          </dl>
          <div className={styles.actions}>
            {canTransfer && (
              <button
                disabled={busy}
                onClick={() => {
                  setTransferring(selected)
                  setSelected(null)
                }}
              >
                Cambiar tutor principal
              </button>
            )}
            {canEdit(selected) && (
              <button
                className={styles.primary}
                disabled={busy}
                onClick={() => void open(selected, true)}
              >
                Editar
              </button>
            )}
            {resource.permissions.delete &&
              typeof selected.version === 'number' && (
                <button
                  className={styles.danger}
                  disabled={busy}
                  onClick={() => {
                    setDeleting(selected)
                    setSelected(null)
                  }}
                >
                  {deletionLabel}
                </button>
              )}
          </div>
        </dialog>
      )}
      {transferring && relation && (
        <RecordEditor
          api={{
            ...api,
            update: (_name, row, body) => api.transfer(row, body)
          }}
          resource={{
            ...relation,
            fields: relation.fields
              .filter((field) =>
                ['tutor_id', 'vigente_desde', 'autorizado_consentir'].includes(
                  field.name
                )
              )
              .map((field) => ({ ...field, update: true }))
          }}
          catalog={catalog}
          row={{
            ...transferring,
            tutor_id: '',
            vigente_desde: '',
            autorizado_consentir: false
          }}
          title="Cambiar tutor principal"
          onClose={() => setTransferring(null)}
          onSaved={saved}
        />
      )}
      {editing && (
        <RecordEditor
          api={api}
          resource={resource}
          catalog={catalog}
          row={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {deleting && (
        <dialog
          ref={confirmationRef}
          className={styles.dialog}
          aria-labelledby="delete-title"
          onCancel={(event) => {
            if (busy) event.preventDefault()
            else setDeleting(null)
          }}
        >
          <h2 id="delete-title">{deletionLabel} registro</h2>
          <p>
            ¿Confirmas que deseas {deletionLabel.toLocaleLowerCase('es')} «
            {rowLabel(deleting)}»?
          </p>
          <p>
            {resource.deletion === 'hard'
              ? 'Esta acción elimina el registro. Las relaciones y el historial pueden impedirla.'
              : 'El registro se conservará y cambiará su estado.'}
          </p>
          <div className={styles.actions}>
            <button disabled={busy} onClick={() => setDeleting(null)}>
              Volver
            </button>
            <button
              className={styles.danger}
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? 'Procesando…' : 'Confirmar'}
            </button>
          </div>
        </dialog>
      )}
    </>
  )
}
function DetailValue({
  api,
  field,
  value
}: {
  api: Api
  field: Field
  value: unknown
}) {
  const [text, setText] = useState('Consultando…')
  useEffect(() => {
    let live = true
    if (field.reference && typeof value === 'string')
      api
        .get(field.reference.resource, value)
        .then((row) => {
          if (live) setText(rowLabel(row))
        })
        .catch(() => {
          if (live) setText('Registro relacionado no disponible')
        })
    return () => {
      live = false
    }
  }, [api, field.reference, value])
  return (
    <>{field.reference && typeof value === 'string' ? text : display(value)}</>
  )
}
