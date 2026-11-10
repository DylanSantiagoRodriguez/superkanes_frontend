import { useUnsavedGuard } from './use-unsaved-guard'
import { useEffect, useRef, useState } from 'react'
import type { Api, Row } from '../workspace/model'
import { errorMessage } from '../../shared/api/http'
const states: Record<string, string> = {
  solicitada: 'Solicitada',
  muestra_tomada: 'Muestra tomada',
  en_proceso: 'En proceso',
  resultado_disponible: 'Resultado disponible',
  revisada: 'Revisada',
  comunicada: 'Comunicación registrada',
  cancelada: 'Cancelada'
}
export function ClinicalLaboratory({
  api,
  attention,
  disabled
}: {
  api: Api
  attention: Row
  disabled: boolean
}) {
  const [permissions, setPermissions] = useState<Record<
      string,
      boolean
    > | null>(null),
    [rows, setRows] = useState<Row[] | null>(null)
  const [next, setNext] = useState<string | null>(null),
    [labs, setLabs] = useState<Row[]>([]),
    [labNext, setLabNext] = useState<string | null>(null)
  const [problem, setProblem] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<Row | 'new' | null>(null),
    [action, setAction] = useState(''),
    [values, setValues] = useState<Record<string, string>>({})
  const pending = useRef(false),
    submission = useRef<{ signature: string; key: string } | null>(null)
  useUnsavedGuard(
    selected !== null && Object.values(values).some((value) => value.trim()),
    () =>
      setProblem(
        'Guarda o cancela el formulario de laboratorio antes de salir.'
      )
  )
  useEffect(() => {
    let live = true
    api
      .labPermissions()
      .then((result) => {
        if (live) setPermissions(result)
      })
      .catch((cause) => {
        if (live) setProblem(errorMessage(cause))
      })
    return () => {
      live = false
    }
  }, [api])
  useEffect(() => {
    let live = true
    if (permissions?.read)
      api
        .labOrders(attention.id)
        .then((page) => {
          if (live) {
            setRows(page.data)
            setNext(page.page.next)
          }
        })
        .catch((cause) => {
          if (live) setProblem(errorMessage(cause))
        })
    if (permissions?.create)
      api
        .list('laboratorio', undefined, { activo: true })
        .then((page) => {
          if (live) {
            setLabs(page.data)
            setLabNext(page.page.next)
          }
        })
        .catch((cause) => {
          if (live) setProblem(errorMessage(cause))
        })
    return () => {
      live = false
    }
  }, [api, attention.id, permissions, refresh])
  async function more(laboratories = false) {
    const cursor = laboratories ? labNext : next
    if (!cursor || busy) return
    setBusy(true)
    try {
      const page = laboratories
        ? await api.list('laboratorio', cursor, { activo: true })
        : await api.labOrders(attention.id, cursor)
      if (laboratories) {
        setLabs((current) => [...current, ...page.data])
        setLabNext(page.page.next)
      } else {
        setRows((current) => [...(current ?? []), ...page.data])
        setNext(page.page.next)
      }
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || pending.current) return
    const body =
      selected === 'new'
        ? { ...values, atencion_id: attention.id }
        : { ...values, accion: action }
    const signature = JSON.stringify({ selected, body })
    if (submission.current?.signature !== signature)
      submission.current = { signature, key: crypto.randomUUID() }
    pending.current = true
    setBusy(true)
    setProblem('')
    try {
      if (selected === 'new') await api.labCreate(body, submission.current.key)
      else await api.labAdvance(selected, body, submission.current.key)
      setSelected(null)
      setValues({})
      setRefresh((v) => v + 1)
      setNotice('Registro de laboratorio guardado.')
    } catch (cause) {
      setProblem(errorMessage(cause))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  function begin(row: Row, operation: string) {
    setSelected(row)
    setAction(operation)
    setValues({})
    setNotice('')
    setProblem('')
  }
  if (permissions && !permissions.read && !permissions.create) return null
  const field =
    action === 'muestra'
      ? 'muestra'
      : action === 'resultado'
        ? 'resultado'
        : action === 'revisar'
          ? 'interpretacion'
          : action === 'comunicar'
            ? 'comunicacion'
            : 'motivo_cancelacion'
  return (
    <section aria-label="Laboratorio de la consulta">
      <h3>Exámenes de laboratorio</h3>
      {problem && <p role="alert">{problem}</p>}
      {notice && <p role="status">{notice}</p>}
      {!permissions || (permissions.read && !rows) ? (
        <p role="status">Cargando laboratorio…</p>
      ) : rows?.length === 0 ? (
        <p>No hay órdenes en esta atención.</p>
      ) : null}
      {rows?.map((row) => (
        <article key={row.id}>
          <h4>
            {String(row.pruebas)} · {states[String(row.estado)]}
          </h4>
          <p>{String(row.indicacion ?? '')}</p>
          {row.muestra != null && <p>Muestra: {String(row.muestra)}</p>}
          {row.interpretacion != null && (
            <p>Interpretación: {String(row.interpretacion)}</p>
          )}
          {row.comunicacion != null && (
            <p>Contacto documentado: {String(row.comunicacion)}</p>
          )}
          {permissions?.update && (
            <div>
              {row.estado === 'solicitada' && (
                <button
                  disabled={disabled || busy || selected !== null}
                  onClick={() => begin(row, 'muestra')}
                >
                  Registrar muestra
                </button>
              )}
              {row.estado === 'muestra_tomada' && (
                <button
                  disabled={disabled || busy || selected !== null}
                  onClick={() => begin(row, 'procesar')}
                >
                  Registrar procesamiento
                </button>
              )}
              {[
                'en_proceso',
                'resultado_disponible',
                'revisada',
                'comunicada'
              ].includes(String(row.estado)) && (
                <button
                  disabled={disabled || busy || selected !== null}
                  onClick={() => begin(row, 'resultado')}
                >
                  {row.estado === 'en_proceso'
                    ? 'Registrar resultado'
                    : 'Corregir resultado'}
                </button>
              )}
              {row.estado === 'resultado_disponible' && (
                <button
                  disabled={disabled || busy || selected !== null}
                  onClick={() => begin(row, 'revisar')}
                >
                  Registrar interpretación
                </button>
              )}
              {row.estado === 'revisada' && (
                <button
                  disabled={disabled || busy || selected !== null}
                  onClick={() => begin(row, 'comunicar')}
                >
                  Documentar comunicación
                </button>
              )}
              {['solicitada', 'muestra_tomada', 'en_proceso'].includes(
                String(row.estado)
              ) && (
                <button
                  disabled={disabled || busy || selected !== null}
                  onClick={() => begin(row, 'cancelar')}
                >
                  Cancelar orden con motivo
                </button>
              )}
            </div>
          )}
          <details>
            <summary>Resultados y evolución de la orden</summary>
            {((row.resultados ?? []) as Row[]).map((result) => (
              <article key={result.id}>
                <strong>
                  Resultado {String(result.numero)} ·{' '}
                  {new Date(String(result.creado_en)).toLocaleString('es-CO')}
                </strong>
                <p>{String(result.resultado)}</p>
                {result.motivo_correccion != null && (
                  <p>Corrección: {String(result.motivo_correccion)}</p>
                )}
              </article>
            ))}
            {((row.eventos ?? []) as Row[]).map((event) => {
              const previous = (event.datos as { anterior: Row }).anterior
              return previous.interpretacion || previous.comunicacion ? (
                <p key={event.id}>
                  Versión anterior · {String(previous.interpretacion ?? '')} ·{' '}
                  {String(previous.comunicacion ?? '')}
                </p>
              ) : null
            })}
          </details>
        </article>
      ))}
      {next && (
        <button disabled={busy} onClick={() => void more()}>
          Cargar más órdenes
        </button>
      )}
      {permissions?.create && (
        <button
          disabled={disabled || busy || selected !== null}
          onClick={() => {
            setSelected('new')
            setValues({})
            setProblem('')
          }}
        >
          Solicitar exámenes
        </button>
      )}
      {selected && (
        <form onSubmit={(event) => void submit(event)}>
          <fieldset disabled={disabled || busy}>
            <legend>
              {selected === 'new'
                ? 'Nueva orden de laboratorio'
                : action === 'procesar'
                  ? 'Confirmar inicio del procesamiento'
                  : 'Registrar evolución de laboratorio'}
            </legend>
            {selected === 'new' ? (
              <>
                <label>
                  Laboratorio
                  <select
                    aria-label="Laboratorio"
                    required
                    value={values.laboratorio_id ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, laboratorio_id: e.target.value })
                    }
                  >
                    <option value="">Selecciona un laboratorio</option>
                    {labs.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        {String(lab.nombre)}
                      </option>
                    ))}
                  </select>
                </label>
                {labNext && (
                  <button type="button" onClick={() => void more(true)}>
                    Cargar más laboratorios
                  </button>
                )}
                <label>
                  Exámenes solicitados
                  <textarea
                    aria-label="Exámenes solicitados"
                    required
                    maxLength={4000}
                    value={values.pruebas ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, pruebas: e.target.value })
                    }
                  />
                </label>
                <label>
                  Indicación clínica
                  <textarea
                    aria-label="Indicación clínica"
                    maxLength={20000}
                    value={values.indicacion ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, indicacion: e.target.value })
                    }
                  />
                </label>
              </>
            ) : action !== 'procesar' ? (
              <>
                <label>
                  {field === 'comunicacion'
                    ? 'Contacto realizado e indicaciones comunicadas'
                    : field === 'interpretacion'
                      ? 'Interpretación del profesional'
                      : field === 'motivo_cancelacion'
                        ? 'Motivo de cancelación'
                        : field === 'muestra'
                          ? 'Identificación y tipo de muestra'
                          : 'Resultado informado'}
                  <textarea
                    required
                    maxLength={20000}
                    value={values[field] ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, [field]: e.target.value })
                    }
                  />
                </label>
                {action === 'resultado' && selected.estado !== 'en_proceso' && (
                  <label>
                    Motivo de corrección del resultado
                    <textarea
                      required
                      maxLength={20000}
                      value={values.motivo_correccion ?? ''}
                      onChange={(e) =>
                        setValues({
                          ...values,
                          motivo_correccion: e.target.value
                        })
                      }
                    />
                  </label>
                )}
                {action === 'comunicar' && (
                  <p>
                    Registra un contacto que ya realizaste. Este formulario no
                    envía mensajes.
                  </p>
                )}
              </>
            ) : null}
            <button>Guardar laboratorio</button>
            <button type="button" onClick={() => setSelected(null)}>
              Volver sin guardar laboratorio
            </button>
          </fieldset>
        </form>
      )}
    </section>
  )
}
