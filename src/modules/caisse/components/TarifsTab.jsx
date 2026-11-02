import { useState } from 'react'
import { useTarifs } from '../hooks/useCaisse'
import { formatMontant } from '../../../lib/format'
import { Loader2, Plus, Pencil, X, ShieldAlert } from 'lucide-react'

const TYPES = { consultation: 'Consultation', medicament: 'Médicament', bloc: 'Bloc opératoire', autre: 'Autre acte' }
const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Grille tarifaire : lecture pour la caisse, modification réservée à l'admin
export default function TarifsTab({ canEdit }) {
  const { tarifs, loading, error, saveTarif } = useTarifs()
  const [edit, setEdit] = useState(null) // null | {} (nouveau) | tarif

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Le tarif de code <span className="font-mono font-semibold">CONSULTATION</span> est facturé automatiquement à chaque consultation.
        </p>
        {canEdit && (
          <button
            onClick={() => setEdit({})}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nouveau tarif
          </button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-5">Acte</th>
                <th className="py-3 px-5">Type</th>
                <th className="py-3 px-5 text-right">Prix</th>
                {canEdit && <th className="w-12" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {tarifs.map(t => (
                <tr key={t.id} className={t.actif ? '' : 'opacity-50'}>
                  <td className="py-3 px-5">
                    <div className="font-medium text-slate-800">{t.libelle}{!t.actif && <span className="ml-2 text-xs text-slate-500">(désactivé)</span>}</div>
                    {t.code && <div className="text-xs font-mono text-slate-400">{t.code}</div>}
                  </td>
                  <td className="py-3 px-5 text-slate-600">{TYPES[t.type_acte]}</td>
                  <td className="py-3 px-5 text-right font-semibold text-slate-800 whitespace-nowrap">{formatMontant(t.prix)}</td>
                  {canEdit && (
                    <td className="pr-3 text-right">
                      <button onClick={() => setEdit(t)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg" title="Modifier">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <TarifFormModal
          tarif={edit.id ? edit : null}
          onSubmit={(values) => saveTarif(values, edit.id)}
          onClose={() => setEdit(null)}
        />
      )}
    </div>
  )
}

function TarifFormModal({ tarif, onSubmit, onClose }) {
  const [values, setValues] = useState({
    code: tarif?.code ?? '',
    libelle: tarif?.libelle ?? '',
    type_acte: tarif?.type_acte ?? 'autre',
    prix: tarif?.prix ?? '',
    actif: tarif?.actif ?? true,
  })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    const result = await onSubmit(values)
    setBusy(false)
    if (result.success) onClose()
    else setFormError(result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-slate-800 mb-6">{tarif ? 'Modifier le tarif' : 'Nouveau tarif'}</h3>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass}>Libellé</label>
            <input name="libelle" required value={values.libelle} onChange={handleChange} className={inputClass} placeholder="Ex: Échographie abdominale" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prix (FCFA)</label>
              <input type="number" min="0" name="prix" required value={values.prix} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select name="type_acte" value={values.type_acte} onChange={handleChange} className={inputClass}>
                {Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Code (facultatif)</label>
            <input
              name="code"
              value={values.code}
              onChange={handleChange}
              disabled={tarif?.code === 'CONSULTATION'}
              className={`${inputClass} font-mono uppercase disabled:bg-slate-100`}
              placeholder="Ex: ECHO_ABDO"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="actif" checked={values.actif} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
            Tarif actif (proposé à la caisse)
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Enregistrer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
