import { useEffect, useRef, useState } from 'react'
import type { Api } from './model'
import { errorMessage } from '../../shared/api/http'
import styles from './Workspace.module.css'

export function PatientPhoto({ api, id, name }: { api: Api; id: string; name: string }) {
  const [result, setResult] = useState({ id: '', url: '', error: '' })
  const { url, error } = result.id === id ? result : { url: '', error: '' }
  useEffect(() => {
    let live = true
    let objectUrl = ''
    if (id) api.photo(id).then(blob => {
      if (live) { objectUrl = URL.createObjectURL(blob); setResult({ id, url: objectUrl, error: '' }) }
    }).catch(cause => { if (live) setResult({ id, url: '', error: errorMessage(cause) }) })
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [api, id])
  return <figure className={styles.patientPhoto}>
    {url ? <img src={url} alt={`Foto de ${name || 'paciente'}`} /> : <div className={styles.photoPlaceholder}>{id ? error || 'Cargando foto…' : 'Sin foto del paciente'}</div>}
    {name && <figcaption>{name}</figcaption>}
  </figure>
}

export function PatientPhotoInput({ inputId = 'patient-photo', api, value, name, onChange, onBusy }: { inputId?: string; api: Api; value: string; name: string; onChange: (id: string) => void; onBusy: (busy: boolean) => void }) {
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [candidate, setCandidate] = useState<File | null>(null)
  const key = useRef('')
  const pending = useRef(false)
  async function upload(file: File) {
    if (pending.current) return
    setProblem('')
    if (file.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProblem('Selecciona una imagen JPEG, PNG o WebP de hasta 10 MB.'); return
    }
    pending.current = true; setBusy(true); onBusy(true)
    try { const row = await api.uploadPhoto(file, key.current); onChange(row.id); setCandidate(null) }
    catch (cause) { setProblem(errorMessage(cause)) }
    finally { pending.current = false; setBusy(false); onBusy(false) }
  }
  return <div>
    <PatientPhoto api={api} id={value} name={name} />
    <label htmlFor={inputId}>Foto del paciente (JPEG, PNG o WebP, hasta 10 MB)</label>
    <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''
      if (file) { key.current = crypto.randomUUID(); setCandidate(file); void upload(file) }
    }} />
    {busy && <p role="status">Subiendo y validando foto…</p>}
    {value && !busy && <button type="button" onClick={() => onChange('')}>Quitar foto de esta ficha</button>}
    {problem && <p role="alert" className={styles.error}>{problem}</p>}
    {problem && candidate && <button type="button" disabled={busy} onClick={() => void upload(candidate)}>Reintentar carga</button>}
    <p className={styles.hint}>Guarda la ficha para confirmar la foto del paciente.</p>
  </div>
}
