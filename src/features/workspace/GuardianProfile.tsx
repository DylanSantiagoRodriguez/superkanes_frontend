import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, errorMessage } from '../../shared/api/http'
import { RecordDetails } from './RecordDetails'
import { RecordEditor } from './RecordEditor'
import { PatientPhoto } from './PatientPhoto'
import { rowLabel } from './model'
import type { Api, Resource, Row } from './model'
import styles from '../clinical/PatientChart.module.css'

const linkDate = (value: unknown) =>
  new Date(String(value)).toLocaleDateString('es-CO')

export function GuardianProfile({
  api,
  guardian,
  resource,
  catalog,
  onBack,
  onPet,
  actions
}: {
  api: Api
  guardian: Row
  resource: Resource
  catalog: Resource[]
  onBack: () => void
  onPet: (row: Row) => void
  actions: ReactNode
}) {
  const [cards, setCards] = useState<{ link: Row; pet: Row | null }[]>([])
  const [phones, setPhones] = useState<Row[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)
  const [problem, setProblem] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [creating, setCreating] = useState(false)
  const petResource = catalog.find((r) => r.name === 'mascota')
  const canReadLinks = Boolean(
    petResource && catalog.some((r) => r.name === 'mascota_tutor')
  )
  useEffect(() => {
    let live = true
    async function load() {
      try {
        if (canReadLinks) {
          const page = await api.list('mascota_tutor', undefined, {
            tutor_id: guardian.id
          })
          const result = await Promise.all(
            page.data.map(async (link) => ({
              link,
              pet: await api
                .get('mascota', String(link.mascota_id))
                .catch((e) => {
                  if (e instanceof ApiError && [403, 404].includes(e.status))
                    return null
                  throw e
                })
            }))
          )
          if (live) {
            setCards(result)
            setNext(page.page.next)
          }
        }
        if (catalog.some((r) => r.name === 'telefono_tutor')) {
          const all: Row[] = []
          let cursor: string | undefined
          do {
            const page = await api.list('telefono_tutor', cursor, {
              tutor_id: guardian.id
            })
            all.push(...page.data)
            cursor = page.page.next ?? undefined
          } while (cursor && live)
          if (live) setPhones(all)
        }
      } catch (e) {
        if (live) setProblem(errorMessage(e))
      } finally {
        if (live) setBusy(false)
      }
    }
    void load()
    return () => {
      live = false
    }
  }, [api, guardian.id, canReadLinks, catalog, refresh])
  async function more() {
    if (!next || busy) return
    setBusy(true)
    setProblem('')
    try {
      const page = await api.list('mascota_tutor', next, {
        tutor_id: guardian.id
      })
      const result = await Promise.all(
        page.data.map(async (link) => ({
          link,
          pet: await api.get('mascota', String(link.mascota_id)).catch((e) => {
            if (e instanceof ApiError && [403, 404].includes(e.status))
              return null
            throw e
          })
        }))
      )
      setCards((current) => [...current, ...result])
      setNext(page.page.next)
    } catch (e) {
      setProblem(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <article className={styles.chart} aria-label="Perfil del tutor">
      <button onClick={onBack}>← Volver a tutores</button>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>PERFIL DEL TUTOR</p>
          <h2>{rowLabel(guardian)}</h2>
          <p>{guardian.activo ? 'Activo' : 'Inactivo'}</p>
        </div>
        <div className={styles.actions}>{actions}</div>
      </header>
      <div className={styles.profileColumns}>
        <section className={styles.profileCard}>
          <h3>Datos del tutor</h3>
          <RecordDetails api={api} resource={resource} row={guardian} />
          <h3>Teléfonos</h3>
          {!catalog.some((r) => r.name === 'telefono_tutor') ? (
            <p>Sin permiso para consultar teléfonos.</p>
          ) : phones.length ? (
            phones.map((phone) => <p key={phone.id}>{String(phone.numero)}</p>)
          ) : (
            <p>{busy ? 'Consultando…' : 'No hay teléfonos registrados.'}</p>
          )}
        </section>
        <section className={styles.profileCard} aria-label="Mascotas del tutor">
          <div className={styles.entryHeader}>
            <h3>Mascotas asociadas</h3>
            {petResource?.permissions.create && (
              <button onClick={() => setCreating(true)}>
                Nueva mascota de este tutor
              </button>
            )}
          </div>
          {!canReadLinks && (
            <p>No tienes permiso para consultar las mascotas vinculadas.</p>
          )}
          {problem && (
            <p role="alert">
              {problem}{' '}
              <button
                onClick={() => {
                  setProblem('')
                  setRefresh((n) => n + 1)
                }}
              >
                Reintentar perfil
              </button>
            </p>
          )}
          {busy && <p role="status">Cargando mascotas…</p>}
          {canReadLinks && !busy && !problem && !cards.length && (
            <p>No hay mascotas vinculadas a este tutor.</p>
          )}
          <div className={styles.petCards}>
            {cards.map(({ link, pet }) => (
              <article className={styles.petCard} key={link.id}>
                {pet ? (
                  <>
                    <PatientPhoto
                      api={api}
                      id={String(pet.foto_archivo_id ?? '')}
                      name={String(pet.nombre)}
                    />
                    <p>
                      {String(pet.codigo)} · {String(pet.estado)}
                    </p>
                  </>
                ) : (
                  <h4>Mascota no disponible</h4>
                )}
                <p>
                  {link.vigente_hasta
                    ? 'Vínculo finalizado'
                    : link.es_principal
                      ? 'Tutor principal'
                      : 'Tutor asociado'}
                </p>
                <p>
                  Desde {linkDate(link.vigente_desde)}
                  {link.vigente_hasta
                    ? ` · hasta ${linkDate(link.vigente_hasta)}`
                    : ''}
                </p>
                {pet && (
                  <button onClick={() => onPet(pet)}>
                    Ver perfil de {String(pet.nombre)}
                  </button>
                )}
              </article>
            ))}
          </div>
          {next && (
            <button disabled={busy} onClick={() => void more()}>
              Cargar más mascotas
            </button>
          )}
        </section>
      </div>
      {creating && petResource && (
        <RecordEditor
          api={api}
          resource={petResource}
          catalog={catalog}
          initialValues={{ tutor_principal_id: guardian.id }}
          title="Nueva mascota de este tutor"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false)
            setRefresh((n) => n + 1)
          }}
        />
      )}
    </article>
  )
}
