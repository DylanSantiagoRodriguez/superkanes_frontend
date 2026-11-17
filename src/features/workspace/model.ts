import type {
  ManagedUser,
  OrganizationOption,
  ManagedUserInput,
  AccessInput
} from './user-management'
import type { CalendarPage } from '../calendar/calendar'
import { catalogNames } from './catalogs'
import type { RevisionDetails } from '../clinical/Consultation'
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
  platformAdmin?: boolean
  organizations: Organization[]
}
export const groups = [
  { id: 'overview', label: 'Resumen', symbol: '◫', resources: [] },
  { id: 'users', label: 'Usuarios y accesos', symbol: '♙', resources: [] },
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
    id: 'catalogs',
    label: 'Catálogos',
    symbol: '▧',
    resources: [...catalogNames, 'cita']
  },
  {
    id: 'settings',
    label: 'Configuración',
    symbol: '⚙',
    resources: [
      'organizacion',
      'usuario',
      'membresia',
      'rol',
      'permiso',
      'rol_permiso',
      'asignacion_rol',
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
  membresia_id: 'Miembro del equipo',
  nombre_profesional: 'Nombre del profesional',
  especialidad: 'Especialidad',
  responsable_id: 'Responsable del equipo',
  aplicada_por: 'Profesional que aplicó la vacuna',
  creado_en: 'Fecha de creación',
  actualizado_en: 'Última modificación',
  motivo_anulacion: 'Motivo de anulación',
  identidad_firmante_snapshot: 'Identidad al firmar',
  documento: 'Documento de historia clínica',
  foto_archivo_id: 'Foto del paciente',
  procedimiento: 'Procedimiento',
  alcance: 'Alcance y limitaciones de la autorización',
  documento_archivo_id: 'Documento del consentimiento adjunto a esta atención',
  evidencia_archivo_id: 'Evidencia escaneada adjunta a esta atención',
  decision: 'Decisión del tutor',
  plantilla_id: 'Plantilla publicada',
  anamnesis: 'Anamnesis',
  examen_fisico: 'Examen físico',
  numero_revision: 'Revisión de origen',
  estado_revision: 'Estado de la revisión',
  peso: 'Peso',
  temperatura: 'Temperatura',
  frecuencia_cardiaca: 'Frecuencia cardíaca',
  frecuencia_respiratoria: 'Frecuencia respiratoria',
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
    manageUsers: async (query: Record<string, string>, signal?: AbortSignal) =>
      (await request(`/auth/admin/users?${new URLSearchParams(query)}`, {
        signal
      })) as { data: ManagedUser[]; page: { next: string | null } },
    manageOrganizations: async (
      query: Record<string, string>,
      signal?: AbortSignal
    ) =>
      (await request(
        `/auth/admin/organizations?${new URLSearchParams(query)}`,
        { signal }
      )) as { data: OrganizationOption[]; page: { next: string | null } },
    manageCreateUser: async (body: ManagedUserInput, key: string) =>
      (
        (await request('/auth/admin/users', {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': key }
        })) as { data: { user: ManagedUser } }
      ).data,
    manageLinkUser: async (
      id: string,
      organizaciones: AccessInput[],
      key: string
    ) =>
      (
        (await request(
          `/auth/admin/users/${encodeURIComponent(id)}/organizations`,
          {
            method: 'POST',
            body: { organizaciones },
            headers: { 'Idempotency-Key': key }
          }
        )) as { data: { user: ManagedUser } }
      ).data,
    labPermissions: async () =>
      (
        (await request('/resources/clinica/laboratorio/permisos')) as {
          data: Record<string, boolean>
        }
      ).data,
    labOrders: async (id: string, after?: string) =>
      (await request(
        `/resources/clinica/laboratorio/atenciones/${encodeURIComponent(id)}/ordenes${after ? '?after=' + encodeURIComponent(after) : ''}`
      )) as Page,
    labCreate: async (body: Record<string, unknown>, key: string) =>
      (
        (await request('/resources/clinica/laboratorio/ordenes', {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': key }
        })) as { data: Row }
      ).data,
    labAdvance: async (row: Row, body: Record<string, unknown>, key: string) =>
      (
        (await request(
          `/resources/clinica/laboratorio/ordenes/${encodeURIComponent(row.id)}/avanzar`,
          {
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': key, 'If-Match': `"${row.version}"` }
          }
        )) as { data: Row }
      ).data,
    calendar: async (query: Record<string, string>, signal?: AbortSignal) =>
      (await request(
        `/resources/clinica/calendario?${new URLSearchParams(query)}`,
        { signal }
      )) as CalendarPage,
    agenda: async (query: Record<string, string>, signal?: AbortSignal) =>
      (await request(
        `/resources/clinica/agenda?${new URLSearchParams(query)}`,
        { signal }
      )) as Page,
    savePatientWeight: async (
      id: string,
      body: Record<string, unknown>,
      key: string
    ) =>
      (
        (await request(
          `/resources/clinica/pacientes/${encodeURIComponent(id)}/pesos`,
          { method: 'POST', body, headers: { 'Idempotency-Key': key } }
        )) as { data: Row }
      ).data,
    groomingAdmission: async (row: Row, key: string) =>
      ((await request(`/resources/clinica/citas/${encodeURIComponent(row.id)}/ingreso-peluqueria`, {
        method: 'POST', body: {}, headers: { 'If-Match': `"${row.version}"`, 'Idempotency-Key': key }
      })) as { data: { appointment: Row; service: Row } }).data,
    appointmentArrival: async (row: Row) =>
      (
        (await request(
          `/resources/clinica/citas/${encodeURIComponent(row.id)}/llegada`,
          { method: 'PATCH', headers: { 'If-Match': `"${row.version}"` } }
        )) as { data: Row }
      ).data,
    respondClinicalConsent: async (
      row: Row,
      body: Record<string, unknown>,
      key: string
    ) =>
      (
        (await request(
          `/resources/clinica/consentimientos/${encodeURIComponent(row.id)}/responder`,
          {
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': key, 'If-Match': `"${row.version}"` }
          }
        )) as { data: Row }
      ).data,
    uploadClinical: async (row: Row, file: File, key: string) => {
      const body = new FormData()
      body.append('file', file)
      return (
        (await request(
          `/storage/clinical/revisiones/${encodeURIComponent(row.id)}/adjuntos`,
          {
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': key, 'If-Match': `"${row.version}"` }
          }
        )) as { data: { revision: Row; archivo: Row; adjunto: Row } }
      ).data
    },
    clinicalFile: async (id: string) =>
      (await request(`/storage/clinical/${encodeURIComponent(id)}/content`, {
        responseType: 'blob'
      })) as Blob,
    clinicalReport: async (id: string, type: string, key: string) =>
      (
        (await request(
          `/storage/clinical/revisiones/${encodeURIComponent(id)}/reportes/${encodeURIComponent(type)}`,
          { method: 'POST', headers: { 'Idempotency-Key': key } }
        )) as { data: { report: Row; archivo: Row } }
      ).data,
    revisionDetails: async (id: string) =>
      (
        (await request(
          `/resources/clinica/revisiones/${encodeURIComponent(id)}`
        )) as { data: RevisionDetails }
      ).data,
    saveClinical: async (
      row: Row,
      body: Record<string, unknown>,
      key: string
    ) =>
      (
        (await request(
          `/resources/clinica/revisiones/${encodeURIComponent(row.id)}/guardar`,
          {
            method: 'POST',
            body,
            headers: { 'Idempotency-Key': key, 'If-Match': `"${row.version}"` }
          }
        )) as { data: { revision: Row; details: Row[] } }
      ).data,
    correctClinical: async (row: Row, reason: string, key: string) =>
      (
        (await request(
          `/resources/clinica/revisiones/${encodeURIComponent(row.id)}/corregir`,
          {
            method: 'POST',
            body: { motivo_cambio: reason },
            headers: { 'Idempotency-Key': key, 'If-Match': `"${row.version}"` }
          }
        )) as { data: { revision: Row } }
      ).data.revision,
    patientDocuments: async (
      id: string,
      after?: string,
      revisionId?: string,
      signal?: AbortSignal,
      codigo?: string
    ) => {
      const params = new URLSearchParams()
      if (after) params.set('after', after)
      if (revisionId) params.set('revision_id', revisionId)
      if (codigo) params.set('codigo', codigo)
      return (await request(
        `/storage/clinical/pacientes/${encodeURIComponent(id)}/documentos?${params}`,
        { signal }
      )) as Page
    },
    patientSummary: async (id: string, signal?: AbortSignal) =>
      (
        (await request(
          `/resources/clinica/pacientes/${encodeURIComponent(id)}`,
          { signal }
        )) as { data: PatientSummary }
      ).data,
    patientRecords: async (
      id: string,
      section: string,
      query: Record<string, string> = {},
      signal?: AbortSignal
    ) => {
      const params = new URLSearchParams(
        Object.entries(query).filter(([, value]) => value)
      )
      return (await request(
        `/resources/clinica/pacientes/${encodeURIComponent(id)}/registros/${encodeURIComponent(section)}?${params}`,
        { signal }
      )) as Page & { unavailable?: string[] }
    },
    clinicalAuthor: async () =>
      (
        (await request('/resources/atencion_clinica/autor')) as {
          data: Row | null
        }
      ).data,
    createAttentionWithHistory: async (
      body: Record<string, unknown>,
      key: string
    ) =>
      (
        (await request('/resources/atencion_clinica/con-historia', {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': key }
        })) as { data: Row }
      ).data,
    photo: async (id: string) =>
      (await request(`/storage/${encodeURIComponent(id)}/content`, {
        responseType: 'blob'
      })) as Blob,
    uploadPhoto: async (file: File, key: string) => {
      const body = new FormData()
      body.append('file', file)
      return (
        (await request('/storage/photos', {
          method: 'POST',
          body,
          headers: { 'Idempotency-Key': key }
        })) as { data: Row }
      ).data
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
    searchRelations: async (
      resource: string,
      search: string,
      after?: string,
      signal?: AbortSignal,
      linkedTo?: string,
      selectedId?: string
    ) => {
      const params = new URLSearchParams({ limit: '25', search })
      if (after) params.set('after', after)
      if (linkedTo) params.set('linked_to', linkedTo)
      if (selectedId) params.set('filter', JSON.stringify({ id: selectedId }))
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
