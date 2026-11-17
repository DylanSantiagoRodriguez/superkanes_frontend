import { useState } from 'react'
import type { Api, Resource, Row } from '../workspace/model'
import { RecordEditor } from '../workspace/RecordEditor'
import { GroomingAdmission } from './GroomingAdmission'

/** Reception from the grooming workspace shares the same reservation and admission flow. */
export function GroomingEntry({ api, catalog, service, onClose, onSaved }: {
  api: Api
  catalog: Resource[]
  service: 'Baño' | 'Peluquería'
  onClose: (reserved: boolean) => void
  onSaved: (row: Row) => void
}) {
  const [appointment, setAppointment] = useState<Row | null>(null)
  const contract = catalog.find(r => r.name === 'cita')
  if (!contract?.permissions.create || !contract.permissions.update)
    return <div><p role="alert">Necesitas permisos para crear y actualizar citas para registrar el ingreso.</p><button onClick={() => onClose(false)}>Cerrar</button></div>
  if (appointment) return <GroomingAdmission api={api} appointment={appointment}
    onClose={() => onClose(true)} onSaved={result => onSaved(result.service)} />
  return <RecordEditor api={api} resource={contract} catalog={catalog}
    groomingService={service} title={`Nuevo ingreso · ${service}`}
    onClose={() => onClose(false)} onSaved={setAppointment} />
}
