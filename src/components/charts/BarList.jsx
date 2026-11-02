import { CHART } from './chartUtils'

// Barres horizontales classées (une série) : libellé, barre, valeur au bout.
// data : [{ key, label, value }]
export default function BarList({ data, formatValue, empty = 'Aucune donnée sur la période.' }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{empty}</p>
  }
  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <ul className="space-y-3">
      {data.map(d => (
        <li
          key={d.key}
          className="group"
          title={`${d.label} : ${formatValue(d.value)}`}
        >
          <div className="mb-1 truncate text-xs text-slate-600">{d.label}</div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div
                className="h-3.5 rounded-r transition-opacity group-hover:opacity-80"
                style={{ width: `${Math.max(1, (d.value / max) * 100)}%`, background: CHART.series }}
              />
            </div>
            <span className="w-28 shrink-0 whitespace-nowrap text-right text-sm font-semibold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatValue(d.value)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
