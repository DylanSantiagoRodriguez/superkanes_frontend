export type Service = 'Consulta' | 'Peluquer?a' | 'Vacunaci?n'
export type AppointmentStatus = 'Confirmada' | 'En espera' | 'En atenci?n' | 'Finalizada'
export interface Appointment { id: string; time: string; pet: string; breed: string; owner: string; service: Service; professional: string; status: AppointmentStatus }
export interface ModulePreview { id: string; label: string; symbol: string; description: string; capabilities: string[] }
