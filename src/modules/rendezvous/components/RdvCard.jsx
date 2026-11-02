import { useState } from 'react'
import { Link } from 'react-router-dom'
import { arriverRdv, changerStatutRdv, typeRdv, heure, estPasse, STATUTS_RDV } from '../hooks/useRendezVous'
import { titreSoignant } from '../../../lib/roles'
import { formatPersonne } from '../../../lib/format'
import { Loader2, LogIn, Check, Pencil, UserX, X, Phone, Clock } from 'lucide-react'

export const BadgeRdv = ({ statut }) => {
  const s = STATUTS_RDV[statut] || STATUTS_RDV.prevu
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>{s.label}</span>
}

// Carte d'un rendez-vous avec les actions de la réception
export default function RdvCard({ rdv: r, canWrite, showPraticien, onEdit }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [annulation, setAnnulation] = useState(null)
  const type = typeRdv(r.type)
  const actif = ['prevu', 'confirme'].includes(r.statut)

  const run = async (key, fn) => {
    setBusy(key)
    setError(null)
    const result = await fn()
    setBusy(null)
    if (!result.success) setError(result.error)
    return result
  }

  return (
    <div className={`p-3 rounded-xl border transition ${actif ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/70'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {r.heure_a_confirmer ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><Clock className="w-3.5 h-3.5" /> Heure à fixer</span>
            ) : (
              <span className="text-sm font-bold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{heure(r.date_heure)}</span>
            )}
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${type.color}`}>{type.label}</span>
            <BadgeRdv statut={r.statut} />
          </div>
          <Link to={`/patients/${r.patient?.id}`} className="block mt-1 text-sm font-medium text-slate-800 hover:text-blue-700 truncate">
            {r.patient?.nom} {r.patient?.prenom}
          </Link>
          <div className="text-xs text-slate-500 flex flex-wrap gap-x-2">
            {r.patient?.telephone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {r.patient.telephone}</span>}
            {showPraticien && <span>{r.praticien ? formatPersonne(r.praticien, titreSoignant(r.praticien.role)) : 'Non attribué'}</span>}
          </div>
          {r.motif && <p className="text-xs text-slate-600 mt-0.5">{r.motif}</p>}
          {r.statut === 'annule' && r.motif_annulation && <p className="text-xs text-slate-400 mt-0.5">Annulé : {r.motif_annulation}</p>}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}

      {canWrite && actif && annulation === null && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => run('arrive', () => arriverRdv(r.id))}
            disabled={!!busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            title="La patiente est arrivée : elle passe en file d'attente"
          >
            {busy === 'arrive' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />} Arrivé(e)
          </button>
          {r.statut === 'prevu' && (
            <button onClick={() => run('confirme', () => changerStatutRdv(r.id, 'confirme'))} disabled={!!busy}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> Confirmé
            </button>
          )}
          <button onClick={() => onEdit(r)} className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
            <Pencil className="w-3.5 h-3.5" /> {r.heure_a_confirmer ? 'Fixer l\'heure' : 'Modifier'}
          </button>
          {estPasse(r.date_heure) && (
            <button onClick={() => run('absent', () => changerStatutRdv(r.id, 'absent'))} disabled={!!busy}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <UserX className="w-3.5 h-3.5" /> Absent
            </button>
          )}
          <button onClick={() => setAnnulation('')} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600">
            <X className="w-3.5 h-3.5" /> Annuler
          </button>
        </div>
      )}

      {annulation !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input autoFocus value={annulation} onChange={(e) => setAnnulation(e.target.value)} placeholder="Motif"
            className="flex-1 min-w-32 px-2 py-1 border border-slate-300 rounded-lg text-xs outline-none" />
          <button onClick={() => setAnnulation(null)} className="px-2 py-1 text-xs text-slate-500">Retour</button>
          <button
            onClick={async () => { const res = await run('annule', () => changerStatutRdv(r.id, 'annule', annulation)); if (res.success) setAnnulation(null) }}
            className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold"
          >
            Annuler le RDV
          </button>
        </div>
      )}

      {r.statut === 'arrive' && <p className="mt-1 text-xs text-amber-800 font-medium">En file d'attente</p>}
    </div>
  )
}
