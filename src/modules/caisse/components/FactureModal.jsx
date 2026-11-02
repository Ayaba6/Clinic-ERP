import { useState } from 'react'
import { useFacture, useTarifs, MODES_PAIEMENT, labelMode } from '../hooks/useCaisse'
import StatutBadge from '../../../components/ui/StatutBadge'
import { formatDateTime, formatMontant, formatPersonne } from '../../../lib/format'
import { X, Loader2, Plus, Trash2, Wallet, Printer, Ban, ShieldAlert } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

export default function FactureModal({ factureId, onClose, onPrint }) {
  const { facture, loading, error, addLigne, removeLigne, encaisser, annuler } = useFacture(factureId)
  const [actionError, setActionError] = useState(null)

  const wrap = async (fn) => {
    setActionError(null)
    const result = await fn()
    if (!result.success) setActionError(result.error)
    return result
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Chargement de la facture...</span>
          </div>
        ) : error || !facture ? (
          <div className="py-12 text-center text-sm text-red-600">{error || 'Facture introuvable.'}</div>
        ) : (
          <FactureContent
            facture={facture}
            actionError={actionError}
            onAddLigne={(v) => wrap(() => addLigne(v))}
            onRemoveLigne={(id) => wrap(() => removeLigne(id))}
            onEncaisser={(v) => wrap(() => encaisser(v))}
            onAnnuler={(motif) => wrap(() => annuler(motif))}
            onPrint={() => onPrint(facture)}
          />
        )}
      </div>
    </div>
  )
}

function FactureContent({ facture: f, actionError, onAddLigne, onRemoveLigne, onEncaisser, onAnnuler, onPrint }) {
  const reste = Number(f.montant_total) - Number(f.montant_paye)
  const ouverte = ['en_attente', 'partielle'].includes(f.statut)
  const lignesModifiables = f.statut === 'en_attente'
  const [annulation, setAnnulation] = useState(null)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="pr-8">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-bold text-slate-800 font-mono">{f.numero}</h3>
          <StatutBadge statut={f.statut} />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          <span className="font-semibold">{f.patient?.nom} {f.patient?.prenom}</span>
          <span className="font-mono text-xs text-blue-600 ml-2">{f.patient?.code_patient}</span>
          <span className="text-slate-400"> • {formatDateTime(f.created_at)}</span>
        </p>
        {f.statut === 'annulee' && f.motif_annulation && (
          <p className="text-xs text-slate-500 mt-1">Motif d'annulation : {f.motif_annulation}</p>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Lignes */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase text-left">
              <th className="py-2.5 px-4">Désignation</th>
              <th className="py-2.5 px-4 text-right">Qté</th>
              <th className="py-2.5 px-4 text-right">P.U.</th>
              <th className="py-2.5 px-4 text-right">Montant</th>
              {lignesModifiables && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {f.lignes_facture.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400 italic">Aucune ligne. Ajoutez un acte ci-dessous.</td></tr>
            )}
            {f.lignes_facture.map(l => (
              <tr key={l.id}>
                <td className="py-2.5 px-4 text-slate-800">{l.description}</td>
                <td className="py-2.5 px-4 text-right text-slate-600">{l.quantite}</td>
                <td className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">{formatMontant(l.prix_unitaire)}</td>
                <td className="py-2.5 px-4 text-right font-medium text-slate-800 whitespace-nowrap">{formatMontant(l.montant_total)}</td>
                {lignesModifiables && (
                  <td className="pr-2 text-right">
                    <button onClick={() => onRemoveLigne(l.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Retirer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ouverte && <AjoutLigneForm onAdd={onAddLigne} />}

      {/* Totaux */}
      <div className="flex justify-end">
        <dl className="w-full sm:w-72 space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-semibold text-slate-800">{formatMontant(f.montant_total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Déjà payé</dt><dd className="text-emerald-700">{formatMontant(f.montant_paye)}</dd></div>
          {f.statut !== 'annulee' && (
            <div className="flex justify-between pt-1.5 border-t border-slate-200 text-base">
              <dt className="font-semibold text-slate-700">Reste à payer</dt>
              <dd className={`font-bold ${reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatMontant(reste)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Paiements reçus */}
      {f.paiements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paiements</h4>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl text-sm">
            {f.paiements.map(p => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                <span className="text-slate-600">
                  {formatDateTime(p.created_at)} • {labelMode(p.mode)}{p.reference ? ` (${p.reference})` : ''}
                  <span className="text-slate-400"> • {formatPersonne(p.caissier)}</span>
                </span>
                <span className="font-semibold text-emerald-700">{formatMontant(p.montant)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ouverte && reste > 0 && (
        <EncaissementForm key={`${f.montant_paye}-${f.montant_total}`} reste={reste} onSubmit={onEncaisser} />
      )}

      {/* Actions */}
      <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-slate-100">
        <div>
          {f.statut !== 'annulee' && Number(f.montant_paye) === 0 && (
            annulation === null ? (
              <button
                onClick={() => setAnnulation('')}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600 transition"
              >
                <Ban className="w-4 h-4" /> Annuler la facture
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={annulation}
                  onChange={(e) => setAnnulation(e.target.value)}
                  placeholder="Motif de l'annulation"
                  className="px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                  onClick={async () => { const r = await onAnnuler(annulation); if (r.success) setAnnulation(null) }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium"
                >
                  Confirmer
                </button>
                <button onClick={() => setAnnulation(null)} className="px-3 py-2 text-sm text-slate-500">Retour</button>
              </div>
            )
          )}
        </div>
        {f.paiements.length > 0 && (
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer className="w-4 h-4" /> Imprimer le reçu
          </button>
        )}
      </div>
    </div>
  )
}

function AjoutLigneForm({ onAdd }) {
  const { tarifs } = useTarifs()
  const actifs = tarifs.filter(t => t.actif)
  const [tarifId, setTarifId] = useState('')
  const [description, setDescription] = useState('')
  const [prix, setPrix] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [busy, setBusy] = useState(false)

  const libre = tarifId === 'libre'
  const tarif = actifs.find(t => t.id === tarifId)

  const submit = async () => {
    if (!tarif && !(libre && description.trim() && prix !== '')) return
    setBusy(true)
    const result = await onAdd(libre
      ? { description: description.trim(), prix_unitaire: prix, quantite, type_acte: 'autre' }
      : { tarif, quantite })
    setBusy(false)
    if (result.success) {
      setTarifId('')
      setDescription('')
      setPrix('')
      setQuantite(1)
    }
  }

  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className={libre ? 'md:col-span-4' : 'md:col-span-8'}>
          <label className={labelClass}>Ajouter un acte</label>
          <select value={tarifId} onChange={(e) => setTarifId(e.target.value)} className={inputClass}>
            <option value="">Choisir dans la grille tarifaire...</option>
            {actifs.map(t => (
              <option key={t.id} value={t.id}>{t.libelle} — {formatMontant(t.prix)}</option>
            ))}
            <option value="libre">Autre (saisie libre)</option>
          </select>
        </div>
        {libre && (
          <>
            <div className="md:col-span-3">
              <label className={labelClass}>Désignation</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
            </div>
            <div className="md:col-span-1">
              <label className={labelClass}>Prix</label>
              <input type="number" min="0" value={prix} onChange={(e) => setPrix(e.target.value)} className={inputClass} />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className={labelClass}>Qté</label>
          <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <button
            onClick={submit}
            disabled={busy || (!tarif && !libre)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Ajouter</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function EncaissementForm({ reste, onSubmit }) {
  const [mode, setMode] = useState('especes')
  const [montant, setMontant] = useState(reste)
  const [recu, setRecu] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)

  const especes = mode === 'especes'
  const monnaie = especes && recu !== '' ? Number(recu) - Number(montant) : null

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await onSubmit({ montant, mode, reference })
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-emerald-800">
        <Wallet className="w-4 h-4" /> Encaisser
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Mode de paiement</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
            {MODES_PAIEMENT.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Montant encaissé</label>
          <input type="number" min="1" max={reste} required value={montant} onChange={(e) => setMontant(e.target.value)} className={inputClass} />
          {Number(montant) < reste && Number(montant) > 0 && (
            <p className="text-xs text-amber-700 mt-1">Paiement partiel : reste {formatMontant(reste - Number(montant))}</p>
          )}
        </div>
        {especes ? (
          <div>
            <label className={labelClass}>Montant reçu (facultatif)</label>
            <input type="number" min="0" value={recu} onChange={(e) => setRecu(e.target.value)} className={inputClass} placeholder="Ex: 10000" />
            {monnaie !== null && (
              <p className={`text-xs mt-1 font-semibold ${monnaie >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {monnaie >= 0 ? `Monnaie à rendre : ${formatMontant(monnaie)}` : 'Montant reçu insuffisant'}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className={labelClass}>Référence</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
              placeholder={mode === 'assurance' ? 'N° de prise en charge' : 'N° de transaction'}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          <span>Encaisser {formatMontant(montant)}</span>
        </button>
      </div>
    </form>
  )
}
