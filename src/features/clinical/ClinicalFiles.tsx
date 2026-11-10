import { downloadClinical } from './clinical-files-api'
import { useRef, useState } from 'react'
import { errorMessage } from '../../shared/api/http'
import type { Api, Resource, Row } from '../workspace/model'
export function ClinicalFiles({
  api,
  revision,
  catalog,
  disabled,
  onSaved
}: {
  api: Api
  revision: Row
  catalog: Resource[]
  disabled: boolean
  onSaved: () => void
}) {
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [problem, setProblem] = useState('')
  const key = useRef(''),
    pending = useRef(false),
    reportKeys = useRef<Record<string, string>>({})
  const canUpload = ['archivo', 'adjunto_clinico'].every(
    (name) => catalog.find((r) => r.name === name)?.permissions.create
  )
  async function upload() {
    if (!file || pending.current) return
    pending.current = true
    setBusy(true)
    setProblem('')
    try {
      await api.uploadClinical(revision, file, key.current)
      setFile(null)
      onSaved()
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  async function report(type: string) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setProblem('')
    const signature = `${revision.id}:${type}`
    reportKeys.current[signature] ??= crypto.randomUUID()
    try {
      const result = await api.clinicalReport(
        revision.id,
        type,
        reportKeys.current[signature]
      )
      await downloadClinical(
        api,
        result.archivo.id,
        String(result.archivo.nombre_original)
      )
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <section aria-label="Documentos de la consulta">
      <h3>Documentos de la consulta</h3>
      {problem && <p role="alert">{problem}</p>}
      {revision.estado === 'borrador' && canUpload && (
        <>
          <label>
            Adjuntar informe o imagen
            <input
              disabled={disabled || busy}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const selected = e.target.files?.[0]
                e.target.value = ''
                if (selected) {
                  if (selected.size > 10 * 1024 * 1024) {
                    setProblem('El archivo supera 10 MB.')
                    return
                  }
                  setFile(selected)
                  key.current = crypto.randomUUID()
                  setProblem('')
                }
              }}
            />
          </label>
          <p>
            PDF o imágenes JPEG, PNG y WebP de hasta 10 MB. Se conserva el
            archivo original validado.
          </p>
          {file && (
            <p>
              {file.name}{' '}
              <button disabled={disabled || busy} onClick={() => void upload()}>
                Subir documento
              </button>
            </p>
          )}
          {disabled && <p>Guarda las notas antes de adjuntar documentos.</p>}
        </>
      )}
      {revision.estado === 'cerrada' &&
        catalog.some((r) => r.name === 'reporte_emitido') && (
          <div>
            <button disabled={busy} onClick={() => void report('historia')}>
              Descargar historia de consulta PDF
            </button>
            <button disabled={busy} onClick={() => void report('receta')}>
              Descargar receta PDF
            </button>
            <button disabled={busy} onClick={() => void report('indicaciones')}>
              Descargar indicaciones PDF
            </button>
          </div>
        )}
      {busy && <p role="status">Procesando documento…</p>}
    </section>
  )
}
