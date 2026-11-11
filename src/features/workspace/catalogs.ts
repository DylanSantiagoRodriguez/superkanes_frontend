/** Reusable organization data, separate from patient events and access settings. */
export const catalogSections = [
  {
    title: 'Agenda y equipo',
    icon: 'agenda',
    entries: [
      {
        name: 'sede',
        description:
          'Lugares de atención disponibles para citas, consultas y servicios.'
      },
      {
        name: 'profesional',
        description:
          'Profesionales que atienden pacientes y firman sus historias clínicas.'
      }
    ]
  },
  {
    title: 'Pacientes',
    icon: 'pets',
    entries: [
      {
        name: 'especie',
        description: 'Especies que atiende la clínica, como caninos y felinos.'
      },
      {
        name: 'raza',
        description: 'Razas vinculadas a cada especie para registrar mascotas.'
      }
    ]
  },
  {
    title: 'Atención clínica',
    icon: 'clinical',
    entries: [
      {
        name: 'diagnostico',
        description:
          'Diagnósticos y códigos que se reutilizan durante la consulta.'
      },
      {
        name: 'tipo_seccion_clinica',
        description:
          'Secciones que organizan el contenido de la historia clínica.'
      },
      {
        name: 'plantilla_seccion',
        description:
          'Plantillas vinculadas a las secciones de la historia clínica.'
      }
    ]
  },
  {
    title: 'Tratamientos y prevención',
    icon: 'vaccines',
    entries: [
      {
        name: 'laboratorio',
        description:
          'Laboratorios asociados a medicamentos, vacunas y exámenes.'
      },
      {
        name: 'medicamento',
        description:
          'Medicamentos, principios activos y presentaciones para prescribir.'
      },
      {
        name: 'vacuna',
        description:
          'Vacunas disponibles para registrar aplicaciones y controles.'
      }
    ]
  },
  {
    title: 'Servicios y documentos',
    icon: 'reports',
    entries: [
      {
        name: 'tipo_servicio',
        description:
          'Tipos de servicio que se utilizan en las atenciones de peluquería.'
      },
      {
        name: 'plantilla_consentimiento',
        description: 'Textos y versiones de los consentimientos de la clínica.'
      }
    ]
  }
]
export const catalogNames = catalogSections.flatMap((section) =>
  section.entries.map((entry) => entry.name)
)
