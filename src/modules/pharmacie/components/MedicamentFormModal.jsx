import { useState } from 'react'
import { ShieldAlert, X, Loader2 } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

const FORMES = ['Comprimé', 'Gélule', 'Sirop', 'Suspension', 'Injectable', 'Perfusion', 'Pommade', 'Crème', 'Suppositoire', 'Collyre', 'Sachet', 'Autre']

// Fiche médicament (création ou modification). Le stock n'est pas modifiable ici.
export default function MedicamentFormModal({ medicament, onSubmit, onClose }) {
  const [values, setValues] = useState({
    nom: medicament?.nom ?? '',
    dosage: medicament?.dosage ?? '',
    forme: medicament?.forme ?? 'Comprimé',
    code_codebarre: medicament?.code_codebarre ?? '',
    prix_vente: medicament?.prix_vente ?? '',
    seuil_alerte: medicament?.seuil_alerte ?? 10,
    date_peremption: medicament?.date_peremption ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const result = await onSubmit(values)
    setSubmitting(false)
    if (result.success) onClose()
    else setFormError(result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">{medicament ? 'Modifier le médicament' : 'Nouveau médicament'}</h3>
        <p className="text-xs text-slate-500 mb-6">
          {medicament ? 'Le stock se modifie par une entrée ou un ajustement.' : 'Le stock démarre à 0 : enregistrez ensuite une entrée de stock.'}
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Nom</label>
            <input name="nom" required value={values.nom} onChange={handleChange} className={inputClass} placeholder="Ex: Paracétamol" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Dosage</label>
              <input name="dosage" value={values.dosage} onChange={handleChange} className={inputClass} placeholder="Ex: 500 mg" />
            </div>
            <div>
              <label className={labelClass}>Forme</label>
              <select name="forme" value={values.forme} onChange={handleChange} className={inputClass}>
                {FORMES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prix de vente (FCFA)</label>
              <input type="number" min="0" step="1" name="prix_vente" required value={values.prix_vente} onChange={handleChange} className={inputClass} placeholder="Ex: 500" />
            </div>
            <div>
              <label className={labelClass}>Seuil d'alerte</label>
              <input type="number" min="0" step="1" name="seuil_alerte" required value={values.seuil_alerte} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Code-barres</label>
              <input name="code_codebarre" value={values.code_codebarre} onChange={handleChange} className={inputClass} placeholder="Facultatif" />
            </div>
            <div>
              <label className={labelClass}>Péremption (lot le plus proche)</label>
              <input type="date" name="date_peremption" value={values.date_peremption} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
