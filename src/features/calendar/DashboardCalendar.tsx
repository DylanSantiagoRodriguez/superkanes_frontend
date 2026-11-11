import { useEffect, useRef, useState } from 'react'
import type { Api, Resource, Row } from '../workspace/model'
import { label } from '../workspace/model'
import { RecordEditor } from '../workspace/RecordEditor'
import { PatientChart } from '../clinical/PatientChart'
import { AppIcon } from '../../shared/ui/AppIcon'
import { errorMessage } from '../../shared/api/http'
import { calendarTypes, dateFor, dayKey, monthDays, onDay } from './calendar'
import type { CalendarEvent } from './calendar'
import styles from './DashboardCalendar.module.css'

const humanDay = (day: string) =>
  dateFor(day).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
const time = (value: string) =>
  new Date(value).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  })
export function DashboardCalendar({
  api,
  catalog,
  onChange
}: {
  api: Api
  catalog: Resource[]
  onChange: () => void
}) {
  const today = dayKey(new Date())
  const [month, setMonth] = useState(() => today.slice(0, 7) + '-01')
  const [selected, setSelected] = useState(today)
  const [filter, setFilter] = useState('')
  const [loaded, setLoaded] = useState<{
    key: string
    events: CalendarEvent[]
    unavailable: string[]
    problem: string
  } | null>(null)
  const [problem, setProblem] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<{
    resource: Resource
    row?: Row
  } | null>(null)
  const [opening, setOpening] = useState(false)
  const [patient, setPatient] = useState<string | null>(null)
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  const days = monthDays(month)
  const from = days[0],
    to = days[41]
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const loadKey = `${from}:${to}:${timeZone}:${refresh}`
  const loading = loaded?.key !== loadKey
  const events = loading ? [] : loaded.events
  const unavailable = loading ? [] : loaded.unavailable
  const loadProblem = loading ? '' : loaded.problem
  const displayedProblem = problem || loadProblem
  const appointment = catalog.find((r) => r.name === 'cita')
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      const all: CalendarEvent[] = []
      let after: string | null = null
      let missing: string[] = []
      do {
        const page = await api.calendar(
          { from, to, timeZone, ...(after ? { after } : {}) },
          controller.signal
        )
        all.push(...page.data)
        after = page.page.next
        missing = page.unavailable
      } while (after && !controller.signal.aborted)
      if (!controller.signal.aborted)
        setLoaded({
          key: loadKey,
          events: all,
          unavailable: missing,
          problem: ''
        })
    }
    void load().catch((cause) => {
      if (!controller.signal.aborted)
        setLoaded({
          key: loadKey,
          events: [],
          unavailable: [],
          problem: errorMessage(cause)
        })
    })
    return () => controller.abort()
  }, [api, from, to, timeZone, loadKey])
  function moveMonth(offset: number) {
    const date = dateFor(month)
    date.setMonth(date.getMonth() + offset)
    const next = dayKey(date)
    setMonth(next)
    setSelected(next)
  }
  function refreshCalendar() {
    setProblem('')
    setRefresh((v) => v + 1)
    onChange()
  }
  async function edit(event: CalendarEvent) {
    const resource = catalog.find((r) => r.name === event.resource)
    if (!resource?.permissions.update || opening) return
    setOpening(true)
    setProblem('')
    try {
      const row = await api.get(resource.name, event.id)
      if (live.current) setEditing({ resource, row })
    } catch (cause) {
      if (live.current) setProblem(errorMessage(cause))
    } finally {
      if (live.current) setOpening(false)
    }
  }
  const visible = events.filter((event) => !filter || event.resource === filter)
  const byDay = new Map(
    days.map((day) => [day, visible.filter((event) => onDay(event, day))])
  )
  const dayEvents = byDay.get(selected) ?? []
  const monthlyCount = visible.filter((event) =>
    days.some((day) => day.startsWith(month.slice(0, 7)) && onDay(event, day))
  ).length
  if (patient)
    return (
      <PatientChart
        api={api}
        catalog={catalog}
        patientId={patient}
        onBack={() => {
          setPatient(null)
          refreshCalendar()
        }}
      />
    )
  return (
    <section className={styles.calendar} aria-label="Calendario de actividades">
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.titleIcon}>
            <AppIcon name="agenda" size={25} />
          </span>
          <div>
            <h2>Tu calendario</h2>
            <p>Citas, cuidados y próximos pendientes en un solo lugar.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={refreshCalendar} disabled={loading}>
            Actualizar
          </button>
          {appointment?.permissions.create && (
            <button
              type="button"
              className={styles.primary}
              onClick={() => setEditing({ resource: appointment })}
            >
              + Nueva cita
            </button>
          )}
        </div>
      </header>
      <div className={styles.toolbar}>
        <div className={styles.monthNavigation}>
          <button aria-label="Mes anterior" onClick={() => moveMonth(-1)}>
            ‹
          </button>
          <h3 aria-live="polite">
            {dateFor(month).toLocaleDateString('es-CO', {
              month: 'long',
              year: 'numeric'
            })}
          </h3>
          <button aria-label="Mes siguiente" onClick={() => moveMonth(1)}>
            ›
          </button>
          <button
            onClick={() => {
              setMonth(today.slice(0, 7) + '-01')
              setSelected(today)
            }}
          >
            Hoy
          </button>
        </div>
        <label className={styles.filter}>
          Mostrar
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Tipo de actividad"
          >
            <option value="">Todas las actividades</option>
            {Object.entries(calendarTypes)
              .filter(([name]) => catalog.some((r) => r.name === name))
              .map(([name, type]) => (
                <option key={name} value={name}>
                  {type.label}
                </option>
              ))}
          </select>
        </label>
      </div>
      {displayedProblem && (
        <div className={styles.problem} role="alert">
          {displayedProblem}{' '}
          <button onClick={refreshCalendar}>Reintentar</button>
        </div>
      )}
      <div className={styles.layout}>
        <div className={styles.month} aria-busy={loading}>
          <div className={styles.weekdays} aria-hidden="true">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div
            className={styles.grid}
            role="group"
            aria-label="Días del calendario"
          >
            {days.map((day) => {
              const items = byDay.get(day) ?? []
              return (
                <button
                  key={day}
                  type="button"
                  data-day={day}
                  aria-pressed={day === selected}
                  aria-current={day === today ? 'date' : undefined}
                  aria-label={`${humanDay(day)}, ${items.length} actividades`}
                  className={`${styles.day} ${day === selected ? styles.selected : ''} ${day === today ? styles.today : ''} ${!day.startsWith(month.slice(0, 7)) ? styles.outside : ''}`}
                  onClick={() => setSelected(day)}
                  onKeyDown={(e) => {
                    const offset = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7
                    }[e.key]
                    if (!offset) return
                    e.preventDefault()
                    const index = days.indexOf(day) + offset
                    if (days[index]) {
                      setSelected(days[index])
                      e.currentTarget.parentElement
                        ?.querySelector<HTMLButtonElement>(
                          `[data-day="${days[index]}"]`
                        )
                        ?.focus()
                    }
                  }}
                >
                  <span className={styles.dayNumber}>
                    {Number(day.slice(-2))}
                  </span>
                  <span className={styles.previews} aria-hidden="true">
                    {items.slice(0, 2).map((event) => (
                      <span
                        key={`${event.resource}:${event.id}`}
                        className={styles.preview}
                        data-type={event.resource}
                      >
                        <span className={styles.dot} />
                        {event.petName ?? event.title}
                      </span>
                    ))}
                    {items.length > 2 && <small>+{items.length - 2} más</small>}
                  </span>
                  {items.length > 0 && (
                    <span className={styles.mobileCount} aria-hidden="true">
                      {items.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className={styles.legend}>
            {Object.entries(calendarTypes)
              .filter(([name]) => catalog.some((r) => r.name === name))
              .map(([name, type]) => (
                <span key={name} data-type={name}>
                  <i className={styles.dot} />
                  {type.label}
                </span>
              ))}
          </div>
          <p className={styles.note} role="status">
            {loading
              ? 'Cargando actividades…'
              : displayedProblem
                ? 'No se pudo cargar el calendario.'
                : `${monthlyCount} actividades este mes · Zona horaria: ${timeZone}`}
          </p>
          {unavailable.length > 0 && (
            <p className={styles.note}>
              Se muestran las actividades disponibles para tus permisos.
            </p>
          )}
        </div>
        <aside className={styles.agenda} aria-label="Actividades del día">
          <div className={styles.agendaHeading}>
            <span>
              {selected === today ? 'TU DÍA, DE UN VISTAZO' : 'AGENDA DEL DÍA'}
            </span>
            <h3>{humanDay(selected)}</h3>
            <p>
              {loading
                ? 'Cargando…'
                : `${dayEvents.length} ${dayEvents.length === 1 ? 'actividad' : 'actividades'}`}
            </p>
          </div>
          {!loading && !displayedProblem && !dayEvents.length && (
            <div className={styles.empty}>
              <AppIcon name="agenda" size={32} />
              <h4>Un espacio libre para cuidar</h4>
              <p>
                No hay actividades {filter ? 'de este tipo ' : ''}para este día.
              </p>
              {appointment?.permissions.create && (
                <button onClick={() => setEditing({ resource: appointment })}>
                  Programar una cita
                </button>
              )}
            </div>
          )}
          <ol className={styles.events}>
            {dayEvents.map((event) => (
              <li
                key={`${event.resource}:${event.id}`}
                className={styles.event}
                data-type={event.resource}
              >
                <div className={styles.eventTime}>
                  <AppIcon
                    name={calendarTypes[event.resource].icon}
                    size={17}
                  />
                  <time dateTime={event.start}>
                    {event.allDay
                      ? 'Sin hora asignada'
                      : `${time(event.start)}${event.end ? ` – ${time(event.end)}` : ''}`}
                  </time>
                </div>
                <h4>{event.petName ?? event.title}</h4>
                {event.petName && (
                  <p className={styles.eventTitle}>{event.title}</p>
                )}
                {event.detail && (
                  <p className={styles.detail}>{event.detail}</p>
                )}
                <span
                  className={styles.status}
                  data-cancelled={event.status.startsWith('cancel')}
                >
                  {event.status.replaceAll('_', ' ')}
                </span>
                <div className={styles.eventActions}>
                  {event.petId && event.petName && (
                    <button onClick={() => setPatient(event.petId)}>
                      Ver mascota <span aria-hidden="true">↗</span>
                    </button>
                  )}
                  {catalog.find((r) => r.name === event.resource)?.permissions
                    .update && (
                    <button disabled={opening} onClick={() => void edit(event)}>
                      Editar
                      <span className={styles.srOnly}>
                        {' '}
                        {event.petName ?? event.title}
                      </span>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      {editing && (
        <RecordEditor
          api={api}
          resource={editing.resource}
          catalog={catalog}
          row={editing.row}
          initialValues={{
            inicio: `${selected}T09:00:00`,
            fin: `${selected}T09:30:00`,
            tipo: 'clinica'
          }}
          title={
            editing.row
              ? `Editar · ${label(editing.resource.name)}`
              : 'Programar cita'
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refreshCalendar()
          }}
        />
      )}
    </section>
  )
}
