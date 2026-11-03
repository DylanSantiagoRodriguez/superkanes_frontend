import type { JSONContent } from '@tiptap/react'
export const clinicalTemplate: JSONContent = {
  type: 'doc',
  content: ['Motivo de consulta', 'Anamnesis', 'Examen físico', 'Evaluación y diagnóstico', 'Plan y tratamiento', 'Seguimiento'].flatMap(text => [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] },
    { type: 'paragraph' }
  ])
}
