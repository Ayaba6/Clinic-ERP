import { useEffect, useState } from 'react'
import { enregistrerRdv, usePraticiens, TYPES_RDV, isoJour } from '../hooks/useRendezVous'
import { rechercherPatients } from '../../caisse/hooks/useCaisse'
import { titreSoignant } from '../../../lib/roles'
import { X, Loader2, ShieldAlert, Search } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'
const DUREES = [10, 15, 20, 30, 45, 60]

const pad = (n) => String(n).padStart(2, '0')

// Création ou modification d'un rendez-vous
export default function RdvFormModal({ rdv, patient: patientInitial, defaultDate, defaultPraticien, onSaved, onClose }) {
  const praticiens = usePraticiens()
  const existant = rdv?.date_heure ? new Date(rdv.date_heure) : null
  const [patient, setPatient] = useState(rdv?.patient || patientInitial || null)
  const [values, setValues] = useState({
    praticien_id: rdv?.praticien_id ?? defaultPraticien ?? '',
    type: rdv?.type ?? 'consultation',
    date: existant ? isoJour(existant) : (defaultDate || ''),
    // Rendez-vous automatique (CPN) : heure à fixer
    heure: existant && !rdv.heure_a_confirmer ? `${pad(existant.getHours())}:${pad(existant.getMinutes())}` : '08:00',
    duree_min: rdv?.duree_min ?? 20,
    motif: rdv?.motif ?? '',
    notes: rdv?.notes ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patient) return setFormError('Choisissez le patient.')
    setSubmitting(true)
    setFormError(null)
    const result = await enregistrerRdv({ ...values, patient_id: patient.id }, rdv?.id)
    setSubmitting(false)
    if (result.success) {
      onSaved?.()
      onClose()
    } else {
      setFormError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{rdv ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
        <p className="text-xs text-slate-500 mb-6">
          {rdv?.heure_a_confirmer ? 'Rendez-vous créé automatiquement après une CPN : fixez l\'heure.' : 'Le créneau est refusé si le praticien est déjà pris.'}
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Patient</label>
            {patient ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <span>
                  <b className="text-slate-800">{patient.nom} {patient.prenom}</b>
                  <span className="ml-2 font-mono text-xs text-brand-600">{patient.code_patient}</span>
                  {patient.telephone && <span className="ml-2 text-xs text-slate-500">{patient.telephone}</span>}
                </span>
                {!rdv && !patientInitial && (
                  <button type="button" onClick={() => setPatient(null)} className="text-xs text-slate-500 hover:text-slate-800">Changer</button>
                )}
              </div>
            ) : (
              <PatientPicker onPick={setPatient} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Type</label>
              <select name="type" value={values.type} onChange={handleChange} className={inputClass}>
                {TYPES_RDV.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Praticien</label>
              <select name="praticien_id" value={values.praticien_id} onChange={handleChange} className={inputClass}>
                <option value="">Non attribué</option>
                {praticiens.map(p => <option key={p.id} value={p.id}>{titreSoignant(p.role)}{p.nom} {p.prenom}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelClass}>Date</label>
              <input type="date" name="date" required value={values.date} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Heure</label>
              <input type="time" name="heure" required step="300" value={values.heure} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Durée</label>
              <select name="duree_min" value={values.duree_min} onChange={handleChange} className={inputClass}>
                {DUREES.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Motif</label>
            <input name="motif" value={values.motif} onChange={handleChange} className={inputClass} placeholder="Ex: Contrôle tension, résultats d'analyses..." />
          </div>
          <div>
            <label className={labelClass}>Notes (facultatif)</label>
            <textarea name="notes" rows="2" value={values.notes} onChange={handleChange} className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PatientPicker({ onPick }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const data = await rechercherPatients(term)
      if (!cancelled) setResults(data)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term])

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-xl">
        <Search className="w-4 h-4 text-slate-400" />
        <input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nom, code patient ou téléphone..." className="w-full outline-none text-sm" />
      </div>
      {results.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
          {results.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                <b className="text-slate-800">{p.nom} {p.prenom}</b>
                <span className="ml-2 font-mono text-xs text-brand-600">{p.code_patient}</span>
                <span className="ml-2 text-xs text-slate-400">{p.telephone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
