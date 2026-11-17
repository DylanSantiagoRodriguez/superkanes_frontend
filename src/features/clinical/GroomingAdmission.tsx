import { useEffect, useRef, useState } from 'react'
import { ApiError, errorMessage } from '../../shared/api/http'
import type { Api, Row } from '../workspace/model'
import styles from '../workspace/Workspace.module.css'

export function GroomingAdmission({ api, appointment, onClose, onSaved }: {
  api: Api
  appointment: Row
  onClose: () => void
  onSaved: (result: { appointment: Row; service: Row }) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const key = useRef(crypto.randomUUID())
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const [conflict, setConflict] = useState(false)
  useEffect(() => { dialog.current?.showModal() }, [])
  async function save() {
    if (pending.current || conflict) return
    pending.current = true
    setBusy(true)
    setProblem('')
    try { onSaved(await api.groomingAdmission(appointment, key.current)) }
    catch (error) {
      setProblem(errorMessage(error))
      if (error instanceof ApiError && [409, 412].includes(error.status)) setConflict(true)
    } finally { pending.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="grooming-admission-title"
    onCancel={event => { event.preventDefault(); if (!pending.current) onClose() }}>
    <div className={styles.dialogHeader}>
      <h2 id="grooming-admission-title">Registrar ingreso · {String(appointment.notas ?? 'Peluquería')}</h2>
      <button type="button" disabled={busy} onClick={onClose}>Cerrar</button>
    </div>
    <p>{String(appointment.nombre_paciente ?? 'Mascota seleccionada')}</p>
    <h3>Consentimiento</h3>
    <label htmlFor="grooming-consent-template">Contenido del consentimiento</label>
    <textarea id="grooming-consent-template" value="" readOnly rows={6} aria-describedby="grooming-consent-status" />
    <p id="grooming-consent-status" className={styles.notice}>
      Pendiente de plantilla. El ingreso se guardará con el consentimiento pendiente, sin aceptación ni firma.
      El servicio no podrá comenzar hasta completar el consentimiento.
    </p>
    <p>Al guardar se registrará la hora actual de ingreso. El inicio, la finalización y la recogida se completan en Peluquería.</p>
    {problem && <p role="alert" className={styles.error}>{problem}</p>}
    {conflict && <p>Cierra este formulario y actualiza la agenda antes de volver a intentar.</p>}
    <div className={styles.actions}>
      <button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
      <button type="button" className={styles.primary} disabled={busy || conflict} onClick={() => void save()}>
        {busy ? 'Guardando…' : 'Guardar ingreso con hora actual'}
      </button>
    </div>
  </dialog>
}
