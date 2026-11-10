import type { PatientSummary } from '../clinical/PatientChart'
import { requestJson } from '../../shared/api/http'
export type Row = Record<string, unknown> & { id: string; version?: number }
export interface Field {
  name: string
  type: string
  nullable: boolean
  enum: string[]
  required: boolean
  default: string | null
  create: boolean
  update: boolean
  reference: { resource: string; field: string } | null
}
export interface Resource {
  name: string
  fields: Field[]
  permissions: { create: boolean; update: boolean; delete: boolean }
  deletion: 'none' | 'soft' | 'hard'
  deletionEffect: [string, unknown] | null
  transitions: Record<string, string[]> | null
}
export interface Page {
  data: Row[]
  page: { limit: number; next: string | null }
}
export interface Organization {
  id: string
  nombre: string
}
export interface Profile {
  id: string
  nombre: string
  email: string
  organizations: Organization[]
}
export const groups = [
  { id: 'overview', label: 'Resumen', symbol: '◫', resources: [] },
  {
    id: 'agenda',
    label: 'Agenda',
    symbol: '▦',
    resources: ['cita', 'recordatorio']
  },
  {
    id: 'pets',
    label: 'Mascotas y tutores',
    symbol: '♡',
    resources: [
      'mascota',
      'tutor',
      'mascota_tutor',
      'telefono_tutor',
      'preferencia_comunicacion',
      'alerta_mascota'
    ]
  },
  {
    id: 'clinical',
    label: 'Historia clínica',
    symbol: '✚',
    resources: [
      'atencion_clinica',
      'revision_clinica',
      'seccion_clinica',
      'medicion_clinica',
      'diagnostico_atencion',
      'prescripcion',
      'prescripcion_item',
      'adjunto_clinico'
    ]
  },
  {
    id: 'grooming',
    label: 'Peluquería',
    symbol: '✂',
    resources: [
      'servicio_peluqueria',
      'peluqueria_item',
      'consentimiento',
      'firma_consentimiento',
      'adjunto_peluqueria'
    ]
  },
  {
    id: 'vaccines',
    label: 'Vacunación',
    symbol: '◇',
    resources: ['vacunacion', 'pendiente_vacunal', 'adjunto_vacunacion']
  },
  {
    id: 'reports',
    label: 'Reportes',
    symbol: '▤',
    resources: ['reporte_emitido', 'evento_auditoria', 'evento_salida']
  },
  {
    id: 'settings',
    label: 'Configuración',
    symbol: '⚙',
    resources: [
      'organizacion',
      'sede',
      'usuario',
      'membresia',
      'profesional',
      'rol',
      'permiso',
      'rol_permiso',
      'asignacion_rol',
      'especie',
      'raza',
      'laboratorio',
      'medicamento',
      'vacuna',
      'tipo_servicio',
      'tipo_seccion_clinica',
      'plantilla_seccion',
      'diagnostico',
      'plantilla_consentimiento',
      'archivo'
    ]
  }
]
const labels: Record<string, string> = {
  cita: 'Citas',
  recordatorio: 'Recordatorios',
  mascota: 'Mascotas',
  tutor: 'Tutores',
  mascota_tutor: 'Vínculos con tutores',
  telefono_tutor: 'Teléfonos',
  preferencia_comunicacion: 'Preferencias de comunicación',
  alerta_mascota: 'Alertas',
  atencion_clinica: 'Atenciones clínicas',
  revision_clinica: 'Revisiones clínicas',
  seccion_clinica: 'Secciones clínicas',
  medicion_clinica: 'Mediciones',
  diagnostico_atencion: 'Diagnósticos de atención',
  prescripcion: 'Prescripciones',
  prescripcion_item: 'Medicamentos prescritos',
  adjunto_clinico: 'Adjuntos clínicos',
  servicio_peluqueria: 'Servicios de peluquería',
  peluqueria_item: 'Detalle de servicios',
  consentimiento: 'Consentimientos',
  firma_consentimiento: 'Firmas registradas',
  adjunto_peluqueria: 'Adjuntos de peluquería',
  vacunacion: 'Vacunaciones',
  pendiente_vacunal: 'Pendientes vacunales',
  adjunto_vacunacion: 'Adjuntos de vacunación',
  reporte_emitido: 'Reportes emitidos',
  evento_auditoria: 'Auditoría',
  evento_salida: 'Eventos de salida',
  organizacion: 'Organizaciones',
  sede: 'Sedes',
  usuario: 'Usuarios',
  membresia: 'Miembros del equipo',
  profesional: 'Profesionales',
  rol: 'Roles',
  permiso: 'Permisos',
  rol_permiso: 'Permisos de roles',
  asignacion_rol: 'Asignaciones de rol',
  especie: 'Especies',
  raza: 'Razas',
  laboratorio: 'Laboratorios',
  medicamento: 'Medicamentos',
  vacuna: 'Vacunas',
  tipo_servicio: 'Tipos de servicio',
  tipo_seccion_clinica: 'Tipos de sección clínica',
  plantilla_seccion: 'Plantillas clínicas',
  diagnostico: 'Catálogo de diagnósticos',
  plantilla_consentimiento: 'Plantillas de consentimiento',
  archivo: 'Archivos',
  pais_documento: 'País del documento',
  tipo_documento: 'Tipo de documento',
  numero_documento: 'Número de documento',
  direccion: 'Dirección',
  telefono: 'Teléfono',
  autorizacion: 'Autorización',
  vigente_desde: 'Vigente desde',
  autorizado_consentir: 'Autorizado para consentir',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  nombre: 'Nombre',
  codigo: 'Código',
  email: 'Correo electrónico',
  inicio: 'Inicio',
  fin: 'Fin',
  estado: 'Estado',
  tipo: 'Tipo',
  notas: 'Notas',
  fecha_nacimiento: 'Fecha de nacimiento',
  tutor_principal_id: 'Tutor principal',
  tutor_contacto_id: 'Tutor de contacto',
  mascota_id: 'Mascota',
  sede_id: 'Sede',
  especie_id: 'Especie',
  raza_id: 'Raza',
  profesional_id: 'Profesional',
  responsable_id: 'Responsable del equipo',
  aplicada_por: 'Profesional que aplicó la vacuna',
  creado_en: 'Fecha de creación',
  actualizado_en: 'Última modificación',
  motivo_anulacion: 'Motivo de anulación',
  identidad_firmante_snapshot: 'Identidad al firmar',
  documento: 'Documento de historia clínica',
  foto_archivo_id: 'Foto del paciente',
  anamnesis: 'Anamnesis',
  evaluacion: 'Evaluación',
  plan: 'Plan de tratamiento',
  datos_estructurados: 'Contenido del formulario',
  esquema_validacion: 'Esquema de validación de la plantilla',
  programada: 'Programada',
  confirmada: 'Confirmada',
  en_atencion: 'En atención',
  completada: 'Completada',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
  clinica: 'Consulta clínica',
  vacunacion_tipo: 'Vacunación',
  peluqueria: 'Peluquería',
  true: 'Sí',
  false: 'No',
  borrador: 'Borrador',
  cerrada: 'Cerrada',
  abierta: 'Abierta',
  anulada: 'Anulada'
}
export function label(name: string): string {
  return (
    labels[name] ??
    name
      .replace(/_id$/, '')
      .replaceAll('_', ' ')
      .replace(/^./, (c) => c.toLocaleUpperCase('es'))
  )
}
export function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value))
    return new Date(value).toLocaleString('es-CO')
  return labels[String(value)] ?? String(value)
}
export function rowLabel(row: Row): string {
  const name =
    row.nombre ??
    row.nombre_profesional ??
    row.nombre_comercial ??
    (row.nombres ? `${row.nombres} ${row.apellidos ?? ''}` : undefined) ??
    row.descripcion ??
    row.motivo_consulta ??
    row.nombre_original ??
    row.indicacion ??
    row.codigo ??
    row.email
  return name
    ? String(name)
    : `${display(row.estado ?? row.tipo ?? 'Registro')} · ${String(row.id).slice(0, 8)}`
}
export function createApi(
  token: string,
  organization: string,
  expired: () => void
) {
  const request = async (
    path: string,
    options: Parameters<typeof requestJson>[1] = {}
  ) => {
    try {
      return await requestJson(path, { ...options, token, organization })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 401
      )
        expired()
      throw error
    }
  }
  const base = (resource: string) =>
    `/resources/${encodeURIComponent(resource)}`
  return {
    patientSummary: async (id: string, signal?: AbortSignal) => ((await request(`/resources/clinica/pacientes/${encodeURIComponent(id)}`, { signal })) as { data: PatientSummary }).data,
    patientRecords: async (id: string, section: string, query: Record<string, string> = {}, signal?: AbortSignal) => {
      const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value))
      return await request(`/resources/clinica/pacientes/${encodeURIComponent(id)}/registros/${encodeURIComponent(section)}?${params}`, { signal }) as Page & { unavailable?: string[] }
    },
    clinicalAuthor: async () => ((await request('/resources/atencion_clinica/autor')) as { data: Row | null }).data,
    createAttentionWithHistory: async (body: Record<string, unknown>, key: string) =>
      ((await request('/resources/atencion_clinica/con-historia', { method: 'POST', body, headers: { 'Idempotency-Key': key } })) as { data: Row }).data,
    photo: async (id: string) => await request(`/storage/${encodeURIComponent(id)}/content`, { responseType: 'blob' }) as Blob,
    uploadPhoto: async (file: File, key: string) => {
      const body = new FormData()
      body.append('file', file)
      return ((await request('/storage/photos', { method: 'POST', body, headers: { 'Idempotency-Key': key } })) as { data: Row }).data
    },
    catalog: async () =>
      ((await request('/resources')) as { resources: Resource[] }).resources,
    list: async (
      resource: string,
      after?: string,
      filter?: Record<string, unknown>,
      signal?: AbortSignal
    ) => {
      const params = new URLSearchParams({ limit: '25' })
      if (after) params.set('after', after)
      if (filter) params.set('filter', JSON.stringify(filter))
      return (await request(`${base(resource)}?${params}`, { signal })) as Page
    },
    get: async (resource: string, id: string) =>
      (
        (await request(`${base(resource)}/${encodeURIComponent(id)}`)) as {
          data: Row
        }
      ).data,
    create: async (
      resource: string,
      body: Record<string, unknown>,
      key: string
    ) =>
      (
        (await request(base(resource), {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': key }
        })) as { data: Row }
      ).data,
    update: async (resource: string, row: Row, body: Record<string, unknown>) =>
      (
        (await request(`${base(resource)}/${encodeURIComponent(row.id)}`, {
          method: 'PATCH',
          body,
          headers: { 'If-Match': `"${row.version}"` }
        })) as { data: Row }
      ).data,
    transfer: async (row: Row, body: Record<string, unknown>) =>
      (
        (await request(
          `${base('mascota')}/${encodeURIComponent(row.id)}/tutor-principal`,
          { method: 'PATCH', body, headers: { 'If-Match': `"${row.version}"` } }
        )) as { data: Row }
      ).data,
    remove: async (resource: string, row: Row) =>
      request(`${base(resource)}/${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
        headers: { 'If-Match': `"${row.version}"` }
      })
  }
}
export type Api = ReturnType<typeof createApi>
