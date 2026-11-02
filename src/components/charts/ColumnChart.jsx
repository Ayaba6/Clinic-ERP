import { useEffect, useRef, useState } from 'react'
import { CHART, formatCompact, niceScale } from './chartUtils'

const PAD = { top: 12, right: 8, bottom: 28, left: 44 }

// Histogramme vertical à une série (ex. recettes par jour).
// data : [{ key, label (axe), tooltip (titre de l'infobulle), value }]
export default function ColumnChart({ data, formatValue, height = 240 }) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(600)
  const [hover, setHover] = useState(null)

  // Largeur responsive
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = Math.max(0, ...data.map(d => d.value))
  const { max: yMax, step } = niceScale(max)
  const plotW = width - PAD.left - PAD.right
  const plotH = height - PAD.top - PAD.bottom
  const band = data.length ? plotW / data.length : plotW
  // Barres fines : 24 px maximum, 2 px d'air au minimum entre deux barres
  const barW = Math.max(2, Math.min(24, band * 0.7, band - 2))
  const y = (v) => PAD.top + plotH - (v / yMax) * plotH
  const ticks = []
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v)
  // Libellés de l'axe X espacés pour ne jamais se chevaucher (≈ 56 px chacun)
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 56))))

  const hovered = hover !== null ? data[hover] : null
  const tipLeft = hover !== null ? PAD.left + band * hover + band / 2 : 0

  return (
    <div ref={wrapRef} className="relative w-full" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label="Histogramme" className="block">
        {/* Grille horizontale discrète + graduations */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? CHART.axis : CHART.grid} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={CHART.muted} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCompact(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const x = PAD.left + band * i + (band - barW) / 2
          const h = Math.max(0, y(0) - y(d.value))
          const top = y(0) - h
          const r = Math.min(4, h, barW / 2)
          return (
            <g key={d.key}>
              {h > 0 && (
                // Extrémité arrondie (4 px), base carrée sur l'axe
                <path
                  d={`M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y(0)} Z`}
                  fill={hover === i ? CHART.seriesHover : CHART.series}
                />
              )}
              {i % every === 0 && (
                <text x={PAD.left + band * i + band / 2} y={height - 8} textAnchor="middle" fontSize="11" fill={CHART.muted}>
                  {d.label}
                </text>
              )}
              {/* Zone de survol : toute la hauteur de la colonne, plus large que la barre */}
              <rect
                x={PAD.left + band * i}
                y={PAD.top}
                width={band}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d.tooltip} : ${formatValue(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: 'none' }}
              />
            </g>
          )
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
          style={{ left: Math.min(Math.max(tipLeft, 70), width - 70), top: 0 }}
        >
          <div className="text-sm font-bold text-slate-900 whitespace-nowrap">{formatValue(hovered.value)}</div>
          <div className="text-xs text-slate-500 whitespace-nowrap">{hovered.tooltip}</div>
        </div>
      )}
    </div>
  )
}
