import { labelMode, totauxJournal } from '../hooks/useCaisse'
import { aujourdhui, formatDate, formatDateTime, formatMontant, formatPersonne } from '../../../lib/format'

// Reçu de paiement imprimable
export function Recu({ facture: f }) {
  const reste = Number(f.montant_total) - Number(f.montant_paye)
  return (
    <div className="max-w-xl mx-auto text-slate-900 text-sm space-y-6">
      <div className="flex justify-between items-start border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-xl font-bold">Clinic ERP</h1>
          <p className="text-xs text-slate-600">Reçu de paiement</p>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold">{f.numero}</div>
          <div className="text-xs text-slate-600">Imprimé le {aujourdhui()}</div>
        </div>
      </div>

      <div>
        <span className="font-semibold">Patient : </span>
        {f.patient?.nom} {f.patient?.prenom} ({f.patient?.code_patient})
        <div className="text-xs text-slate-600">Facture du {formatDate(f.created_at)}</div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase">
            <th className="py-1.5">Désignation</th>
            <th className="py-1.5 text-right">Qté</th>
            <th className="py-1.5 text-right">P.U.</th>
            <th className="py-1.5 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {f.lignes_facture.map(l => (
            <tr key={l.id} className="border-b border-slate-100">
              <td className="py-1.5">{l.description}</td>
              <td className="py-1.5 text-right">{l.quantite}</td>
              <td className="py-1.5 text-right">{formatMontant(l.prix_unitaire)}</td>
              <td className="py-1.5 text-right">{formatMontant(l.montant_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1">
        <div className="flex justify-between"><span>Total</span><b>{formatMontant(f.montant_total)}</b></div>
        {f.paiements.map(p => (
          <div key={p.id} className="flex justify-between text-xs text-slate-600">
            <span>{formatDateTime(p.created_at)} — {labelMode(p.mode)}</span>
            <span>{formatMontant(p.montant)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-300 pt-1"><span>Total payé</span><b>{formatMontant(f.montant_paye)}</b></div>
        <div className="flex justify-between"><span>Reste à payer</span><b>{formatMontant(reste)}</b></div>
      </div>

      <div className="pt-10 flex justify-between text-xs text-slate-600">
        <span>Caissier : {formatPersonne(f.paiements[f.paiements.length - 1]?.caissier)}</span>
        <span>Signature et cachet</span>
      </div>
    </div>
  )
}

// Clôture de caisse journalière imprimable
export function ClotureCaisse({ jour, paiements }) {
  const { parMode, parCaissier, total } = totauxJournal(paiements)
  return (
    <div className="max-w-2xl mx-auto text-slate-900 text-sm space-y-6">
      <div className="flex justify-between items-start border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-xl font-bold">Clinic ERP</h1>
          <p className="text-xs text-slate-600">Clôture de caisse</p>
        </div>
        <div className="text-right">
          <div className="font-bold">Journée du {formatDate(`${jour}T12:00:00`)}</div>
          <div className="text-xs text-slate-600">Imprimé le {aujourdhui()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="font-bold mb-2">Par mode de paiement</h2>
          {parMode.map(m => (
            <div key={m.key} className="flex justify-between"><span>{m.label}</span><span>{formatMontant(m.total)}</span></div>
          ))}
        </div>
        <div>
          <h2 className="font-bold mb-2">Par caissier</h2>
          {parCaissier.map(([nom, t]) => (
            <div key={nom} className="flex justify-between"><span>{nom}</span><span>{formatMontant(t)}</span></div>
          ))}
        </div>
      </div>

      <div className="flex justify-between text-lg border-y border-slate-300 py-2">
        <span className="font-bold">Total encaissé ({paiements.length} paiements)</span>
        <b>{formatMontant(total)}</b>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left uppercase">
            <th className="py-1">Heure</th>
            <th className="py-1">Facture</th>
            <th className="py-1">Patient</th>
            <th className="py-1">Mode</th>
            <th className="py-1 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {paiements.map(p => (
            <tr key={p.id} className="border-b border-slate-100">
              <td className="py-1">{new Date(p.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
              <td className="py-1 font-mono">{p.facture?.numero}</td>
              <td className="py-1">{p.facture?.patient?.nom} {p.facture?.patient?.prenom}</td>
              <td className="py-1">{labelMode(p.mode)}</td>
              <td className="py-1 text-right">{formatMontant(p.montant)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-slate-600">
        <span>Signature du caissier</span>
        <span className="text-right">Signature du responsable</span>
      </div>
    </div>
  )
}
