// Libellés et couleurs des statuts (valeurs des contraintes CHECK de la base)
const STATUTS = {
  en_attente: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  en_consultation: { label: 'En consultation', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  termine: { label: 'Terminé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  annule: { label: 'Annulé', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  programme: { label: 'Programmé', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  en_cours: { label: 'En cours', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  partielle: { label: 'Partielle', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  payee: { label: 'Payée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  annulee: { label: 'Annulée', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  prescrit: { label: 'Prescrit', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  delivre: { label: 'Délivré', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export default function StatutBadge({ statut }) {
  const s = STATUTS[statut] || { label: statut || '–', color: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>
      {s.label}
    </span>
  )
}
