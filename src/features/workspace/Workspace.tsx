import { Agenda } from '../clinical/Agenda'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '../auth/api/auth'
import { requestJson, errorMessage } from '../../shared/api/http'
import { AppShell } from '../../shared/layout/AppShell'
import { createApi, groups, label } from './model'
import type { Profile, Resource, Api, Page } from './model'
import { ResourceBrowser } from './ResourceBrowser'
import styles from './Workspace.module.css'

export function Workspace({
  session,
  onLogout,
  logoutBusy,
  error,
  onExpired
}: {
  session: Session
  onLogout: () => void
  logoutBusy: boolean
  error: string
  onExpired: () => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState('')
  const [problem, setProblem] = useState('')
  const [retry, setRetry] = useState(0)
  const expiredRef = useRef(onExpired)
  useEffect(() => {
    expiredRef.current = onExpired
  }, [onExpired])
  const expired = useCallback(() => expiredRef.current(), [])
  useEffect(() => {
    let live = true
    requestJson('/auth/me', { token: session.accessToken })
      .then((result) => {
        if (!live) return
        const me = result as Profile
        setProfile(me)
        setProblem('')
        setOrganization((current) =>
          me.organizations.some((org) => org.id === current)
            ? current
            : (me.organizations[0]?.id ?? '')
        )
      })
      .catch((cause) => {
        if (live) setProblem(errorMessage(cause))
      })
    return () => {
      live = false
    }
  }, [session.accessToken, retry])
  if (!profile)
    return (
      <main className="session-loading">
        {problem ? (
          <>
            <p role="alert">{problem}</p>
            <button onClick={() => setRetry((value) => value + 1)}>
              Reintentar
            </button>
          </>
        ) : (
          <p role="status">Cargando tu organización…</p>
        )}
        <button onClick={onLogout}>Cerrar sesión</button>
      </main>
    )
  const selector = (
    <label className={styles.orgLabel}>
      Organización
      <select
        aria-label="Organización"
        value={organization}
        onChange={(event) => { if (document.dispatchEvent(new Event('superkanes:before-navigation', { cancelable: true }))) setOrganization(event.target.value) }}
      >
        {profile.organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.nombre}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <OrganizationWorkspace
      key={organization}
      session={session}
      organization={organization}
      selector={selector}
      userName={profile.nombre}
      onLogout={() => { if (document.dispatchEvent(new Event('superkanes:before-navigation', { cancelable: true }))) onLogout() }}
      logoutBusy={logoutBusy}
      error={error || problem}
      onExpired={expired}
    />
  )
}
function OrganizationWorkspace({
  session,
  organization,
  selector,
  userName,
  onLogout,
  logoutBusy,
  error,
  onExpired
}: {
  session: Session
  organization: string
  selector: React.ReactNode
  userName: string
  onLogout: () => void
  logoutBusy: boolean
  error: string
  onExpired: () => void
}) {
  const api = useMemo(
    () => createApi(session.accessToken, organization, onExpired),
    [session.accessToken, organization, onExpired]
  )
  const [resources, setResources] = useState<Resource[]>([])
  const [active, setActive] = useState('overview')
  const [selected, setSelected] = useState('')
  const [problem, setProblem] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [retry, setRetry] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let live = true
    if (!organization) return
    api
      .catalog()
      .then((result) => {
        if (live) {
          setResources(result)
          setProblem('')
        }
      })
      .catch((cause) => {
        if (live) setProblem(errorMessage(cause))
      })
      .finally(() => {
        if (live) setLoaded(true)
      })
    return () => {
      live = false
    }
  }, [api, organization, retry])
  useEffect(() => {
    heading.current?.focus()
  }, [active])
  const available = groups.filter(
    (group) =>
      group.id === 'overview' ||
      group.resources.some((name) => resources.some((r) => r.name === name))
  )
  const group = available.find((item) => item.id === active) ?? available[0]
  const options = group.resources.flatMap((name) => {
    const resource = resources.find((r) => r.name === name)
    return resource ? [resource] : []
  })
  const resource = options.find((r) => r.name === selected) ?? options[0]
  function navigate(id: string, name = '') {
    if (!document.dispatchEvent(new Event('superkanes:before-navigation', { cancelable: true }))) return
    setActive(id)
    setSelected(name)
  }
  return (
    <AppShell
      items={available}
      active={group.id}
      onNavigate={navigate}
      onLogout={() => { if (document.dispatchEvent(new Event('superkanes:before-navigation', { cancelable: true }))) onLogout() }}
      logoutBusy={logoutBusy}
      organizationControl={selector}
      userName={userName}
    >
      <div className={styles.heading}>
        <p className={styles.eyebrow}>TU CLÍNICA, CONECTADA</p>
        <h1 ref={heading} tabIndex={-1}>
          {group.label}
        </h1>
        <p>
          {group.id === 'overview'
            ? 'Información de tu organización y accesos a cada área de atención.'
            : 'Consulta y gestiona los registros de tu organización.'}
        </p>
      </div>
      {(error || problem) && (
        <div className={styles.error} role="alert">
          {error || problem}
          {problem && (
            <button onClick={() => setRetry((value) => value + 1)}>
              Reintentar
            </button>
          )}
        </div>
      )}
      {!organization ? (
        <p>No tienes una organización activa. Contacta al administrador.</p>
      ) : !loaded ? (
        <p role="status">Cargando permisos y módulos…</p>
      ) : (
        !problem &&
        (group.id === 'overview' ? (
          <Overview api={api} resources={resources} navigate={navigate} />
        ) : resource ? (
          <>
            <label className={styles.resourceSelect}>
              Sección
              <select
                aria-label="Sección"
                value={resource.name}
                onChange={(event) => { if (document.dispatchEvent(new Event('superkanes:before-navigation', { cancelable: true }))) setSelected(event.target.value) }}
              >
                {options.map((r) => (
                  <option key={r.name} value={r.name}>
                    {label(r.name)}
                  </option>
                ))}
              </select>
            </label>
            {resource.name === 'cita' ? <Agenda api={api} catalog={resources} /> : <ResourceBrowser
              key={resource.name}
              api={api}
              resource={resource}
              catalog={resources}
            />}
          </>
        ) : (
          <p>No tienes acceso a los registros de esta sección.</p>
        ))
      )}
      <footer className={styles.footer}>
        Superkanes · Más tiempo para cuidar.
      </footer>
    </AppShell>
  )
}
function Overview({
  api,
  resources,
  navigate
}: {
  api: Api
  resources: Resource[]
  navigate: (id: string, name?: string) => void
}) {
  const names = ['cita', 'mascota', 'tutor', 'pendiente_vacunal'].filter(
    (name) => resources.some((r) => r.name === name)
  )
  const signature = names.join(',')
  const [summaries, setSummaries] = useState<Record<string, Page | string>>({})
  useEffect(() => {
    const controller = new AbortController()
    for (const name of signature.split(',').filter(Boolean)) {
      api
        .list(name, undefined, undefined, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted)
            setSummaries((current) => ({ ...current, [name]: result }))
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setSummaries((current) => ({
              ...current,
              [name]: errorMessage(cause)
            }))
        })
    }
    return () => controller.abort()
  }, [api, signature])
  return (
    <>
      <div className={styles.summaryGrid}>
        {names.map((name) => {
          const result = summaries[name]
          const group = groups.find((g) => g.resources.includes(name))!
          return (
            <button
              className={styles.summary}
              key={name}
              onClick={() => navigate(group.id, name)}
            >
              <span>{label(name)}</span>
              <strong>
                {!result
                  ? '…'
                  : typeof result === 'string'
                    ? '—'
                    : `${result.data.length}${result.page.next ? '+' : ''}`}
              </strong>
              <small>
                {typeof result === 'string'
                  ? result
                  : result?.page.next
                    ? 'Hay más registros. Abre la lista para consultarlos.'
                    : 'Registros accesibles en tu organización'}
              </small>
            </button>
          )
        })}
      </div>
      <div className={styles.moduleGrid}>
        {groups
          .filter(
            (g) =>
              g.id !== 'overview' &&
              g.resources.some((name) => resources.some((r) => r.name === name))
          )
          .map((group) => (
            <button key={group.id} onClick={() => navigate(group.id)}>
              <span aria-hidden="true">{group.symbol}</span>
              <strong>{group.label}</strong>
              <small>Consultar registros →</small>
            </button>
          ))}
      </div>
    </>
  )
}
