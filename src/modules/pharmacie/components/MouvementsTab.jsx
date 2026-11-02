import { useState } from 'react'
import { useMouvements } from '../hooks/usePharmacie'
import { formatDateTime, formatPersonne } from '../../../lib/format'
import { Loader2, Search } from 'lucide-react'

const TYPES = {
  entree: { label: 'Entrée', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sortie: { label: 'Sortie', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ajustement: { label: 'Ajustement', color: 'bg-amber-50 text-amber-700 border-amber-200' },
}

// Quantité signée pour l'affichage : + entrée, - sortie, écart pour un ajustement
const signe = (m) => {
  const q = m.type === 'sortie' ? -m.quantite : m.quantite
  return q > 0 ? `+${q}` : `${q}`
}

export default function MouvementsTab() {
  const { mouvements, loading, error } = useMouvements()
  const [searchTerm, setSearchTerm] = useState('')
  const [type, setType] = useState('')

  const term = searchTerm.trim().toLowerCase()
  const filtered = mouvements.filter(m =>
    (!type || m.type === type) &&
    [m.medicament?.nom, m.motif, m.fournisseur, m.numero_lot].some(v => (v || '').toLowerCase().includes(term))
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none sm:w-52"
        >
          <option value="">Tous les mouvements</option>
          <option value="entree">Entrées</option>
          <option value="sortie">Sorties</option>
          <option value="ajustement">Ajustements</option>
        </select>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 sm:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Médicament, fournisseur, lot..."
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Chargement de l'historique...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">Aucun mouvement.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Médicament</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5 text-right">Quantité</th>
                  <th className="py-3 px-5 text-right">Stock après</th>
                  <th className="py-3 px-5">Détail</th>
                  <th className="py-3 px-5">Par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map(m => (
                  <tr key={m.id}>
                    <td className="py-3 px-5 text-slate-500 whitespace-nowrap text-xs">{formatDateTime(m.created_at)}</td>
                    <td className="py-3 px-5 font-medium text-slate-800">{m.medicament?.nom} {m.medicament?.dosage}</td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TYPES[m.type]?.color}`}>
                        {TYPES[m.type]?.label}
                      </span>
                    </td>
                    <td className={`py-3 px-5 text-right font-semibold ${signe(m).startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{signe(m)}</td>
                    <td className="py-3 px-5 text-right text-slate-700">{m.stock_apres}</td>
                    <td className="py-3 px-5 text-xs text-slate-500">
                      {m.motif}
                      {m.fournisseur && <> • {m.fournisseur}</>}
                      {m.numero_lot && <> • lot {m.numero_lot}</>}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap">{formatPersonne(m.auteur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
