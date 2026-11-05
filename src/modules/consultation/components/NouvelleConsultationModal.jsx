import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTypesConsultation, typeParDefaut, ouvrirConsultation } from '../hooks/useTypesConsultation'
import { rechercherPatients } from '../../caisse/hooks/useCaisse'
import { formatMontant } from '../../../lib/format'
import { X, Loader2, ShieldAlert, Search, Stethoscope } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Le praticien ouvre lui-même une consultation (patient déjà enregistré)
export default function NouvelleConsultationModal({ profile, onClose }) {
  const navigate = useNavigate()
  const types = useTypesConsultation()
  const [patient, setPatient] = useState(null)
  const [tarifId, setTarifId] = useState('')
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const typeChoisi = tarifId || typeParDefaut(types, profile?.role)
  const tarif = types.find(t => t.id === typeChoisi)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!patient) return setFormError('Choisissez le patient.')
    setSubmitting(true)
    setFormError(null)
    const result = await ouvrirConsultation({ patientId: patient.id, praticienId: profile.id, tarifId: typeChoisi, motif })
    setSubmitting(false)
    if (result.success) navigate(`/consultation/${result.id}`)
    else setFormError(result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-slate-800 mb-1">Nouvelle consultation</h3>
        <p className="text-xs text-slate-500 mb-6">Le patient doit déjà avoir un dossier. Le type de consultation choisi est celui facturé à la caisse.</p>

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
                </span>
                <button type="button" onClick={() => setPatient(null)} className="text-xs text-slate-500 hover:text-slate-800">Changer</button>
              </div>
            ) : (
              <PatientPicker onPick={setPatient} />
            )}
          </div>

          <div>
            <label className={labelClass}>Type de consultation</label>
            <select value={typeChoisi} onChange={(e) => setTarifId(e.target.value)} className={inputClass}>
              {types.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
            </select>
            {tarif && (
              <p className={`text-xs mt-1 ${Number(tarif.prix) > 0 ? 'text-slate-500' : 'text-amber-700 font-medium'}`}>
                {Number(tarif.prix) > 0 ? `Tarif : ${formatMontant(tarif.prix)}` : 'Prix non renseigné : à compléter dans Caisse > Tarifs.'}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Motif</label>
            <input value={motif} onChange={(e) => setMotif(e.target.value)} className={inputClass} placeholder="Ex: Douleurs pelviennes, contrôle tension..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              Commencer la consultation
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
      {term.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs text-slate-400 mt-1">Aucun patient trouvé. Il doit d'abord être enregistré à la réception.</p>
      )}
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
