import { CHART } from './chartUtils'

// Mini-courbe de tendance pour les tuiles d'indicateurs : ligne discrète,
// point final dans la couleur principale. Pas d'axe : la valeur est dans la tuile.
export default function Sparkline({ values, width = 120, height = 32, label }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const pad = 4
  const x = (i) => pad + (i / (values.length - 1)) * (width - pad * 2)
  const y = (v) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2)
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = values.length - 1

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block overflow-visible">
      {/* Voile sous la courbe (10 %) */}
      <polygon points={`${x(0)},${height - pad} ${points} ${x(last)},${height - pad}`} fill={CHART.series} opacity="0.1" />
      <polyline points={points} fill="none" stroke={CHART.sparkline} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Point final avec anneau couleur de fond */}
      <circle cx={x(last)} cy={y(values[last])} r="4" fill={CHART.series} stroke="#ffffff" strokeWidth="2" />
    </svg>
  )
}
