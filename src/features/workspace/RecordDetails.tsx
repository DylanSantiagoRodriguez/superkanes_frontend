import { useEffect, useState } from 'react'
import { display, label, rowLabel } from './model'
import type { Api, Field, Resource, Row } from './model'
import styles from './Workspace.module.css'

export function RecordDetails({
  api,
  resource,
  row
}: {
  api: Api
  resource: Resource
  row: Row
}) {
  return (
    <dl className={styles.details}>
      {resource.fields
        .filter(
          (field) =>
            field.name in row &&
            ![
              'id',
              'organizacion_id',
              'version',
              'foto_archivo_id',
              'documento'
            ].includes(field.name)
        )
        .map((field) => (
          <div key={field.name}>
            <dt>{label(field.name)}</dt>
            <dd>
              <DetailValue api={api} field={field} value={row[field.name]} />
            </dd>
          </div>
        ))}
    </dl>
  )
}

export function DetailValue({
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
