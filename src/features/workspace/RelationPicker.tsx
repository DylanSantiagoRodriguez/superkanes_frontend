import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/api/http'
import { rowLabel } from './model'
import type { Api, Row } from './model'
import styles from './Workspace.module.css'

function optionLabel(row: Row, target: string) {
  const detail = target === 'mascota' ? row.codigo : row.numero_documento ?? row.email
  return `${rowLabel(row)}${detail ? ` · ${String(detail)}` : ''}`
}

/** A native, keyboard-accessible selector backed by paginated server search. */
export function RelationPicker({ api, target, id, name, value, required, onChange, onCreate, linkedTo }: {
  linkedTo?: string
  api: Api
  target: string
  id: string
  name: string
  value: string
  required: boolean
  onChange: (id: string, row?: Row) => void
  onCreate?: () => void
}) {
  const pet = target === 'mascota'
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [paging, setPaging] = useState(false)
  const [problem, setProblem] = useState('')
  const [selectionError, setSelectionError] = useState<{ id: string; message: string }>()
  const selectionProblem = selectionError?.id === value ? selectionError.message : ''
  const [selected, setSelected] = useState<Row>()
  const [retry, setRetry] = useState(0)
  const request = useRef<{ controller: AbortController; paging: boolean } | null>(null)
  const cache = useRef(new Map<string, Row>())
  useEffect(() => {
    const active = { controller: new AbortController(), paging: false }
    request.current = active
    const timer = window.setTimeout(() => {
      setLoading(true)
      setPaging(false)
      setRows([])
      setNext(null)
      setProblem('')
      api.searchRelations(target, query.trim(), undefined, active.controller.signal, linkedTo)
        .then(page => {
          if (active.controller.signal.aborted) return
          page.data.forEach(row => cache.current.set(row.id, row))
          setRows(page.data)
          setNext(page.page.next)
        })
        .catch(error => { if (!active.controller.signal.aborted) setProblem(errorMessage(error)) })
        .finally(() => { if (!active.controller.signal.aborted) setLoading(false) })
    }, query ? 250 : 0)
    return () => { window.clearTimeout(timer); active.controller.abort() }
  }, [api, target, query, retry, linkedTo])
  useEffect(() => {
    let live = true
    if (value) {
      api.get(target, value).then(row => {
        if (live) { cache.current.set(row.id, row); setSelected(row); setSelectionError(undefined) }
      }).catch(error => { if (live) setSelectionError({ id: value, message: errorMessage(error) }) })
    }
    return () => { live = false }
  }, [api, target, value, retry])
  async function more() {
    const active = request.current
    if (!next || !active || active.paging || active.controller.signal.aborted) return
    active.paging = true
    setPaging(true)
    setProblem('')
    try {
      const page = await api.searchRelations(target, query.trim(), next, active.controller.signal, linkedTo)
      if (active.controller.signal.aborted) return
      page.data.forEach(row => cache.current.set(row.id, row))
      setRows(current => [...new Map([...current, ...page.data].map(row => [row.id, row])).values()])
      setNext(page.page.next)
    } catch (error) {
      if (!active.controller.signal.aborted) setProblem(errorMessage(error))
    } finally {
      active.paging = false
      if (!active.controller.signal.aborted) setPaging(false)
    }
  }
  return <div className={styles.relationPicker}>
    <label htmlFor={`${id}-search`}>{pet ? 'Buscar mascota' : 'Buscar tutor'}</label>
    <input id={`${id}-search`} type="search" maxLength={120} value={query}
      placeholder={pet ? 'Nombre, código o microchip' : 'Nombre, documento o correo'}
      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
      autoComplete="off" onChange={e => { setQuery(e.target.value); setLoading(true); setRows([]); setNext(null); setProblem('') }}
      aria-controls={id} aria-describedby={`${id}-help`} />
    <select id={id} name={name} value={value} required={required}
      aria-busy={loading || paging} aria-describedby={`${id}-help`}
      onChange={e => {
        const chosen = cache.current.get(e.target.value)
        setSelected(chosen)
        onChange(e.target.value, chosen)
      }}>
      <option value="">{loading ? 'Buscando…' : 'Selecciona un registro'}</option>
      {value && !rows.some(row => row.id === value) && <option value={value}>
        {selected?.id === value ? optionLabel(selected, target) : 'Selección actual (consultando datos…)'}
      </option>}
      {rows.map(row => <option key={row.id} value={row.id}>{optionLabel(row, target)}</option>)}
    </select>
    <p id={`${id}-help`} className={styles.hint} aria-live="polite">
      {loading ? 'Buscando registros…' : !rows.length ? 'No hay coincidencias para esta búsqueda.' : `${rows.length} opciones${next ? ' · hay más resultados' : ''}.`}
      {' '}La búsqueda conserva tu selección hasta que elijas otra opción.
    </p>
    {(problem || selectionProblem) && <div className={styles.fieldError} role="alert">
      {problem || selectionProblem}{' '}
      <button type="button" onClick={() => setRetry(n => n + 1)}>Reintentar búsqueda</button>
    </div>}
    <div className={styles.relationActions}>
      {next && <button type="button" disabled={loading || paging} onClick={() => void more()}>
        {paging ? 'Cargando…' : 'Cargar más opciones'}
      </button>}
      {onCreate && <button type="button" onClick={onCreate}>{pet ? '+ Nueva mascota' : '+ Nuevo tutor'}</button>}
    </div>
  </div>
}
