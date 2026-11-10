import type { Row } from '../workspace/model'
export function WeightHistory({ rows }: { rows: Row[] }) {
  const points = [
    ...new Map(
      rows
        .filter(
          (row) =>
            row.tipo === 'peso' &&
            row.unidad === 'kg' &&
            Number.isFinite(Number(row.valor))
        )
        .map((row) => [`${row.medida_en}:${row.valor}`, row])
    ).values()
  ].sort(
    (a, b) => Date.parse(String(a.medida_en)) - Date.parse(String(b.medida_en))
  )
  if (points.length < 2) return null
  const values = points.map((row) => Number(row.valor)),
    minimum = Math.min(...values),
    maximum = Math.max(...values),
    span = maximum - minimum || 1
  const first = Date.parse(String(points[0].medida_en)),
    duration = Date.parse(String(points.at(-1)!.medida_en)) - first || 1
  return (
    <figure>
      <figcaption>
        Evolución del peso · observaciones de los registros cargados
      </figcaption>
      <svg
        viewBox="0 0 600 200"
        role="img"
        aria-label="Pesos observados por fecha, sin interpolación"
        style={{ width: '100%', maxWidth: 700 }}
      >
        <line x1="60" y1="20" x2="60" y2="165" stroke="currentColor" />
        <line x1="60" y1="165" x2="580" y2="165" stroke="currentColor" />
        <text x="0" y="30" fontSize="12">
          {maximum} kg
        </text>
        <text x="0" y="160" fontSize="12">
          {minimum} kg
        </text>
        {points.map((row) => (
          <circle
            key={row.id}
            cx={
              60 +
              ((Date.parse(String(row.medida_en)) - first) / duration) * 510
            }
            cy={155 - ((Number(row.valor) - minimum) / span) * 120}
            r="5"
            fill="var(--color-primary)"
          >
            <title>
              {new Date(String(row.medida_en)).toLocaleDateString('es-CO')}:{' '}
              {String(row.valor)} kg
            </title>
          </circle>
        ))}
        <text x="60" y="190" fontSize="11">
          {new Date(first).toLocaleDateString('es-CO')}
        </text>
        <text x="480" y="190" fontSize="11">
          {new Date(String(points.at(-1)!.medida_en)).toLocaleDateString(
            'es-CO'
          )}
        </text>
      </svg>
      <p>
        Los valores exactos y sus revisiones de origen aparecen en la lista. No
        se estiman mediciones entre fechas.
      </p>
    </figure>
  )
}
