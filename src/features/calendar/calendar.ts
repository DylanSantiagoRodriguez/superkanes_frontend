export interface CalendarEvent {
  id: string
  resource: string
  start: string
  end: string | null
  allDay: boolean
  status: string
  title: string
  detail: string
  petId: string | null
  petName: string | null
}
export interface CalendarPage {
  data: CalendarEvent[]
  page: { limit: number; next: string | null }
  unavailable: string[]
}
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function dateFor(day: string) {
  return new Date(`${day}T12:00:00`)
}
export function monthDays(month: string) {
  const first = dateFor(month)
  first.setDate(1)
  first.setDate(1 - ((first.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first)
    date.setDate(first.getDate() + index)
    return dayKey(date)
  })
}
export function onDay(event: CalendarEvent, day: string) {
  if (event.allDay) return event.start === day
  const start = new Date(`${day}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return (
    Date.parse(event.start) < end.getTime() &&
    (event.end
      ? Date.parse(event.end) > start.getTime()
      : Date.parse(event.start) >= start.getTime())
  )
}
export const calendarTypes: Record<string, { label: string; icon: string }> = {
  cita: { label: 'Citas y controles', icon: 'clinical' },
  pendiente_vacunal: { label: 'Pendientes vacunales', icon: 'vaccines' },
  servicio_peluqueria: { label: 'Servicios de peluquería', icon: 'grooming' },
  recordatorio: { label: 'Recordatorios', icon: 'agenda' }
}
