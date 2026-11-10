import { RelationPicker } from './RelationPicker'
import { ClinicalDocument } from '../clinical/ClinicalDocument'
import { clinicalTemplate } from '../clinical/clinical-template'
import type { JSONContent } from '@tiptap/react'
import { PatientPhotoInput } from './PatientPhoto'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, errorMessage } from '../../shared/api/http'
import { display, label, rowLabel } from './model'
import type { Api, Field, Resource, Row } from './model'
import styles from './Workspace.module.css'
function inputValue(field: Field, value: unknown): string {
  if (value === null || value === undefined) return ''
  if (field.type === 'jsonb') return JSON.stringify(value, null, 2)
  if (field.type === 'timestamptz') {
    const date = new Date(String(value))
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, field.name === 'medida_en' ? 23 : 16)
  }
  return String(value)
}
function editableFields(resource: Resource, row?: Row) {
  return resource.fields.filter((field) => {
    if (!(row ? field.update : field.create)) return false
    if (
      resource.name === 'recordatorio' &&
      (row
        ? field.name !== 'estado'
        : ['enviado_en', 'intentos', 'referencia_proveedor'].includes(
            field.name
          ))
    )
      return false
    if (
      resource.name === 'vacunacion' &&
      row &&
      !['estado', 'motivo_anulacion'].includes(field.name)
    )
      return false
    if (
      resource.name === 'mascota' &&
      row &&
      field.name === 'tutor_principal_id'
    )
      return false
    return true
  })
}
export function RecordEditor({
  api,
  resource,
  catalog,
  row,
  onClose,
  onSaved,
  title,
  initialValues,
  depth = 0
}: {
  api: Api
  resource: Resource
  catalog: Resource[]
  row?: Row
  onClose: () => void
  onSaved: (row: Row, tutorId?: string) => void
  title?: string
  initialValues?: Record<string, unknown>
  depth?: number
}) {
  const [creatingRelation, setCreatingRelation] = useState<{ field: Field; resource: Resource } | null>(null)
  const editorId = depth ? `editor-title-${depth}` : 'editor-title'
  const autoContact = useRef('')
  const selectionRequest = useRef(0)
  const isPet = resource.name === 'mascota'
  const withHistory = resource.name === 'atencion_clinica' && !row
  const revisionResource = catalog.find(item => item.name === 'revision_clinica')
  const fields = [
    ...editableFields(resource, row).filter(field => !(withHistory && ['estado', 'motivo_anulacion'].includes(field.name))),
    ...(withHistory ? [
      { name: 'motivo_consulta', type: 'text', nullable: false, required: true, enum: [], default: null, create: true, update: false, reference: null },
      { name: 'documento', type: 'jsonb', nullable: true, required: false, enum: [], default: null, create: true, update: false, reference: null }
    ] as Field[] : [])
  ]
  const initial: Record<string, unknown> = row ?? { ...(withHistory ? { documento: clinicalTemplate } : {}), ...initialValues }
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((field) => [field.name, inputValue(field, initial[field.name])])
    )
  )
  const [uploading, setUploading] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const dirty = fields.some(field => !(withHistory && field.name === 'profesional_id') && (values[field.name] ?? '') !== inputValue(field, initial[field.name]))
  const close = () => { if (busy || uploading) return; if (dirty) setDiscarding(true); else onClose() }
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const pending = useRef(false)
  const submission = useRef<{ body: string; key: string } | null>(null)
  const [links, setLinks] = useState<
    Record<
      string,
      { rows: Row[]; next: string | null; error?: string; loading?: boolean }
    >
  >({})
  const species = isPet ? values.especie_id ?? '' : ''
  const canReadBreeds = catalog.some(item => item.name === 'raza')
  const relationKey = (target: string) => isPet && target === 'raza' ? `raza:${species}` : target
  const linkTargets = [
    ...new Set(
      fields.flatMap((field) =>
        field.reference && !(resource.name === 'mascota' && field.name === 'foto_archivo_id') ? [field.reference.resource] : []
      )
    )
  ].join(',')
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    dialog.current?.showModal()
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    let live = true
    for (const target of linkTargets.split(',').filter(Boolean)) {
      if ((isPet && target === 'raza') || ['mascota', 'tutor'].includes(target)) continue
      if (withHistory && target === 'profesional') {
        api.clinicalAuthor().then(author => {
          if (!live) return
          setLinks(current => ({ ...current, profesional: { rows: author ? [author] : [], next: null,
            ...(author ? {} : { error: 'Tu cuenta no tiene un perfil profesional en esta clínica. Solicita que vinculen tu usuario antes de guardar.' }) } }))
          if (author) setValues(current => ({ ...current, profesional_id: author.id }))
        }).catch(cause => { if (live) setLinks(current => ({ ...current, profesional: { rows: [], next: null, error: errorMessage(cause) } })) })
        continue
      }
      if (!catalog.some((r) => r.name === target)) continue
      api
        .list(target)
        .then((result) => {
          if (live)
            setLinks((current) => ({
              ...current,
              [target]: { rows: result.data, next: result.page.next }
            }))
        })
        .catch((cause) => {
          if (live)
            setLinks((current) => ({
              ...current,
              [target]: { rows: [], next: null, error: errorMessage(cause) }
            }))
        })
    }
    return () => {
      live = false
    }
  }, [api, linkTargets, catalog, withHistory, isPet])
  useEffect(() => {
    if (!isPet || !species || !canReadBreeds) return
    const controller = new AbortController()
    const key = `raza:${species}`
    api.list('raza', undefined, { especie_id: species }, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setLinks(current => ({ ...current, [key]: { rows: result.data, next: result.page.next } }))
      })
      .catch(cause => {
        if (!controller.signal.aborted) setLinks(current => ({ ...current, [key]: { rows: [], next: null, error: errorMessage(cause) } }))
      })
    return () => controller.abort()
  }, [api, isPet, species, canReadBreeds])
  async function more(target: string) {
    const key = relationKey(target)
    const current = links[key]
    if (!current?.next || current.loading) return
    setLinks((value) => ({ ...value, [key]: { ...current, loading: true } }))
    try {
      const result = await api.list(target, current.next, isPet && target === 'raza' ? { especie_id: species } : undefined)
      if (mounted.current)
        setLinks((value) => ({
          ...value,
          [key]: {
            rows: [...current.rows, ...result.data],
            next: result.page.next
          }
        }))
    } catch (cause) {
      if (mounted.current)
        setLinks((value) => ({
          ...value,
          [key]: { ...current, loading: false, error: errorMessage(cause) }
        }))
    }
  }
  async function selectRelation(field: Field, id: string, selected?: Row, tutorId?: string) {
    setValues(current => ({ ...current, [field.name]: id }))
    if (field.name === 'tutor_contacto_id') { autoContact.current = ''; selectionRequest.current++; return }
    if (field.reference?.resource !== 'mascota' || resource.name !== 'cita') return
    const generation = ++selectionRequest.current
    const canSuggest = !values.tutor_contacto_id || values.tutor_contacto_id === autoContact.current
    if (!canSuggest) return
    setValues(current => ({ ...current, tutor_contacto_id: '' }))
    autoContact.current = ''
    let contact = tutorId ?? String(selected?.tutor_principal_id ?? '')
    if (!contact && id && catalog.some(r => r.name === 'mascota_tutor')) {
      try {
        const page = await api.list('mascota_tutor', undefined, { mascota_id: id, es_principal: true, vigente_hasta: null })
        contact = String(page.data[0]?.tutor_id ?? '')
      } catch { return } // Contact remains editable if the link is unavailable.
    }
    if (contact && mounted.current && generation === selectionRequest.current) {
      autoContact.current = contact
      setValues(current => current.mascota_id === id && !current.tutor_contacto_id ? { ...current, tutor_contacto_id: contact } : current)
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || conflict || uploading) return
    setProblem('')
    const body: Record<string, unknown> = {}
    try {
      for (const field of fields) {
        const value = values[field.name] ?? ''
        if (row && value === inputValue(field, row[field.name])) continue
        if (!value) {
          if (row && field.nullable) body[field.name] = null
          else if (field.required || (row && !field.nullable))
            throw new Error(`${label(field.name)} es obligatorio.`)
          continue
        }
        if (field.type === 'jsonb') {
          try {
            body[field.name] = JSON.parse(value)
          } catch {
            throw new Error(
              `${label(field.name)} debe contener un objeto válido.`
            )
          }
        } else if (field.type === 'boolean') body[field.name] = value === 'true'
        else if (field.type === 'integer') body[field.name] = Number(value)
        else if (field.type === 'timestamptz')
          body[field.name] = new Date(value).toISOString()
        else body[field.name] = value
      }
      if (row && !Object.keys(body).length) {
        setProblem('No has modificado ningún campo.')
        return
      }
    } catch (cause) {
      setProblem(cause instanceof Error ? cause.message : 'Revisa los campos.')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      let result: Row
      if (row) result = await api.update(resource.name, row, body)
      else {
        const serialized = JSON.stringify(body)
        if (submission.current?.body !== serialized)
          submission.current = { body: serialized, key: crypto.randomUUID() }
        if (withHistory) result = await api.createAttentionWithHistory(body, submission.current.key)
        else result = await api.create(resource.name, body, submission.current.key)
      }
      if (mounted.current) onSaved(result, isPet && !row ? values.tutor_principal_id : undefined)
    } catch (cause) {
      if (mounted.current) {
        setProblem(cause instanceof ApiError && cause.status === 404 && isPet
          ? 'No se pudo guardar la mascota porque una relación no está disponible. Revisa la especie, raza, tutor y foto seleccionados.'
          : errorMessage(cause))
        if (
          row &&
          cause instanceof ApiError &&
          [409, 412].includes(cause.status)
        )
          setConflict(true)
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const canSubmit = (!withHistory || Boolean(revisionResource?.permissions.create)) && fields.every(
    (field) =>
      field.name === 'foto_archivo_id' ||
      !field.required ||
      !field.reference ||
      (['mascota', 'tutor'].includes(field.reference.resource) && catalog.some(r => r.name === field.reference!.resource)) ||
      Boolean(
        links[field.reference.resource] &&
        !links[field.reference.resource].error
      )
  )
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${(resource.name === 'revision_clinica' || withHistory) ? styles.documentDialog : ''}`}
      aria-labelledby={editorId}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        close()
      }}
    >
      <div className={styles.dialogHeader}>
        <div>
          <h2 id={editorId}>
            {title ?? (withHistory ? 'Nueva atención e historia clínica' : row ? 'Editar registro' : 'Nuevo registro')}
          </h2>
          <p>{label(resource.name)}</p>
        </div>
        <button disabled={busy || uploading} onClick={close}>
          Cerrar
        </button>
      </div>
      {withHistory && <div className={styles.notice}>
        <p>Completa los datos del paciente y redacta la historia en el documento. Guardar creará la atención y su primera revisión en borrador.</p>
        <button type="button" onClick={() => dialog.current?.querySelector('[aria-label="Documento de historia clínica"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Ir al documento</button>
        {!revisionResource?.permissions.create && <p role="alert">Necesitas permiso para crear revisiones clínicas. Solicítalo al administrador para guardar la historia.</p>}
      </div>}
      {title === 'Cambiar tutor principal'  && (
        <p className={styles.notice}>
          Selecciona un tutor distinto al principal actual y la fecha de hoy en
          la zona horaria de la clínica. Se conservará el historial de sus
          vínculos.
        </p>
      )}
      <p className={styles.hint}>
        Los campos con * son obligatorios. Las fechas y horas usan la zona
        horaria de este dispositivo:{' '}
        {Intl.DateTimeFormat().resolvedOptions().timeZone}.
      </p>
      {resource.name === 'mascota' && row && (
        <p className={styles.notice}>
          El cambio de tutor principal requiere una transferencia que conserve
          la historia de sus vínculos; no se sobrescribe desde esta edición.
        </p>
      )}
      {discarding && <div className={styles.notice} role="alert">
        <p>Hay cambios sin guardar. ¿Quieres descartarlos y cerrar?</p>
        <button type="button" onClick={() => setDiscarding(false)}>Seguir editando</button>{' '}
        <button type="button" onClick={onClose}>Descartar cambios</button>
      </div>}
      {depth > 0 && <p className={styles.notice}>Al guardar se crea este registro. Se conservará aunque después canceles el formulario anterior.</p>}
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy || conflict || uploading} className={styles.formGrid}>
          {fields.map((field) => {
            const value = values[field.name] ?? ''
            const ref = field.reference
            const isBreed = isPet && field.name === 'raza_id'
            const options = ref
              ? (withHistory && ref.resource === 'profesional') || catalog.some((r) => r.name === ref.resource)
                ? links[relationKey(ref.resource)]
                : {
                    rows: [] as Row[],
                    next: null,
                    error: 'No tienes permiso para consultar esta relación.',
                    loading: false
                  }
              : undefined
            const required = row ? !field.nullable : field.required
            let choices = field.enum
            if (field.name === 'estado' && resource.transitions) {
              if (row)
                choices = [
                  String(row.estado),
                  ...(resource.transitions[String(row.estado)] ?? [])
                ]
              else if (field.default?.startsWith("'"))
                choices = [field.default.split("'")[1]]
            }
            if (
              field.name === 'estado' &&
              row &&
              resource.name === 'vacunacion'
            )
              choices = ['anulada']
            if (
              field.name === 'estado' &&
              row &&
              resource.name === 'recordatorio'
            )
              choices = ['cancelado']
            const props = {
              id: `${depth ? `nested-${depth}-` : ''}field-${field.name}`,
              name: field.name,
              value,
              required,
              onChange: (
                event: React.ChangeEvent<
                  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                >
              ) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                  ...(isPet && field.name === 'especie_id' && current.especie_id !== event.target.value ? { raza_id: '' } : {})
                }))
            }
            return (
              <div
                className={field.type === 'jsonb' || field.name === 'foto_archivo_id' ? styles.wide : undefined}
                key={field.name}
              >
                <label htmlFor={props.id}>
                  {label(field.name)}
                  {required ? ' *' : ''}
                </label>
                {(resource.name === 'revision_clinica' || withHistory) && field.name === 'documento' ? (
                  <ClinicalDocument value={value ? JSON.parse(value) as JSONContent : null} disabled={busy || conflict} onChange={document => setValues(current => ({ ...current, [field.name]: JSON.stringify(document) }))} />
                ) : resource.name === 'mascota' && field.name === 'foto_archivo_id' ? (
                  catalog.find(r => r.name === 'archivo')?.permissions.create ?
                    <PatientPhotoInput inputId={`${props.id}-upload`} api={api} value={value} name={values.nombre ?? ''} onBusy={setUploading} onChange={id => setValues(current => ({ ...current, [field.name]: id }))} /> : <p>No tienes permiso para cargar fotos. Puedes conservar la foto actual.</p>
                ) : withHistory && field.name === 'profesional_id' ? (
                  <>
                    <input id={props.id} readOnly value={options?.rows[0] ? rowLabel(options.rows[0]) : 'Consultando tu perfil profesional…'} />
                    <p className={styles.hint}>La historia queda a nombre del profesional vinculado a tu sesión.</p>
                    {options?.error && <p className={styles.fieldError} role="alert">{options.error}</p>}
                  </>
                ) : ref && ['mascota', 'tutor'].includes(ref.resource) && catalog.some(r => r.name === ref.resource) ? (
                  <RelationPicker api={api} target={ref.resource} id={props.id} name={field.name} value={value} required={required}
                    onChange={(id, selected) => { void selectRelation(field, id, selected) }}
                    onCreate={catalog.find(r => r.name === ref.resource)?.permissions.create ? () => setCreatingRelation({ field, resource: catalog.find(r => r.name === ref.resource)! }) : undefined} />
                ) : ref ? (
                  <>
                    <select
                      {...props}
                      disabled={!options || Boolean(options.error) || (isBreed && !species)}
                    >
                      <option value="">
                        {isBreed && !species ? 'Selecciona primero la especie' : !options
                          ? 'Cargando opciones…'
                          : isBreed ? 'Sin raza especificada (opcional)' : 'Selecciona un registro'}
                      </option>
                      {value && (!isBreed || (row?.raza_id === value && row?.especie_id === species)) &&
                        !options?.rows.some((item) => item.id === value) && (
                          <option value={value}>
                            Relación actual (conservar)
                          </option>
                        )}
                      {options?.rows.map((item) => (
                        <option key={item.id} value={String(item[ref.field])}>
                          {rowLabel(item)}
                        </option>
                      ))}
                    </select>
                    {options?.next && (
                      <button
                        type="button"
                        disabled={options.loading}
                        onClick={() => void more(ref.resource)}
                      >
                        Cargar más opciones
                      </button>
                    )}
                    {options?.error && (
                      <p className={styles.fieldError}>{options.error}</p>
                    )}
                    {options && !options.error && !options.rows.length && (
                      <p className={styles.hint}>
                        {isBreed ? 'No hay razas registradas para esta especie. Puedes guardar la mascota sin especificar raza.' : <>No hay opciones. Crea primero el registro relacionado en {label(ref.resource)}.</>}
                      </p>
                    )}
                  </>
                ) : choices.length || field.type === 'boolean' ? (
                  <select {...props}>
                    <option value="">
                      {row ? 'Sin valor' : 'Usar valor predeterminado'}
                    </option>
                    {(field.type === 'boolean'
                      ? ['true', 'false']
                      : choices
                    ).map((choice) => (
                      <option key={choice} value={choice}>
                        {display(choice)}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'jsonb' ? (
                  <textarea
                    {...props}
                    rows={6}
                    spellCheck={false}
                    placeholder='{"campo": "valor"}'
                  />
                ) : ['anamnesis', 'evaluacion', 'plan', 'motivo_consulta', 'hallazgos', 'notas'].includes(field.name) ? (
                  <textarea {...props} rows={5} maxLength={20000} />
                ) : (
                  <input
                    {...props}
                    type={
                      field.type === 'date'
                        ? 'date'
                        : field.type === 'timestamptz'
                          ? 'datetime-local'
                          : field.type === 'integer'
                            ? 'number'
                            : field.name === 'email'
                              ? 'email'
                              : 'text'
                    }
                    maxLength={20000}
                    step={field.type === 'integer' ? 1 : field.name === 'medida_en' ? '0.001' : undefined}
                    inputMode={
                      field.type.startsWith('numeric') ||
                      field.type === 'bigint'
                        ? 'decimal'
                        : undefined
                    }
                  />
                )}
              </div>
            )
          })}
        </fieldset>
        {problem && (
          <p className={styles.error} role="alert">
            {problem}
          </p>
        )}
        {conflict && (
          <p>
            Cierra este formulario y vuelve a abrir el registro para consultar
            sus datos actuales.
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" disabled={busy || uploading} onClick={close}>
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.primary}
            disabled={busy || uploading || conflict || !canSubmit}
          >
            {busy ? 'Guardando…' : withHistory ? 'Guardar atención e historia' : 'Guardar'}
          </button>
        </div>
      </form>
      {creatingRelation && <RecordEditor
        api={api} resource={creatingRelation.resource} catalog={catalog} depth={depth + 1}
        title={creatingRelation.resource.name === 'mascota' ? 'Nueva mascota sin salir del formulario' : 'Nuevo tutor sin salir del formulario'}
        onClose={() => setCreatingRelation(null)}
        onSaved={(saved, tutorId) => {
          void selectRelation(creatingRelation.field, saved.id, saved, tutorId)
          setCreatingRelation(null)
        }}
      />}
    </dialog>
  )
}
