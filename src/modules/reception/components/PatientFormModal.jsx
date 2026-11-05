import { useState } from 'react'
import { ShieldAlert, X, Loader2 } from 'lucide-react'

const EMPTY_PATIENT = {
  nom: '',
  prenom: '',
  date_naissance: '',
  genre: 'M',
  telephone: '',
  groupe_sanguin: 'O+',
  allergies: '',
}

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none'

// Formulaire patient partagé entre la création (liste) et la modification (dossier).
// onSubmit doit renvoyer { success, error }.
export default function PatientFormModal({ title, subtitle, initialValues = EMPTY_PATIENT, submitLabel = 'Enregistrer', onSubmit, onClose }) {
  const [formData, setFormData] = useState(() => {
    const values = { ...EMPTY_PATIENT }
    for (const key of Object.keys(EMPTY_PATIENT)) values[key] = initialValues[key] ?? EMPTY_PATIENT[key]
    return values
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const result = await onSubmit(formData)
    setSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setFormError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">{title}</h3>
        <p className="text-xs text-slate-500 mb-6">{subtitle}</p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nom</label>
              <input type="text" name="nom" required value={formData.nom} onChange={handleInputChange} className={inputClass} placeholder="Ex: Ouedraogo" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Prénom</label>
              <input type="text" name="prenom" required value={formData.prenom} onChange={handleInputChange} className={inputClass} placeholder="Ex: Jean" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Date de naissance</label>
              <input type="date" name="date_naissance" required value={formData.date_naissance} onChange={handleInputChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Genre</label>
              <select name="genre" value={formData.genre} onChange={handleInputChange} className={`${inputClass} bg-white`}>
                <option value="M">Masculin (M)</option>
                <option value="F">Féminin (F)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Téléphone</label>
              <input type="tel" name="telephone" required value={formData.telephone} onChange={handleInputChange} className={inputClass} placeholder="Ex: 70000000" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Groupe Sanguin</label>
              <select name="groupe_sanguin" value={formData.groupe_sanguin} onChange={handleInputChange} className={`${inputClass} bg-white`}>
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Allergies / Antécédents majeurs</label>
            <textarea name="allergies" rows="2" value={formData.allergies} onChange={handleInputChange} className={inputClass} placeholder="Ex: Allergique à la pénicilline..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
