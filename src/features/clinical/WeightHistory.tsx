import type { Row } from '../workspace/model'
export function WeightHistory({ rows }: { rows: Row[] }) {
  const points = [
    ...new Map(
      rows
        .filter(
          (row) =>
            row.tipo === 'peso' &&
            row.unidad === 'kg' &&
            Number.isFinite(Number(row.valor)) &&
            Number.isFinite(Date.parse(String(row.medida_en)))
        )
        .map((row) => [`${row.medida_en}:${row.valor}`, row])
    ).values()
  ].sort(
    (a, b) => Date.parse(String(a.medida_en)) - Date.parse(String(b.medida_en))
  )
  if (!points.length) return null
  const values = points.map((row) => Number(row.valor)),
    minimum = Math.min(...values),
    maximum = Math.max(...values),
    span = maximum - minimum || 1
  const first = Date.parse(String(points[0].medida_en)),
    duration = Date.parse(String(points.at(-1)!.medida_en)) - first || 1
  return (
    <figure style={{ margin: '20px 0' }}>
      <figcaption>
        Evolución del peso · observaciones de los registros cargados
      </figcaption>
      <p>
        <strong>
          {Number(points.at(-1)!.valor).toLocaleString('es-CO')} kg
        </strong>
        {points.length > 1
          ? ` · Cambio: ${(Number(points.at(-1)!.valor) - Number(points.at(-2)!.valor)).toLocaleString('es-CO', { maximumFractionDigits: 3, signDisplay: 'always' })} kg respecto al pesaje anterior`
          : ' · Primer pesaje registrado'}
      </p>
      <svg
        viewBox="0 0 360 210"
        role="img"
        aria-label="Pesos observados por fecha, sin interpolación"
        style={{ width: '100%', maxWidth: 700, display: 'block' }}
      >
        {[45, 105, 165].map((y) => (
          <line
            key={y}
            x1="55"
            x2="340"
            y1={y}
            y2={y}
            stroke="var(--color-border)"
            strokeDasharray="3 3"
          />
        ))}
        <line x1="55" y1="30" x2="55" y2="170" stroke="currentColor" />
        <line x1="55" y1="170" x2="340" y2="170" stroke="currentColor" />
        <text
          x="0"
          y={maximum === minimum ? 105 : 45}
          fontSize="12"
          fill="currentColor"
        >
          {maximum} kg
        </text>
        {maximum !== minimum && (
          <text x="0" y="165" fontSize="12" fill="currentColor">
            {minimum} kg
          </text>
        )}
        {points.map((row) => (
          <circle
            key={row.id}
            cx={
              points.length === 1
                ? 195
                : 55 +
                  ((Date.parse(String(row.medida_en)) - first) / duration) * 280
            }
            cy={
              maximum === minimum
                ? 105
                : 165 - ((Number(row.valor) - minimum) / span) * 120
            }
            r="4"
            fill="var(--color-primary)"
          >
            <title>
              {new Date(String(row.medida_en)).toLocaleDateString('es-CO')}:{' '}
              {String(row.valor)} kg
            </title>
          </circle>
        ))}
        <text x="55" y="195" fontSize="11" fill="currentColor">
          {new Date(first).toLocaleDateString('es-CO')}
        </text>
        {points.length > 1 && (
          <text
            x="340"
            y="195"
            fontSize="11"
            textAnchor="end"
            fill="currentColor"
          >
            {new Date(String(points.at(-1)!.medida_en)).toLocaleDateString(
              'es-CO'
            )}
          </text>
        )}
      </svg>
      <p>
        Los valores exactos aparecen en la lista. No se estiman mediciones entre
        fechas.
      </p>
    </figure>
  )
}
