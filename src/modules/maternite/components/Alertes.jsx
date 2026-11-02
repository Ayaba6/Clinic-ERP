import { AlertTriangle, AlertCircle } from 'lucide-react'

// Alertes de grossesse : toujours une icône + un libellé, jamais la couleur seule
export default function Alertes({ alertes, compact = false }) {
  if (alertes.length === 0) {
    return compact ? <span className="text-xs text-slate-400">–</span> : null
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {alertes.map(a => {
        const critique = a.niveau === 'critique'
        const Icon = critique ? AlertCircle : AlertTriangle
        return (
          <span
            key={a.texte}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
              critique ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <Icon className="w-3 h-3" />
            {a.texte}
          </span>
        )
      })}
    </div>
  )
}
