import { useState } from 'react'
import { ShieldAlert, X, Loader2 } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// mode « entree » : réception d'une commande ; mode « ajustement » : inventaire
export default function StockMovementModal({ mode, medicament, onSubmit, onClose }) {
  const isEntree = mode === 'entree'
  const [values, setValues] = useState({
    quantite: '',
    fournisseur: '',
    numero_lot: '',
    date_peremption: '',
    motif: '',
    nouveau_stock: medicament.stock_actuel,
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

  const ecart = Number(values.nouveau_stock) - medicament.stock_actuel

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">{isEntree ? 'Entrée de stock' : 'Ajustement d\'inventaire'}</h3>
        <p className="text-xs text-slate-500 mb-6">
          {medicament.nom} {medicament.dosage} — stock actuel : <b>{medicament.stock_actuel}</b>
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEntree ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Quantité reçue</label>
                  <input type="number" min="1" step="1" name="quantite" required autoFocus value={values.quantite} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Péremption du lot</label>
                  <input type="date" name="date_peremption" value={values.date_peremption} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fournisseur</label>
                  <input name="fournisseur" value={values.fournisseur} onChange={handleChange} className={inputClass} placeholder="Ex: CAMEG" />
                </div>
                <div>
                  <label className={labelClass}>N° de lot</label>
                  <input name="numero_lot" value={values.numero_lot} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Remarque</label>
                <input name="motif" value={values.motif} onChange={handleChange} className={inputClass} placeholder="Ex: Bon de livraison n°..." />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Stock compté</label>
                <input type="number" min="0" step="1" name="nouveau_stock" required autoFocus value={values.nouveau_stock} onChange={handleChange} className={inputClass} />
                {values.nouveau_stock !== '' && ecart !== 0 && (
                  <p className={`text-xs mt-1 font-medium ${ecart > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    Écart : {ecart > 0 ? '+' : ''}{ecart}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Motif</label>
                <select name="motif" required value={values.motif} onChange={handleChange} className={inputClass}>
                  <option value="">Choisir...</option>
                  <option>Inventaire</option>
                  <option>Produits périmés retirés</option>
                  <option>Casse / perte</option>
                  <option>Erreur de saisie</option>
                  <option>Autre</option>
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50 ${isEntree ? 'bg-brand-600 hover:bg-brand-700' : 'bg-brand-600 hover:bg-brand-700'}`}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEntree ? 'Enregistrer l\'entrée' : 'Ajuster le stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
