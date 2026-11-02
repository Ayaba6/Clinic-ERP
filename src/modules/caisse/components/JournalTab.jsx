import { useState } from 'react'
import { useJournal, labelMode, totauxJournal } from '../hooks/useCaisse'
import { formatMontant, formatPersonne } from '../../../lib/format'
import { Loader2, Printer } from 'lucide-react'

// Date du jour au format AAAA-MM-JJ (heure locale)
const aujourdhuiISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function JournalTab({ onPrint }) {
  const [jour, setJour] = useState(aujourdhuiISO)
  const { paiements, loading, error } = useJournal(jour)
  const { parMode, parCaissier, total } = totauxJournal(paiements)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Journée</label>
          <input
            type="date"
            value={jour}
            max={aujourdhuiISO()}
            onChange={(e) => e.target.value && setJour(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => onPrint({ jour, paiements })}
          disabled={paiements.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <Printer className="w-4 h-4" /> Imprimer la clôture
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Chargement du journal...</span>
        </div>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total encaissé</p>
              <p className="text-3xl font-extrabold">{formatMontant(total)}</p>
              <p className="text-xs text-slate-400 mt-1">{paiements.length} paiement(s)</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Par mode de paiement</p>
              {parMode.length === 0 ? <p className="text-sm text-slate-400">–</p> : (
                <ul className="space-y-1 text-sm">
                  {parMode.map(m => (
                    <li key={m.key} className="flex justify-between"><span className="text-slate-600">{m.label}</span><b className="text-slate-800">{formatMontant(m.total)}</b></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Par caissier</p>
              {parCaissier.length === 0 ? <p className="text-sm text-slate-400">–</p> : (
                <ul className="space-y-1 text-sm">
                  {parCaissier.map(([nom, t]) => (
                    <li key={nom} className="flex justify-between"><span className="text-slate-600">{nom}</span><b className="text-slate-800">{formatMontant(t)}</b></li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Détail */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {paiements.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">Aucun paiement ce jour-là.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="py-3 px-5">Heure</th>
                      <th className="py-3 px-5">Facture</th>
                      <th className="py-3 px-5">Patient</th>
                      <th className="py-3 px-5">Mode</th>
                      <th className="py-3 px-5">Caissier</th>
                      <th className="py-3 px-5 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paiements.map(p => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-5 text-slate-500">{new Date(p.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-2.5 px-5 font-mono text-xs text-blue-600">{p.facture?.numero}</td>
                        <td className="py-2.5 px-5 text-slate-800">{p.facture?.patient?.nom} {p.facture?.patient?.prenom}</td>
                        <td className="py-2.5 px-5 text-slate-600">{labelMode(p.mode)}{p.reference ? <span className="text-xs text-slate-400"> ({p.reference})</span> : ''}</td>
                        <td className="py-2.5 px-5 text-slate-500 text-xs">{formatPersonne(p.caissier)}</td>
                        <td className="py-2.5 px-5 text-right font-semibold text-slate-800 whitespace-nowrap">{formatMontant(p.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
