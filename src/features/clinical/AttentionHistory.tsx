import { useEffect, useState } from 'react'
import type { Api, Resource, Row } from '../workspace/model'
import { errorMessage } from '../../shared/api/http'
import { RecordEditor } from '../workspace/RecordEditor'
import { ClinicalDocument } from './ClinicalDocument'
import type { JSONContent } from '@tiptap/react'
import styles from '../workspace/Workspace.module.css'

export function AttentionHistory({ api, attention, catalog }: { api: Api; attention: Row; catalog: Resource[] }) {
  const resource = catalog.find(item => item.name === 'revision_clinica')
  const [revisions, setRevisions] = useState<Row[] | null>(null)
  const [problem, setProblem] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [visible, setVisible] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    if (!resource) return
    async function load() {
      try {
        const rows: Row[] = []
        let cursor: string | undefined
        do {
          const page = await api.list('revision_clinica', cursor, { atencion_id: attention.id })
          if (!live) return
          rows.push(...page.data)
          cursor = page.page.next ?? undefined
        } while (cursor)
        setRevisions(rows.sort((a, b) => Number(b.numero) - Number(a.numero)))
        setProblem('')
      } catch (cause) { if (live) setProblem(errorMessage(cause)) }
    }
    void load()
    return () => { live = false }
  }, [api, attention.id, resource, refresh])
  if (!resource) return <p>No tienes permiso para consultar la historia de esta atención.</p>
  return <section aria-label="Historias de esta atención">
    <h3>Historia clínica</h3>
    {problem && <p role="alert" className={styles.error}>{problem}<button onClick={() => setRefresh(value => value + 1)}>Reintentar</button></p>}
    {!revisions && !problem && <p role="status">Cargando historia…</p>}
    {revisions?.length === 0 && <p>Todavía no hay una historia escrita para esta atención.</p>}
    {revisions?.length === 0 && resource.permissions.create && attention.estado === 'abierta' && <button type="button" onClick={() => setEditing('new')}>Escribir historia clínica</button>}
    {revisions?.map(revision => <div key={revision.id}>
      <p><strong>Revisión {String(revision.numero)} · {revision.estado === 'cerrada' ? 'Cerrada' : 'Borrador'}</strong> — {String(revision.motivo_consulta)}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => setVisible(visible === revision.id ? null : revision.id)}>{visible === revision.id ? 'Ocultar documento' : 'Leer historia'}</button>
        {revision.estado === 'borrador' && resource.permissions.update && <button type="button" onClick={() => setEditing(revision)}>Editar historia</button>}
      </div>
      {visible === revision.id && (revision.documento ? <ClinicalDocument key={String(revision.version)} readOnly value={revision.documento as JSONContent} /> : <p>Esta revisión no tiene documento con formato. Sus campos clínicos se conservan en Revisiones clínicas.</p>)}
    </div>)}
    {editing && <RecordEditor api={api} resource={resource} catalog={catalog} row={editing === 'new' ? undefined : editing}
      initialValues={{ atencion_id: attention.id, numero: 1 }} title={editing === 'new' ? 'Escribir historia clínica' : 'Editar historia clínica'}
      onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setRefresh(value => value + 1) }} />}
  </section>
}
