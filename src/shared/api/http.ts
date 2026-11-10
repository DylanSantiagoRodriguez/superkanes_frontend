const apiUrl = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
).replace(/\/+$/, '')
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  constructor(status: number, code?: string) {
    super('No se pudo completar la solicitud')
    this.status = status
    this.code = code
  }
}
export async function requestJson(
  path: string,
  options: {
    method?: string
    body?: unknown
    token?: string
    organization?: string
    headers?: Record<string, string>
    signal?: AbortSignal
    responseType?: 'blob'
  } = {}
): Promise<unknown> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal: options.signal
      ? AbortSignal.any([
          options.signal,
          AbortSignal.timeout(options.body instanceof FormData ? 60000 : 15000)
        ])
      : AbortSignal.timeout(options.body instanceof FormData ? 60000 : 15000),
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      'X-CSRF-Protection': '1',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.organization
        ? { 'X-Organization-Id': options.organization }
        : {}),
      ...options.headers
    },
    ...(options.body !== undefined
      ? {
          body:
            options.body instanceof FormData
              ? options.body
              : JSON.stringify(options.body)
        }
      : {})
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const code =
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : undefined
    throw new ApiError(response.status, code)
  }
  if (options.responseType === 'blob') return response.blob()
  return response.status === 204 ? undefined : response.json()
}
export function postJson(
  path: string,
  body?: unknown,
  token?: string
): Promise<unknown> {
  return requestJson(path, { method: 'POST', body: body ?? {}, token })
}
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'APPOINTMENT_OVERLAP')
      return 'El responsable ya tiene una cita en ese horario. Selecciona otro horario o responsable.'
    if (error.code === 'BREED_SPECIES_MISMATCH')
      return 'La raza seleccionada no corresponde a la especie. Selecciona una raza de esa especie o deja el campo Raza vacío.'
    const messages: Record<number, string> = {
      400: 'Revisa los campos obligatorios, sus formatos y las fechas. Los datos no cumplen las reglas del registro.',
      401: 'Tu sesión ha vencido. Inicia sesión nuevamente.',
      403: 'No tienes permiso para esta operación o para los registros relacionados.',
      404: 'El registro ya no está disponible. Actualiza la lista.',
      405: 'Esta operación no está disponible para este registro.',
      409: 'No se pudo guardar: el registro cambió, está duplicado o no cumple las reglas de estado e historial. Recarga y revisa los datos.',
      412: 'Otra persona modificó este registro. Cierra el formulario, actualiza la lista y revisa los cambios antes de guardar.',
      413: 'El archivo o documento supera el tamaño permitido.',
      503: 'El almacenamiento o el servicio no está disponible. Reintenta en un momento.',
      428: 'Vuelve a abrir el registro para consultar su versión actual.',
      429: 'Has realizado varias solicitudes. Espera un momento e inténtalo de nuevo.'
    }
    return (
      messages[error.status] ??
      'El servicio no está disponible. Inténtalo de nuevo.'
    )
  }
  return 'No pudimos completar la operación. Comprueba tu conexión y vuelve a intentarlo.'
}
