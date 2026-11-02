import { useState } from 'react'
import { etatStock, etatPeremption } from '../hooks/usePharmacie'
import MedicamentFormModal from './MedicamentFormModal'
import StockMovementModal from './StockMovementModal'
import { formatDate, formatMontant, joursRestants } from '../../../lib/format'
import { Loader2, Search, Plus, PackagePlus, SlidersHorizontal, Pencil } from 'lucide-react'

const STOCK_STYLES = {
  rupture: 'bg-red-50 text-red-700 border-red-200',
  bas: 'bg-amber-50 text-amber-700 border-amber-200',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const FILTRES = [
  ['tous', 'Tous'],
  ['alerte', 'Ruptures & stock bas'],
  ['peremption', 'Périmés & < 3 mois'],
]

export default function StockTab({ medicamentsState }) {
  const { medicaments, loading, error, saveMedicament, entreeStock, ajusterStock } = medicamentsState
  const [searchTerm, setSearchTerm] = useState('')
  const [filtre, setFiltre] = useState('tous')
  // Fenêtre ouverte : { type: 'fiche' | 'entree' | 'ajustement', medicament }
  const [modal, setModal] = useState(null)

  const term = searchTerm.trim().toLowerCase()
  const filtered = medicaments.filter(m => {
    if (filtre === 'alerte' && etatStock(m) === 'ok') return false
    if (filtre === 'peremption' && !['perime', 'proche'].includes(etatPeremption(m))) return false
    return [m.nom, m.dosage, m.forme, m.code_codebarre].some(v => (v || '').toLowerCase().includes(term))
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-sm overflow-x-auto">
          {FILTRES.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltre(key)}
              className={`px-4 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${filtre === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 flex-1 lg:w-72">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom, dosage, code-barres..."
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setModal({ type: 'fiche', medicament: null })}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Chargement du stock...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            {medicaments.length === 0 ? 'Aucun médicament. Commencez par « Nouveau ».' : 'Aucun médicament ne correspond.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-5">Médicament</th>
                  <th className="py-3 px-5">Prix</th>
                  <th className="py-3 px-5">Stock</th>
                  <th className="py-3 px-5">Péremption</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map(m => {
                  const stock = etatStock(m)
                  const peremption = etatPeremption(m)
                  const jours = joursRestants(m.date_peremption)
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800">{m.nom} {m.dosage}</div>
                        <div className="text-xs text-slate-500">
                          {m.forme || '–'}{m.code_codebarre && <span className="font-mono"> • {m.code_codebarre}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-slate-700 whitespace-nowrap">{formatMontant(m.prix_vente)}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STOCK_STYLES[stock]}`}>
                          {m.stock_actuel}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">seuil {m.seuil_alerte}</div>
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <div className="text-slate-700">{formatDate(m.date_peremption)}</div>
                        {peremption === 'perime' && <div className="text-xs font-semibold text-red-600">Périmé</div>}
                        {peremption === 'proche' && <div className="text-xs font-semibold text-amber-600">Dans {jours} j</div>}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setModal({ type: 'entree', medicament: m })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                            title="Entrée de stock"
                          >
                            <PackagePlus className="w-3.5 h-3.5" /> Entrée
                          </button>
                          <button
                            onClick={() => setModal({ type: 'ajustement', medicament: m })}
                            className="p-1.5 text-slate-500 border border-slate-200 rounded-lg hover:text-slate-800 hover:bg-slate-50 transition"
                            title="Ajuster (inventaire)"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'fiche', medicament: m })}
                            className="p-1.5 text-slate-500 border border-slate-200 rounded-lg hover:text-slate-800 hover:bg-slate-50 transition"
                            title="Modifier la fiche"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.type === 'fiche' && (
        <MedicamentFormModal
          medicament={modal.medicament}
          onSubmit={(values) => saveMedicament(values, modal.medicament?.id)}
          onClose={() => setModal(null)}
        />
      )}
      {(modal?.type === 'entree' || modal?.type === 'ajustement') && (
        <StockMovementModal
          mode={modal.type}
          medicament={modal.medicament}
          onSubmit={(values) => (modal.type === 'entree'
            ? entreeStock(modal.medicament.id, values)
            : ajusterStock(modal.medicament.id, values))}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
