import { useEffect, useState } from 'react'
import { useBlocReferentiel, enregistrerIntervention, ANESTHESIES } from '../hooks/useBloc'
import { rechercherPatients } from '../../caisse/hooks/useCaisse'
import { formatMontant } from '../../../lib/format'
import { X, Loader2, ShieldAlert, Search } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'
const DUREES = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360]

const pad = (n) => String(n).padStart(2, '0')
const toDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toHeure = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

// mode « demande » : un médecin demande une intervention (sans créneau)
// mode « programmer » : chirurgien ou admin fixe date, salle, équipe et prix
export default function InterventionFormModal({ mode, intervention, patient: patientInitial, defaultDate, profile, onSaved, onClose }) {
  const ref = useBlocReferentiel()
  const programmer = mode === 'programmer'
  const existing = intervention?.date_programmee ? new Date(intervention.date_programmee) : null

  const [patient, setPatient] = useState(intervention?.patient || patientInitial || null)
  const [values, setValues] = useState({
    libelle_intervention: intervention?.libelle_intervention ?? '',
    date: existing ? toDate(existing) : (defaultDate || ''),
    heure: existing ? toHeure(existing) : '08:00',
    duree_prevue_min: intervention?.duree_prevue_min ?? 60,
    salle_operation: intervention?.salle_operation ?? '',
    chirurgien_principal_id: intervention?.chirurgien_principal_id
      ?? (profile?.role === 'chirurgien' ? profile.id : ''),
    type_anesthesie: intervention?.type_anesthesie ?? 'generale',
    equipe: intervention?.equipe ?? '',
    notes_preop: intervention?.notes_preop ?? '',
    tarif_id: intervention?.tarif_id ?? '',
    prix: intervention?.prix ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  // Salle par défaut : la première disponible
  const salle = values.salle_operation || ref.salles[0]?.nom || ''

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const handleTarif = (e) => {
    const tarif = ref.tarifs.find(t => t.id === e.target.value)
    setValues({ ...values, tarif_id: e.target.value, prix: tarif ? tarif.prix : values.prix })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patient) {
      setFormError('Choisissez le patient.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    const statut = programmer
      ? (intervention && intervention.statut !== 'demande' ? intervention.statut : 'programme')
      : 'demande'
    const result = await enregistrerIntervention(
      { ...values, salle_operation: programmer ? salle : null, patient_id: patient.id, statut,
        ...(programmer ? {} : { date: '', heure: '', tarif_id: '', prix: '' }) },
      intervention?.id
    )
    setSubmitting(false)
    if (result.success) {
      onSaved?.()
      onClose()
    } else {
      setFormError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">
          {programmer ? (intervention?.statut === 'programme' ? 'Modifier l\'intervention' : 'Programmer une intervention') : 'Demander une intervention'}
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          {programmer
            ? 'Le créneau est refusé si la salle est déjà occupée.'
            : 'La demande sera transmise au bloc, qui fixera la date et la salle.'}
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
                  <span className="ml-2 font-mono text-xs text-blue-600">{patient.code_patient}</span>
                </span>
                {!intervention && !patientInitial && (
                  <button type="button" onClick={() => setPatient(null)} className="text-xs text-slate-500 hover:text-slate-800">Changer</button>
                )}
              </div>
            ) : (
              <PatientPicker onPick={setPatient} />
            )}
          </div>

          <div>
            <label className={labelClass}>Intervention</label>
            <input name="libelle_intervention" required value={values.libelle_intervention} onChange={handleChange} className={inputClass} placeholder="Ex: Appendicectomie" />
          </div>

          {programmer && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelClass}>Date</label>
                  <input type="date" name="date" required value={values.date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Heure</label>
                  <input type="time" name="heure" required step="300" value={values.heure} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Durée</label>
                  <select name="duree_prevue_min" value={values.duree_prevue_min} onChange={handleChange} className={inputClass}>
                    {DUREES.map(d => <option key={d} value={d}>{d < 60 ? `${d} min` : `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60}` : ''}`}</option>)}
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className={labelClass}>Salle</label>
                  <select name="salle_operation" value={salle} onChange={handleChange} className={inputClass}>
                    {ref.salles.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Chirurgien principal</label>
                  <select name="chirurgien_principal_id" required value={values.chirurgien_principal_id} onChange={handleChange} className={inputClass}>
                    <option value="">Choisir...</option>
                    {ref.chirurgiens.map(c => (
                      <option key={c.id} value={c.id}>Dr {c.nom} {c.prenom}{c.specialite ? ` — ${c.specialite}` : ''}</option>
                    ))}
                  </select>
                  {ref.chirurgiens.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Aucun compte avec le rôle « Chirurgien ».</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Anesthésie</label>
                  <select name="type_anesthesie" value={values.type_anesthesie} onChange={handleChange} className={inputClass}>
                    {ANESTHESIES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Équipe (anesthésiste, aides, instrumentiste)</label>
                <input name="equipe" value={values.equipe} onChange={handleChange} className={inputClass} placeholder="Ex: Dr Kaboré (anesth.), Inf. Traoré" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tarif</label>
                  <select name="tarif_id" value={values.tarif_id} onChange={handleTarif} className={inputClass}>
                    <option value="">Prix libre</option>
                    {ref.tarifs.map(t => <option key={t.id} value={t.id}>{t.libelle} — {formatMontant(t.prix)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Prix facturé (FCFA)</label>
                  <input type="number" min="0" name="prix" value={values.prix} onChange={handleChange} className={inputClass} placeholder="Facturé à la fin de l'intervention" />
                </div>
              </div>
            </>
          )}

          {!programmer && (
            <div>
              <label className={labelClass}>Chirurgien souhaité (facultatif)</label>
              <select name="chirurgien_principal_id" value={values.chirurgien_principal_id} onChange={handleChange} className={inputClass}>
                <option value="">Au choix du bloc</option>
                {ref.chirurgiens.map(c => <option key={c.id} value={c.id}>Dr {c.nom} {c.prenom}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>{programmer ? 'Notes préopératoires' : 'Indication / notes'}</label>
            <textarea name="notes_preop" rows="3" value={values.notes_preop} onChange={handleChange} className={inputClass} placeholder="Ex: À jeun depuis minuit, bilan sanguin fait..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{programmer ? 'Enregistrer' : 'Envoyer la demande'}</span>
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
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nom, code patient ou téléphone..." className="w-full outline-none text-sm" />
      </div>
      {results.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
          {results.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                <b className="text-slate-800">{p.nom} {p.prenom}</b>
                <span className="ml-2 font-mono text-xs text-blue-600">{p.code_patient}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
