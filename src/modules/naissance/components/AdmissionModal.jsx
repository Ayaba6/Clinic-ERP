import { useEffect, useState } from 'react'
import { admettre } from '../hooks/useNaissance'
import { rechercherPatients } from '../../caisse/hooks/useCaisse'
import { X, Loader2, ShieldAlert, Search } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Admission d'une parturiente en salle de naissance
export default function AdmissionModal({ patient: patientInitial, onSaved, onClose }) {
  const [patient, setPatient] = useState(patientInitial || null)
  const [values, setValues] = useState({ motif_admission: 'Travail', poche_eaux: 'intacte' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patient) return setFormError('Choisissez la patiente.')
    setSubmitting(true)
    setFormError(null)
    const result = await admettre({ ...values, patient_id: patient.id })
    setSubmitting(false)
    if (result.success) {
      onSaved?.(result.id)
      onClose()
    } else {
      setFormError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-slate-800 mb-1">Admission en salle de naissance</h3>
        <p className="text-xs text-slate-500 mb-6">Le suivi de grossesse en cours est rattaché automatiquement.</p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Parturiente</label>
            {patient ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <span>
                  <b className="text-slate-800">{patient.nom} {patient.prenom}</b>
                  <span className="ml-2 font-mono text-xs text-brand-600">{patient.code_patient}</span>
                </span>
                {!patientInitial && (
                  <button type="button" onClick={() => setPatient(null)} className="text-xs text-slate-500 hover:text-slate-800">Changer</button>
                )}
              </div>
            ) : (
              <PatientePicker onPick={setPatient} />
            )}
          </div>

          <div>
            <label className={labelClass}>Motif d'admission</label>
            <select value={values.motif_admission} onChange={(e) => setValues({ ...values, motif_admission: e.target.value })} className={inputClass}>
              <option>Travail</option>
              <option>Rupture prématurée des membranes</option>
              <option>Pertes de sang</option>
              <option>Terme dépassé / déclenchement</option>
              <option>Césarienne programmée</option>
              <option>Autre</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Poche des eaux</label>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-sm">
              {[['intacte', 'Intacte'], ['rompue', 'Rompue']].map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setValues({ ...values, poche_eaux: k })}
                  className={`px-4 py-1.5 rounded-lg font-medium ${values.poche_eaux === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Admettre
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PatientePicker({ onPick }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const data = await rechercherPatients(term)
      if (!cancelled) setResults(data.filter(p => p.genre === 'F'))
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
      {term.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-slate-400 mt-1">Aucune patiente trouvée. Enregistrez-la d'abord à la réception.</p>
      )}
      {results.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
          {results.map(p => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                <b className="text-slate-800">{p.nom} {p.prenom}</b>
                <span className="ml-2 font-mono text-xs text-brand-600">{p.code_patient}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
