const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/+$/, '')
export class ApiError extends Error {
  readonly status: number
  constructor(status: number) { super('No se pudo completar la solicitud'); this.status = status }
}
export async function postJson(path: string, body?: unknown, token?: string): Promise<unknown> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST', credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  })
  if (!response.ok) throw new ApiError(response.status)
  return response.status === 204 ? undefined : response.json()
}
