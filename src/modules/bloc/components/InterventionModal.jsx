import { useState } from 'react'
import { Link } from 'react-router-dom'
import { majIntervention, labelAnesthesie } from '../hooks/useBloc'
import StatutBadge from '../../../components/ui/StatutBadge'
import { getAge, formatDateTime, formatMontant, formatPersonne } from '../../../lib/format'
import { X, Loader2, ShieldAlert, Play, CheckCircle2, Ban, Pencil, Printer, AlertTriangle, FolderOpen, CalendarPlus } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Détail d'une intervention et actions selon son statut
export default function InterventionModal({ intervention: i, canManage, onEdit, onPrint, onClose }) {
  const [action, setAction] = useState(null) // 'terminer' | 'annuler'
  const [rapport, setRapport] = useState(i.rapport_operatoire || '')
  const [complications, setComplications] = useState(i.complications || '')
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const run = async (patch) => {
    setBusy(true)
    setError(null)
    const result = await majIntervention(i.id, patch)
    setBusy(false)
    if (result.success) onClose()
    else setError(result.error)
  }

  const p = i.patient || {}
  const ouverte = ['demande', 'programme', 'en_cours'].includes(i.statut)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <div className="pr-8">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-slate-800">{i.libelle_intervention}</h3>
            <StatutBadge statut={i.statut} />
          </div>
          <p className="text-sm text-slate-600 mt-1">
            <b>{p.nom} {p.prenom}</b>
            <span className="font-mono text-xs text-blue-600 ml-2">{p.code_patient}</span>
            <span className="text-slate-400"> • {p.genre} • {getAge(p.date_naissance) ?? '–'} ans • Groupe {p.groupe_sanguin || 'N/C'}</span>
          </p>
        </div>

        {p.allergies && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span><b>Allergies : </b>{p.allergies}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="Créneau" value={i.date_programmee ? `${formatDateTime(i.date_programmee)} • ${i.duree_prevue_min} min` : 'À programmer'} />
          <Info label="Salle" value={i.date_programmee ? i.salle_operation : '–'} />
          <Info label="Chirurgien" value={i.chirurgien ? formatPersonne(i.chirurgien, 'Dr ') : 'Non désigné'} />
          <Info label="Anesthésie" value={labelAnesthesie(i.type_anesthesie)} />
          {i.equipe && <Info label="Équipe" value={i.equipe} wide />}
          {i.demandeur && <Info label="Demandé par" value={formatPersonne(i.demandeur, 'Dr ')} />}
          {i.prix != null && <Info label="Prix facturé" value={formatMontant(i.prix)} />}
          {i.debut_reel && <Info label="Début réel" value={formatDateTime(i.debut_reel)} />}
          {i.fin_reel && <Info label="Fin réelle" value={formatDateTime(i.fin_reel)} />}
          {i.notes_preop && <Info label="Notes préopératoires" value={i.notes_preop} wide />}
          {i.rapport_operatoire && <Info label="Compte rendu opératoire" value={i.rapport_operatoire} wide />}
          {i.complications && <Info label="Complications" value={i.complications} wide />}
          {i.motif_annulation && <Info label="Motif d'annulation" value={i.motif_annulation} wide />}
        </dl>

        {/* Formulaires d'action */}
        {action === 'terminer' && (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
            <div>
              <label className={labelClass}>Compte rendu opératoire</label>
              <textarea rows="6" autoFocus value={rapport} onChange={(e) => setRapport(e.target.value)} className={inputClass}
                placeholder="Voie d'abord, constatations, geste réalisé, fermeture, suites immédiates..." />
            </div>
            <div>
              <label className={labelClass}>Complications (facultatif)</label>
              <input value={complications} onChange={(e) => setComplications(e.target.value)} className={inputClass} placeholder="Aucune" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAction(null)} className="px-3 py-2 text-sm text-slate-500">Retour</button>
              <button
                onClick={() => run({ statut: 'termine', rapport_operatoire: rapport, complications: complications.trim() || null })}
                disabled={busy || !rapport.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Terminer et facturer
              </button>
            </div>
          </div>
        )}

        {action === 'annuler' && (
          <div className="flex flex-wrap items-center gap-2 p-4 bg-red-50/60 border border-red-200 rounded-xl">
            <input autoFocus value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif de l'annulation" className={`${inputClass} flex-1 min-w-48`} />
            <button onClick={() => setAction(null)} className="px-3 py-2 text-sm text-slate-500">Retour</button>
            <button
              onClick={() => run({ statut: 'annule', motif_annulation: motif })}
              disabled={busy || !motif.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Confirmer l'annulation
            </button>
          </div>
        )}

        {/* Boutons */}
        {!action && (
          <div className="flex flex-wrap justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              <Link to={`/patients/${p.id}`} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                <FolderOpen className="w-4 h-4" /> Dossier
              </Link>
              {canManage && ouverte && i.statut !== 'en_cours' && (
                <button onClick={() => setAction('annuler')} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-500 hover:text-red-600">
                  <Ban className="w-4 h-4" /> Annuler
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {i.statut === 'termine' && (
                <button onClick={() => onPrint(i)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Printer className="w-4 h-4" /> Imprimer le compte rendu
                </button>
              )}
              {canManage && i.statut === 'demande' && (
                <button onClick={() => onEdit(i)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
                  <CalendarPlus className="w-4 h-4" /> Programmer
                </button>
              )}
              {canManage && i.statut === 'programme' && (
                <>
                  <button onClick={() => onEdit(i)} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Pencil className="w-4 h-4" /> Modifier
                  </button>
                  <button onClick={() => run({ statut: 'en_cours' })} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Démarrer
                  </button>
                </>
              )}
              {canManage && i.statut === 'en_cours' && (
                <button onClick={() => setAction('terminer')} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Terminer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ label, value, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold text-slate-400 uppercase">{label}</dt>
      <dd className="text-slate-800 whitespace-pre-line">{value || '–'}</dd>
    </div>
  )
}
