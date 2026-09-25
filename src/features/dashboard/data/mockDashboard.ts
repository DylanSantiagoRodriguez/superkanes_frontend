import type { Appointment, ModulePreview } from '../types'
// Escenario ficticio y determinista. No representa registros del backend.
export const demoDate = 'Jueves, 24 de septiembre de 2026'
export const appointments: Appointment[] = [
  { id: 'demo-1', time: '08:30', pet: 'Luna', breed: 'Golden retriever ? 3 a?os', owner: 'Mar?a Gonz?lez', service: 'Consulta', professional: 'Dra. Valentina Ruiz', status: 'Finalizada' },
  { id: 'demo-2', time: '09:00', pet: 'Milo', breed: 'Schnauzer ? 2 a?os', owner: 'Carlos Rojas', service: 'Peluquer?a', professional: 'Laura M?ndez', status: 'En atenci?n' },
  { id: 'demo-3', time: '09:30', pet: 'Nala', breed: 'Gato mestizo ? 1 a?o', owner: 'Ana Torres', service: 'Vacunaci?n', professional: 'Dr. Santiago L?pez', status: 'En espera' },
  { id: 'demo-4', time: '10:00', pet: 'Sim?n', breed: 'Beagle ? 5 a?os', owner: 'Andr?s Castro', service: 'Consulta', professional: 'Dra. Valentina Ruiz', status: 'Confirmada' },
  { id: 'demo-5', time: '10:30', pet: 'Coco', breed: 'Poodle ? 4 a?os', owner: 'Diana P?rez', service: 'Peluquer?a', professional: 'Laura M?ndez', status: 'Confirmada' },
  { id: 'demo-6', time: '11:00', pet: 'Max', breed: 'Labrador ? 7 a?os', owner: 'Juan Herrera', service: 'Consulta', professional: 'Dr. Santiago L?pez', status: 'Confirmada' },
]
export const modules: ModulePreview[] = [
  { id: 'overview', label: 'Resumen', symbol: '?', description: '', capabilities: [] },
  { id: 'agenda', label: 'Agenda', symbol: '?', description: 'Una agenda compartida para coordinar la atenci?n de cada mascota.', capabilities: ['Citas por sede y profesional', 'Disponibilidad y reprogramaci?n', 'Confirmaciones y estados de atenci?n'] },
  { id: 'pets', label: 'Mascotas y tutores', symbol: '?', description: 'La informaci?n de cada paciente y de las personas que lo cuidan, en un solo lugar.', capabilities: ['Ficha de identificaci?n de la mascota', 'Tutores y contactos autorizados', 'Historial de visitas y documentos'] },
  { id: 'clinical', label: 'Historia cl?nica', symbol: '?', description: 'Continuidad en el cuidado, desde la consulta hasta el seguimiento.', capabilities: ['Atenciones y revisiones cl?nicas', 'Prescripciones y archivos adjuntos', 'Seguimiento de evoluci?n'] },
  { id: 'grooming', label: 'Peluquer?a', symbol: '?', description: 'Organizaci?n del servicio y cuidados espec?ficos de cada mascota.', capabilities: ['Ba?o, corte y servicios adicionales', 'Consentimientos e indicaciones', 'Estado de entrega y responsable'] },
  { id: 'vaccines', label: 'Vacunaci?n', symbol: '?', description: 'Un calendario de prevenci?n conectado con el historial del paciente.', capabilities: ['Registro de vacunas aplicadas', 'Pr?ximas dosis y pendientes', 'Agendamiento de refuerzos'] },
  { id: 'reports', label: 'Reportes', symbol: '?', description: 'Una visi?n de la actividad para organizar mejor la cl?nica.', capabilities: ['Atenciones por per?odo y sede', 'Distribuci?n de servicios', 'Seguimiento de indicadores'] },
  { id: 'settings', label: 'Configuraci?n', symbol: '?', description: 'Las bases para adaptar Superkanes a la operaci?n de tu equipo.', capabilities: ['Organizaci?n y sedes', 'Usuarios, roles y permisos', 'Cat?logos de servicios'] },
]
export const reminders = [
  { id: 'reminder-1', title: 'Refuerzo de vacuna ? Rocky', detail: 'Contactar a su tutor para agendar', module: 'vaccines' },
  { id: 'reminder-2', title: 'Control posconsulta ? Kira', detail: 'Revisar evoluci?n y seguimiento', module: 'clinical' },
  { id: 'reminder-3', title: 'Consentimiento ? Coco', detail: 'Pendiente antes de la peluquer?a', module: 'grooming' },
]
