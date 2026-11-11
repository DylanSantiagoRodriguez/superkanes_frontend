export interface ManagedUser {
  id: string
  nombre: string
  email: string
  activo: boolean
  has_login: boolean
}
export interface OrganizationOption {
  id: string
  nombre: string
  roles: { id: string; nombre: string }[]
  membership: null | {
    id: string
    activo: boolean
    roles: { rol_id: string; nombre: string; sede_id: string | null }[]
  }
}
export interface AccessInput {
  organizacion_id: string
  rol_id?: string
  crear_rol_administrador?: boolean
}
export interface ManagedUserInput {
  nombre: string
  email: string
  password: string
  organizaciones: AccessInput[]
}
