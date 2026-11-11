import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Api } from './model'
import type {
  ManagedUser,
  OrganizationOption,
  AccessInput
} from './user-management'
import { ApiError, errorMessage } from '../../shared/api/http'
import { useUnsavedGuard } from '../clinical/use-unsaved-guard'
import { AppIcon } from '../../shared/ui/AppIcon'
import styles from './UserManagement.module.css'

function message(error: unknown) {
  const codes: Record<string, string> = {
    USER_EMAIL_EXISTS:
      'Ese correo ya tiene una cuenta. Usa «Vincular usuario existente» para darle acceso a otra organización.',
    ROLE_ALREADY_CONFIGURED:
      'La organización ya tiene roles. Actualiza las organizaciones y elige uno existente.',
    ROLE_ORGANIZATION_MISMATCH:
      'El rol no pertenece a la organización seleccionada. Actualiza las opciones.',
    MEMBERSHIP_INACTIVE:
      'La membresía está inactiva. Reactívala desde Configuración antes de agregar permisos.',
    USER_NOT_ENABLED:
      'Esta cuenta está inactiva o todavía no tiene acceso de inicio de sesión.'
  }
  return error instanceof ApiError && error.code && codes[error.code]
    ? codes[error.code]
    : errorMessage(error)
}
export function UserManagement({
  api,
  currentUserId,
  onAccessChanged
}: {
  api: Api
  currentUserId: string
  onAccessChanged: () => void
}) {
  const [mode, setMode] = useState<'create' | 'link'>('create')
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState(''),
    [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [userPage, setUserPage] = useState<{
    query: string
    data: ManagedUser[]
    next: string | null
  } | null>(null)
  const [orgPage, setOrgPage] = useState<{
    key: string
    data: OrganizationOption[]
  } | null>(null)
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false),
    [moreBusy, setMoreBusy] = useState(false)
  const [problem, setProblem] = useState(''),
    [success, setSuccess] = useState('')
  const pending = useRef(false)
  const submission = useRef<{ body: string; key: string } | null>(null)
  const query = search.trim()
  const userId = mode === 'link' ? (selectedUser?.id ?? '') : ''
  const orgKey = `${mode}:${userId}:${refresh}`
  const organizations = orgPage?.key === orgKey ? orgPage.data : []
  const users = userPage?.query === query ? userPage.data : []
  const dirty = !!(name || email || password || Object.keys(selection).length)
  useUnsavedGuard(dirty || busy, () =>
    setProblem('Guarda o descarta los cambios antes de salir.')
  )
  useEffect(() => {
    if (mode !== 'link') return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api
        .manageUsers({ search: query }, controller.signal)
        .then((page) => {
          if (!controller.signal.aborted)
            setUserPage({ query, data: page.data, next: page.page.next })
        })
        .catch((error) => {
          if (!controller.signal.aborted) setProblem(message(error))
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [api, mode, query, refresh])
  useEffect(() => {
    if (mode === 'link' && !userId) return
    const controller = new AbortController()
    async function load() {
      const rows: OrganizationOption[] = []
      let after: string | null = null
      do {
        const page = await api.manageOrganizations(
          {
            ...(userId ? { usuario_id: userId } : {}),
            ...(after ? { after } : {})
          },
          controller.signal
        )
        rows.push(...page.data)
        after = page.page.next
      } while (after && !controller.signal.aborted)
      if (!controller.signal.aborted)
        setOrgPage({
          key: orgKey,
          data: rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
        })
    }
    void load().catch((error) => {
      if (!controller.signal.aborted) setProblem(message(error))
    })
    return () => controller.abort()
  }, [api, mode, userId, orgKey])
  function clear() {
    setName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setSelection({})
    setProblem('')
    submission.current = null
  }
  function switchMode(next: 'create' | 'link') {
    if (busy || next === mode) return
    if (dirty) {
      setProblem('Guarda o descarta los cambios antes de cambiar de opción.')
      return
    }
    clear()
    setMode(next)
    setSelectedUser(null)
    setSuccess('')
  }
  async function moreUsers() {
    if (!userPage?.next || moreBusy) return
    setMoreBusy(true)
    try {
      const page = await api.manageUsers({
        search: query,
        after: userPage.next
      })
      setUserPage((current) =>
        current?.query === query
          ? {
              query,
              data: [...current.data, ...page.data],
              next: page.page.next
            }
          : current
      )
    } catch (error) {
      setProblem(message(error))
    } finally {
      setMoreBusy(false)
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    const accesses: AccessInput[] = Object.entries(selection).map(
      ([id, role]) => ({
        organizacion_id: id,
        ...(role === 'new-admin'
          ? { crear_rol_administrador: true }
          : { rol_id: role })
      })
    )
    if (
      !accesses.length ||
      accesses.some((a) => !a.rol_id && !a.crear_rol_administrador)
    ) {
      setProblem('Selecciona al menos una organización y su rol.')
      return
    }
    if (mode === 'link' && !selectedUser) {
      setProblem('Selecciona el usuario que deseas vincular.')
      return
    }
    if (accesses.length > 20) {
      setProblem('Puedes vincular hasta 20 organizaciones por operación.')
      return
    }
    const body =
      mode === 'create'
        ? {
            nombre: name.trim(),
            email: email.trim(),
            password,
            organizaciones: accesses
          }
        : { organizaciones: accesses }
    const serialized = JSON.stringify([mode, userId, body])
    if (submission.current?.body !== serialized)
      submission.current = { body: serialized, key: crypto.randomUUID() }
    pending.current = true
    setBusy(true)
    setProblem('')
    setSuccess('')
    try {
      const result =
        mode === 'create'
          ? await api.manageCreateUser(
              {
                nombre: name.trim(),
                email: email.trim(),
                password,
                organizaciones: accesses
              },
              submission.current.key
            )
          : await api.manageLinkUser(
              selectedUser!.id,
              accesses,
              submission.current.key
            )
      clear()
      setMode('link')
      setSelectedUser(result.user)
      setSearch(result.user.email)
      setRefresh((v) => v + 1)
      setSuccess(
        `${result.user.nombre}: ${mode === 'create' ? 'cuenta creada y acceso guardado' : 'accesos vinculados'} en ${accesses.length} ${accesses.length === 1 ? 'organización' : 'organizaciones'}.`
      )
      onAccessChanged()
    } catch (error) {
      setProblem(message(error))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <section className={styles.panel} aria-label="Usuarios y accesos">
      <div className={styles.intro}>
        <span>
          <AppIcon name="guardian" size={26} />
        </span>
        <div>
          <h2>Una cuenta, varias organizaciones</h2>
          <p>
            Crea una cuenta o agrega acceso a otra clínica. Los roles se eligen
            por organización.
          </p>
        </div>
      </div>
      <div
        className={styles.modes}
        role="group"
        aria-label="Acción de usuarios"
      >
        <button
          type="button"
          aria-pressed={mode === 'create'}
          onClick={() => switchMode('create')}
          disabled={busy}
        >
          Crear usuario
        </button>
        <button
          type="button"
          aria-pressed={mode === 'link'}
          onClick={() => switchMode('link')}
          disabled={busy}
        >
          Vincular usuario existente
        </button>
      </div>
      {problem && (
        <p role="alert" className={styles.error}>
          {problem}
        </p>
      )}
      {success && (
        <p role="status" className={styles.success}>
          {success}
        </p>
      )}
      <form onSubmit={(e) => void save(e)} autoComplete="off">
        <fieldset disabled={busy} className={styles.form}>
          <legend>
            {mode === 'create'
              ? 'Datos de la nueva cuenta'
              : 'Selecciona una cuenta existente'}
          </legend>
          {mode === 'create' ? (
            <div className={styles.fields}>
              <label>
                Nombre completo
                <input
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label>
                Correo electrónico del usuario
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className={styles.password}>
                Contraseña inicial
                <div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={15}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <small>
                  Entre 15 y 128 caracteres. Comunica esta contraseña al usuario
                  por un canal privado.
                </small>
              </label>
            </div>
          ) : (
            <>
              <label className={styles.search}>
                Buscar por nombre o correo
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Escribe el nombre o correo"
                />
              </label>
              <div
                className={styles.users}
                role="group"
                aria-label="Usuarios disponibles"
              >
                {users.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    aria-pressed={selectedUser?.id === user.id}
                    disabled={!user.activo || !user.has_login}
                    onClick={() => {
                      if (dirty) {
                        setProblem(
                          'Descarta los cambios antes de seleccionar otra cuenta.'
                        )
                        return
                      }
                      setSelectedUser(user)
                      setSelection({})
                      setProblem('')
                      setSuccess('')
                    }}
                  >
                    <span className={styles.avatar}>
                      {user.nombre.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>
                        {user.nombre}
                        {user.id === currentUserId ? ' (tu cuenta)' : ''}
                      </strong>
                      <small>{user.email}</small>
                      {(!user.activo || !user.has_login) && (
                        <small>
                          {!user.activo
                            ? 'Cuenta inactiva'
                            : 'Sin acceso de inicio de sesión'}
                        </small>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              {userPage?.query !== query ? (
                <p className={styles.hint}>Buscando usuarios…</p>
              ) : (
                !users.length && (
                  <p className={styles.hint}>No hay usuarios que coincidan.</p>
                )
              )}
              {userPage?.query === query && userPage.next && (
                <button
                  type="button"
                  onClick={() => void moreUsers()}
                  disabled={moreBusy}
                >
                  Cargar más usuarios
                </button>
              )}
              {selectedUser && (
                <p className={styles.hint}>
                  Cuenta seleccionada: <strong>{selectedUser.nombre}</strong> ·{' '}
                  {selectedUser.email}. Mantiene su contraseña y sus accesos
                  actuales.
                </p>
              )}
            </>
          )}
        </fieldset>
        {(mode === 'create' || selectedUser) && (
          <fieldset disabled={busy} className={styles.form}>
            <legend>Organizaciones y roles</legend>
            <p className={styles.hint}>
              Marca una o varias organizaciones. El acceso seleccionado cubre
              todas sus sedes.
            </p>
            <div className={styles.organizations}>
              {organizations.map((org) => {
                const checked = Object.hasOwn(selection, org.id)
                const inactive = org.membership && !org.membership.activo
                return (
                  <div
                    className={styles.organization}
                    key={org.id}
                    data-selected={checked}
                  >
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!!inactive}
                        onChange={(e) =>
                          setSelection((current) => {
                            const next = { ...current }
                            if (e.target.checked)
                              next[org.id] = org.roles.length ? '' : 'new-admin'
                            else delete next[org.id]
                            return next
                          })
                        }
                      />
                      <span>
                        <strong>{org.nombre}</strong>
                        <small>
                          {inactive
                            ? 'Membresía inactiva'
                            : org.membership
                              ? 'Ya pertenece a esta organización'
                              : 'Sin vínculo actual'}
                        </small>
                      </span>
                    </label>
                    {org.membership?.roles.length ? (
                      <p className={styles.hint}>
                        Roles actuales:{' '}
                        {org.membership.roles
                          .map(
                            (r) => r.nombre + (r.sede_id ? ' (por sede)' : '')
                          )
                          .join(', ')}
                      </p>
                    ) : null}
                    {checked && (
                      <label className={styles.role}>
                        Rol en {org.nombre}
                        <select
                          aria-label={`Rol en ${org.nombre}`}
                          required
                          value={selection[org.id]}
                          onChange={(e) =>
                            setSelection((current) => ({
                              ...current,
                              [org.id]: e.target.value
                            }))
                          }
                        >
                          {org.roles.length ? (
                            <>
                              <option value="">Selecciona un rol</option>
                              {org.roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.nombre}
                                </option>
                              ))}
                            </>
                          ) : (
                            <option value="new-admin">
                              Crear primer rol: Administrador de organización
                            </option>
                          )}
                        </select>
                        {!org.roles.length && (
                          <small>
                            Se creará un rol para administrar los recursos de
                            esta organización.
                          </small>
                        )}
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
            {orgPage?.key !== orgKey ? (
              <p className={styles.hint}>Cargando organizaciones…</p>
            ) : (
              !organizations.length && (
                <p className={styles.hint}>
                  No hay organizaciones activas disponibles.
                </p>
              )
            )}
            <button
              type="button"
              onClick={() => {
                setSelection({})
                setProblem('')
                setRefresh((v) => v + 1)
              }}
            >
              Actualizar organizaciones
            </button>
          </fieldset>
        )}
        <div className={styles.footer}>
          <p>{Object.keys(selection).length} organizaciones seleccionadas</p>
          <button type="button" onClick={clear} disabled={busy}>
            Descartar cambios
          </button>
          <button
            className={styles.primary}
            type="submit"
            disabled={
              busy || orgPage?.key !== orgKey || !Object.keys(selection).length
            }
          >
            {busy
              ? 'Guardando…'
              : mode === 'create'
                ? 'Crear usuario y vincular'
                : 'Guardar vínculos'}
          </button>
        </div>
      </form>
    </section>
  )
}
