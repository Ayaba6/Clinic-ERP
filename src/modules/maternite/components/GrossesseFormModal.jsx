import { useEffect, useState } from 'react'
import { enregistrerGrossesse, termeDepuisDdr, joursDeGrossesse, formatSA } from '../hooks/useMaternite'
import { rechercherPatients } from '../../caisse/hooks/useCaisse'
import { X, Loader2, ShieldAlert, Search } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Ouverture (ou modification) d'un suivi de grossesse
export default function GrossesseFormModal({ grossesse, patient: patientInitial, onSaved, onClose }) {
  const [patient, setPatient] = useState(grossesse?.patient || patientInitial || null)
  const [values, setValues] = useState({
    ddr: grossesse?.ddr ?? '',
    date_terme_prevue: grossesse?.date_terme_prevue ?? '',
    gestite: grossesse?.gestite ?? '',
    parite: grossesse?.parite ?? '',
    avortements: grossesse?.avortements ?? '',
    enfants_vivants: grossesse?.enfants_vivants ?? '',
    antecedents: grossesse?.antecedents ?? '',
    grossesse_a_risque: grossesse?.grossesse_a_risque ?? false,
    facteurs_risque: grossesse?.facteurs_risque ?? '',
  })
  // Le terme suit la DDR tant qu'il n'a pas été corrigé à la main (échographie)
  const [termeManuel, setTermeManuel] = useState(!!grossesse && grossesse.date_terme_prevue !== termeDepuisDdr(grossesse.ddr))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const terme = termeManuel ? values.date_terme_prevue : (termeDepuisDdr(values.ddr) || values.date_terme_prevue)
  const apercuSA = (values.ddr || terme) ? formatSA(joursDeGrossesse({ ddr: values.ddr || null, date_terme_prevue: terme })) : null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setValues({ ...values, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patient) return setFormError('Choisissez la patiente.')
    if (patient.genre && patient.genre !== 'F') return setFormError('Le suivi de grossesse concerne uniquement une patiente.')
    if (!values.ddr && !terme) return setFormError('Indiquez la date des dernières règles ou le terme prévu.')
    setSubmitting(true)
    setFormError(null)
    const result = await enregistrerGrossesse({ ...values, date_terme_prevue: terme, patient_id: patient.id }, grossesse?.id)
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">{grossesse ? 'Modifier le suivi de grossesse' : 'Nouveau suivi de grossesse'}</h3>
        <p className="text-xs text-slate-500 mb-6">Le terme est calculé automatiquement à partir de la DDR (DDR + 280 jours).</p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Patiente</label>
            {patient ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <span>
                  <b className="text-slate-800">{patient.nom} {patient.prenom}</b>
                  <span className="ml-2 font-mono text-xs text-brand-600">{patient.code_patient}</span>
                </span>
                {!grossesse && !patientInitial && (
                  <button type="button" onClick={() => setPatient(null)} className="text-xs text-slate-500 hover:text-slate-800">Changer</button>
                )}
              </div>
            ) : (
              <PatientePicker onPick={setPatient} />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Dernières règles (DDR)</label>
              <input type="date" name="ddr" value={values.ddr} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Terme prévu</label>
              <input
                type="date"
                value={terme}
                onChange={(e) => { setTermeManuel(true); setValues({ ...values, date_terme_prevue: e.target.value }) }}
                className={inputClass}
              />
              {termeManuel && values.ddr && (
                <button type="button" onClick={() => setTermeManuel(false)} className="text-xs text-brand-600 mt-1 hover:underline">
                  Recalculer depuis la DDR
                </button>
              )}
            </div>
            <div>
              <label className={labelClass}>Âge gestationnel</label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800">{apercuSA || '–'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[['gestite', 'Gestité (G)'], ['parite', 'Parité (P)'], ['avortements', 'Avortements'], ['enfants_vivants', 'Enfants vivants']].map(([name, label]) => (
              <div key={name}>
                <label className={labelClass}>{label}</label>
                <input type="number" min={name === 'gestite' ? 1 : 0} name={name} value={values[name]} onChange={handleChange} className={inputClass} />
              </div>
            ))}
          </div>

          <div>
            <label className={labelClass}>Antécédents (obstétricaux, médicaux, chirurgicaux)</label>
            <textarea name="antecedents" rows="2" value={values.antecedents} onChange={handleChange} className={inputClass}
              placeholder="Ex: Césarienne en 2023, drépanocytose AS..." />
          </div>

          <div className="p-4 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="grossesse_a_risque" checked={values.grossesse_a_risque} onChange={handleChange} className="w-4 h-4 accent-red-600" />
              Grossesse à risque
            </label>
            {values.grossesse_a_risque && (
              <textarea name="facteurs_risque" rows="2" value={values.facteurs_risque} onChange={handleChange} className={inputClass}
                placeholder="Ex: HTA chronique, âge > 35 ans, utérus cicatriciel, grossesse gémellaire..." />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{grossesse ? 'Enregistrer' : 'Ouvrir le suivi'}</span>
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
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nom, code patient ou téléphone..." className="w-full outline-none text-sm" />
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
