// Jauge horizontale (0–100 %) : piste dans une teinte claire de la même gamme,
// remplissage selon l'état, repère facultatif (ex. fourchette de référence).
const ETATS = {
  bon: 'bg-brand-600',
  attention: 'bg-[#fab219]',
  critique: 'bg-[#d03b3b]',
}

export default function Jauge({ valeur, etat = 'bon', repere, libelleRepere }) {
  const v = Math.max(0, Math.min(100, valeur ?? 0))
  return (
    <div className="relative pt-1">
      <div className="h-2.5 rounded-full bg-brand-100 overflow-hidden" role="meter" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${ETATS[etat]} transition-all`} style={{ width: `${v}%` }} />
      </div>
      {repere && (
        <div
          className="absolute top-0 h-[18px] bg-slate-400/25 border-x border-slate-400/60"
          style={{ left: `${repere[0]}%`, width: `${repere[1] - repere[0]}%` }}
          title={libelleRepere}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
