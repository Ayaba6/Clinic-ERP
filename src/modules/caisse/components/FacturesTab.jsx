import { useState } from 'react'
import { useFactures } from '../hooks/useCaisse'
import StatutBadge from '../../../components/ui/StatutBadge'
import { formatAttente, formatDateTime, formatMontant } from '../../../lib/format'
import { Loader2, Search } from 'lucide-react'

const PERIODES = [[0, "Aujourd'hui"], [7, '7 jours'], [30, '30 jours'], [90, '3 mois']]

// vue « a_encaisser » : file de la caisse ; vue « toutes » : historique filtrable
export default function FacturesTab({ vue, onOpen }) {
  const [periode, setPeriode] = useState(30)
  const [statut, setStatut] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { factures, loading, error } = useFactures(vue, periode)

  const term = searchTerm.trim().toLowerCase()
  const filtered = factures.filter(f =>
    (!statut || f.statut === statut) &&
    [f.numero, f.patient?.nom, f.patient?.prenom, f.patient?.code_patient].some(v => (v || '').toLowerCase().includes(term))
  )

  const totalReste = filtered.reduce((s, f) => s + (Number(f.montant_total) - Number(f.montant_paye)), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        {vue === 'toutes' ? (
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-sm">
              {PERIODES.map(([j, label]) => (
                <button
                  key={j}
                  onClick={() => setPeriode(j)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${periode === j ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none">
              <option value="">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="partielle">Partielle</option>
              <option value="payee">Payée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            {filtered.length} facture(s) • Reste à encaisser : <b className="text-slate-800">{formatMontant(totalReste)}</b>
          </p>
        )}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 lg:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="N° facture, patient..."
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <span>Chargement des factures...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            {vue === 'a_encaisser' ? 'Aucune facture à encaisser. Les nouvelles apparaissent automatiquement.' : 'Aucune facture sur cette période.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-5">N°</th>
                  <th className="py-3 px-5">Patient</th>
                  <th className="py-3 px-5">{vue === 'a_encaisser' ? 'Depuis' : 'Date'}</th>
                  <th className="py-3 px-5 text-right">Total</th>
                  <th className="py-3 px-5 text-right">Reste</th>
                  <th className="py-3 px-5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map(f => {
                  const reste = Number(f.montant_total) - Number(f.montant_paye)
                  return (
                    <tr key={f.id} onClick={() => onOpen(f.id)} className="hover:bg-brand-50/40 cursor-pointer transition">
                      <td className="py-3 px-5 font-mono font-medium text-brand-600 whitespace-nowrap">{f.numero}</td>
                      <td className="py-3 px-5">
                        <div className="font-medium text-slate-800">{f.patient?.nom} {f.patient?.prenom}</div>
                        <div className="text-xs text-slate-400 font-mono">{f.patient?.code_patient}</div>
                      </td>
                      <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap">
                        {vue === 'a_encaisser' ? formatAttente(f.created_at) : formatDateTime(f.created_at)}
                      </td>
                      <td className="py-3 px-5 text-right font-medium text-slate-800 whitespace-nowrap">{formatMontant(f.montant_total)}</td>
                      <td className={`py-3 px-5 text-right font-semibold whitespace-nowrap ${reste > 0 && f.statut !== 'annulee' ? 'text-red-600' : 'text-slate-400'}`}>
                        {f.statut === 'annulee' ? '–' : formatMontant(reste)}
                      </td>
                      <td className="py-3 px-5"><StatutBadge statut={f.statut} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
