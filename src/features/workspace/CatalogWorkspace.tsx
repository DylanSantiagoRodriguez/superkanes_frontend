import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../../shared/ui/AppIcon'
import { catalogSections } from './catalogs'
import { label } from './model'
import type { Api, Resource } from './model'
import { ResourceBrowser } from './ResourceBrowser'
import styles from './CatalogWorkspace.module.css'

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()

export function CatalogWorkspace({
  api,
  catalog,
  selected,
  onSelect,
  onNavigate
}: {
  api: Api
  catalog: Resource[]
  selected: string
  onSelect: (name: string) => void
  onNavigate: (group: string, name?: string) => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const sections = catalogSections
    .map((section) => ({
      ...section,
      entries: section.entries.flatMap((entry) => {
        const resource = catalog.find(
          (resource) => resource.name === entry.name
        )
        return resource ? [{ ...entry, resource }] : []
      })
    }))
    .filter((section) => section.entries.length)
  const entries = sections.flatMap((section) => section.entries)
  const current = entries.find((entry) => entry.name === selected)
  const query = normalize(search.trim())
  const visible = sections
    .filter((section) => !category || section.title === category)
    .map((section) => ({
      ...section,
      entries: section.entries.filter((entry) =>
        normalize(
          `${label(entry.name)} ${entry.description} ${section.title}`
        ).includes(query)
      )
    }))
    .filter((section) => section.entries.length)
  useEffect(() => {
    heading.current?.focus()
  }, [selected])

  if (current)
    return (
      <section
        className={styles.workspace}
        aria-label="Administración del catálogo"
      >
        <div className={styles.detailToolbar}>
          <button onClick={() => onSelect('')}>← Todos los catálogos</button>
          <label>
            Catálogo
            <select
              aria-label="Catálogo"
              value={current.name}
              onChange={(event) => onSelect(event.target.value)}
            >
              {sections.map((section) => (
                <optgroup label={section.title} key={section.title}>
                  {section.entries.map((entry) => (
                    <option value={entry.name} key={entry.name}>
                      {label(entry.name)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.detailIntro}>
          <h2 ref={heading} tabIndex={-1}>
            {label(current.name)}
          </h2>
          <p>{current.description}</p>
          {current.name === 'profesional' && (
            <p>
              Vincula cada profesional a su miembro del equipo. Las historias
              clínicas se guardan a nombre del profesional de la sesión.
              {catalog.some((resource) => resource.name === 'membresia') && (
                <button
                  className={styles.textButton}
                  onClick={() => onNavigate('settings', 'membresia')}
                >
                  Gestionar miembros del equipo →
                </button>
              )}
            </p>
          )}
          {current.name === 'raza' && (
            <p>
              Primero registra la especie; después selecciona esa especie al
              crear sus razas.
            </p>
          )}
        </div>
        <ResourceBrowser
          key={current.name}
          api={api}
          resource={current.resource}
          catalog={catalog}
        />
      </section>
    )

  return (
    <section className={styles.workspace} aria-label="Catálogos de la clínica">
      <div className={styles.intro}>
        <div className={styles.introIcon}>
          <AppIcon name="catalogs" size={28} />
        </div>
        <div>
          <h2 ref={heading} tabIndex={-1}>
            Todo listo para atender
          </h2>
          <p>
            Organiza la información que tu equipo utiliza en cada cita y
            consulta.
          </p>
        </div>
        {catalog.some((resource) => resource.name === 'cita') && (
          <button onClick={() => onNavigate('agenda', 'cita')}>
            <AppIcon name="agenda" size={18} />
            Ir a citas <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
      {entries.length ? (
        <>
          <div className={styles.filters}>
            <label>
              Buscar catálogo
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Sedes, profesionales, diagnósticos…"
              />
            </label>
            <label>
              Área
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">Todas las áreas</option>
                {sections.map((section) => (
                  <option key={section.title}>{section.title}</option>
                ))}
              </select>
            </label>
          </div>
          {!visible.length && (
            <div className={styles.empty} role="status">
              <p>No hay catálogos que coincidan con tu búsqueda.</p>
              <button
                onClick={() => {
                  setSearch('')
                  setCategory('')
                }}
              >
                Limpiar filtros
              </button>
            </div>
          )}
          {visible.map((section) => (
            <section
              key={section.title}
              aria-label={section.title}
              className={styles.category}
            >
              <h3>
                <AppIcon name={section.icon} size={20} />
                {section.title}
              </h3>
              <div className={styles.cards}>
                {section.entries.map((entry) => {
                  const editable = Object.values(
                    entry.resource.permissions
                  ).some(Boolean)
                  return (
                    <button
                      key={entry.name}
                      className={styles.card}
                      aria-label={`Abrir ${label(entry.name)}`}
                      onClick={() => onSelect(entry.name)}
                    >
                      <span className={styles.cardTop}>
                        <strong>{label(entry.name)}</strong>
                        <span className={styles.mode}>
                          {editable ? 'Administrar' : 'Solo consulta'}
                        </span>
                      </span>
                      <span className={styles.description}>
                        {entry.description}
                      </span>
                      <span className={styles.cardFoot}>
                        {editable ? 'Gestionar catálogo' : 'Consultar catálogo'}
                        <span aria-hidden="true">→</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <p className={styles.empty}>
          No tienes acceso a los catálogos de esta organización.
        </p>
      )}
    </section>
  )
}
