import { ApiError, postJson } from '../../../shared/api/http'
export interface Session { accessToken: string; userId: string; expiresIn: number }
export async function login(email: string, password: string): Promise<Session> {
  const data = await postJson('/auth/login', { email, password, client: 'web' })
  if (typeof data !== 'object' || data === null ||
    !('accessToken' in data) || typeof data.accessToken !== 'string' || !data.accessToken ||
    !('userId' in data) || typeof data.userId !== 'string' ||
    !('expiresIn' in data) || typeof data.expiresIn !== 'number' || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0) {
    throw new Error('Respuesta de autenticación inválida')
  }
  return { accessToken: data.accessToken, userId: data.userId, expiresIn: data.expiresIn }
}
export async function logout(session: Session) { await postJson('/auth/logout', undefined, session.accessToken) }
export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'El correo o la contraseña no son correctos. Revisa tus datos e inténtalo de nuevo.'
    if (error.status === 429) return 'Has realizado varios intentos. Espera un momento antes de volver a intentarlo.'
    if (error.status === 403) return 'No se pudo autorizar el acceso. Contacta al administrador de tu clínica.'
    if (error.status === 400) return 'Revisa el correo y la contraseña e inténtalo de nuevo.'
    return 'El servicio no está disponible en este momento. Inténtalo más tarde.'
  }
  return 'No pudimos completar el acceso. Comprueba tu conexión e inténtalo de nuevo.'
}
