import { useEffect, useState } from 'react'
import type { Api, Resource, Row } from '../workspace/model'
import { RecordEditor } from '../workspace/RecordEditor'
import { errorMessage } from '../../shared/api/http'
import { downloadClinical } from './clinical-files-api'
export function ClinicalConsents({
  api,
  attention,
  catalog,
  disabled,
  attachments
}: {
  api: Api
  attention: Row
  catalog: Resource[]
  disabled: boolean
  attachments: Row[]
}) {
  const consent = catalog.find((r) => r.name === 'consentimiento'),
    signature = catalog.find((r) => r.name === 'firma_consentimiento')
  const [rows, setRows] = useState<Row[] | null>(null),
    [problem, setProblem] = useState(''),
    [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  useEffect(() => {
    if (!consent) return
    let live = true
    async function load() {
      const result: Row[] = []
      let after: string | undefined
      do {
        const page = await api.list('consentimiento', after, {
          atencion_id: attention.id
        })
        result.push(...page.data)
        after = page.page.next ?? undefined
      } while (after && live)
      if (live) {
        setRows(result)
        setProblem('')
      }
    }
    void load().catch((cause) => {
      if (live) setProblem(errorMessage(cause))
    })
    return () => {
      live = false
    }
  }, [api, attention.id, consent, refresh])
  if (!consent) return null
  const response = editing && editing !== 'new' ? editing : null
  const editorApi: Api = {
    ...api,
    list: async (name, after, filter, signal) =>
      name === 'archivo'
        ? {
            data: attachments.map((row) => ({
              id: String(row.archivo_id),
              nombre_original:
                row.nombre_original ?? row.descripcion ?? 'Documento adjunto'
            })),
            page: { limit: 1000, next: null }
          }
        : api.list(name, after, filter, signal),
    create: async (_name, body, key) => {
      if (response) return api.respondClinicalConsent(response, body, key)
      const file = await api.get('archivo', String(body.documento_archivo_id))
      return api.create(
        'consentimiento',
        { ...body, atencion_id: attention.id, hash_documento: file.sha256 },
        key
      )
    }
  }
  const editorResource =
    editing === 'new'
      ? {
          ...consent,
          fields: consent.fields
            .filter(
              (f) =>
                ![
                  'servicio_id',
                  'atencion_id',
                  'hash_documento',
                  'estado',
                  'emitido_en'
                ].includes(f.name)
            )
            .map((f) =>
              f.name === 'procedimiento' ? { ...f, required: true } : f
            )
        }
      : signature
        ? {
            ...signature,
            fields: signature.fields.filter((f) =>
              ['tutor_id', 'evidencia_archivo_id', 'decision'].includes(f.name)
            )
          }
        : null
  return (
    <section aria-label="Consentimientos clínicos">
      <h3>Consentimientos clínicos</h3>
      <p>
        Registra el procedimiento y sus límites con una plantilla publicada.
        Adjunta el documento y la evidencia de aceptación o rechazo a esta
        atención. Este registro documental es independiente de la autorización
        de datos personales.
      </p>
      {problem && <p role="alert">{problem}</p>}
      {!rows && !problem && <p role="status">Cargando consentimientos…</p>}
      {rows?.length === 0 && (
        <p>No hay consentimientos clínicos registrados.</p>
      )}
      {rows?.map((row) => (
        <article key={row.id}>
          <h4>
            {String(row.procedimiento)} · {String(row.estado)}
          </h4>
          <p>{String(row.alcance ?? 'Sin límites adicionales registrados')}</p>
          <button
            onClick={() =>
              void downloadClinical(
                api,
                String(row.documento_archivo_id),
                'consentimiento.pdf'
              ).catch((cause) => setProblem(errorMessage(cause)))
            }
          >
            Descargar documento del consentimiento
          </button>
          {row.estado === 'pendiente' &&
            consent.permissions.update &&
            signature?.permissions.create && (
              <button disabled={disabled} onClick={() => setEditing(row)}>
                Registrar aceptación o rechazo
              </button>
            )}
        </article>
      ))}
      {consent.permissions.create && (
        <button disabled={disabled} onClick={() => setEditing('new')}>
          Emitir consentimiento clínico
        </button>
      )}
      {editing && editorResource && (
        <RecordEditor
          api={editorApi}
          resource={editorResource}
          catalog={catalog}
          initialValues={{ decision: 'aceptado' }}
          title={
            editing === 'new'
              ? 'Emitir consentimiento clínico'
              : 'Registrar decisión con evidencia escaneada'
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setRefresh((v) => v + 1)
          }}
        />
      )}
    </section>
  )
}
