import { useState } from 'react'
import { terminerAccouchement, MODES } from '../hooks/useNaissance'
import { PRESENTATIONS } from '../../maternite/hooks/useMaternite'
import { X, Loader2, ShieldAlert, Plus, Trash2, AlertCircle } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

const pad = (n) => String(n).padStart(2, '0')
const maintenantLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const NOUVEL_ENFANT = {
  prenom: '', sexe: '', vivant: true, poids_g: '', taille_cm: '', perimetre_cranien_cm: '',
  apgar_1: '', apgar_5: '', reanimation: false, malformations: '',
  vitamine_k: true, collyre: true, mise_au_sein_precoce: true, observations: '',
}

const OuiNon = ({ value, onChange }) => (
  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
    {[[true, 'Oui'], [false, 'Non']].map(([v, l]) => (
      <button key={l} type="button" onClick={() => onChange(value === v ? null : v)}
        className={`px-3 py-1 rounded-md font-medium ${value === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>
        {l}
      </button>
    ))}
  </div>
)

// Enregistrement de l'accouchement : mère + un ou plusieurs nouveau-nés
export default function AccouchementFormModal({ accouchement, onSaved, onClose }) {
  const [data, setData] = useState(() => ({
    accouchement_le: maintenantLocal(),
    mode: 'voie_basse',
    presentation: 'cephalique',
    episiotomie: false,
    dechirure: 'aucune',
    delivrance: 'dirigee',
    gatpa: true,
    pertes_sang_ml: '',
    complications: '',
    etat_mere: 'Bon',
    observations: '',
  }))
  const [enfants, setEnfants] = useState([{ ...NOUVEL_ENFANT }])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const set = (name, value) => setData({ ...data, [name]: value })
  const setEnfant = (i, name, value) => setEnfants(enfants.map((e, k) => (k === i ? { ...e, [name]: value } : e)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (enfants.some(en => !en.sexe)) return setFormError('Indiquez le sexe de chaque nouveau-né.')
    setSubmitting(true)
    setFormError(null)
    // Champs propres à la voie basse : vides pour une césarienne
    const payload = data.mode === 'cesarienne'
      ? { ...data, episiotomie: null, dechirure: '', delivrance: '', gatpa: null }
      : data
    const result = await terminerAccouchement(accouchement.id, payload, enfants)
    setSubmitting(false)
    if (result.success) {
      onSaved?.()
      onClose()
    } else {
      setFormError(result.error)
    }
  }

  const hpp = Number(data.pertes_sang_ml) >= 500

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-xl font-bold text-slate-800 mb-1">Accouchement — {accouchement.patient?.nom} {accouchement.patient?.prenom}</h3>
        <p className="text-xs text-slate-500 mb-6">
          Le dossier de chaque bébé né vivant sera créé et relié à la mère, la grossesse clôturée
          {data.mode === 'cesarienne' ? ' (la césarienne est facturée par le bloc).' : ' et l\'accouchement facturé.'}
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mère */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Accouchement</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Date et heure</label>
                <input type="datetime-local" required value={data.accouchement_le} onChange={(e) => set('accouchement_le', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mode</label>
                <select value={data.mode} onChange={(e) => set('mode', e.target.value)} className={inputClass}>
                  {MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Présentation</label>
                <select value={data.presentation} onChange={(e) => set('presentation', e.target.value)} className={inputClass}>
                  {PRESENTATIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {data.mode !== 'cesarienne' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Épisiotomie</label>
                  <OuiNon value={data.episiotomie} onChange={(v) => set('episiotomie', v)} />
                </div>
                <div>
                  <label className={labelClass}>Déchirure</label>
                  <select value={data.dechirure} onChange={(e) => set('dechirure', e.target.value)} className={inputClass}>
                    <option value="aucune">Aucune</option>
                    {['1', '2', '3', '4'].map(d => <option key={d} value={d}>{d}e degré</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Délivrance</label>
                  <select value={data.delivrance} onChange={(e) => set('delivrance', e.target.value)} className={inputClass}>
                    <option value="naturelle">Naturelle</option>
                    <option value="dirigee">Dirigée</option>
                    <option value="artificielle">Artificielle</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>GATPA (ocytocine)</label>
                  <OuiNon value={data.gatpa} onChange={(v) => set('gatpa', v)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Pertes sanguines (ml)</label>
                <input type="number" min="0" max="10000" step="50" value={data.pertes_sang_ml} onChange={(e) => set('pertes_sang_ml', e.target.value)} className={inputClass} placeholder="Ex: 300" />
                {hpp && <p className="flex items-center gap-1 text-xs font-semibold text-red-700 mt-1"><AlertCircle className="w-3.5 h-3.5" /> Hémorragie du post-partum</p>}
              </div>
              <div>
                <label className={labelClass}>État de la mère</label>
                <input value={data.etat_mere} onChange={(e) => set('etat_mere', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Complications</label>
                <input value={data.complications} onChange={(e) => set('complications', e.target.value)} className={inputClass} placeholder="Aucune" />
              </div>
            </div>
          </fieldset>

          {/* Nouveau-nés */}
          {enfants.map((en, i) => (
            <fieldset key={i} className="p-4 border border-pink-200 bg-pink-50/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-bold text-pink-700 uppercase tracking-wider">
                  Nouveau-né{enfants.length > 1 ? ` ${i + 1}` : ''}
                </legend>
                {enfants.length > 1 && (
                  <button type="button" onClick={() => setEnfants(enfants.filter((_, k) => k !== i))} className="p-1 text-slate-400 hover:text-red-600" title="Retirer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Sexe</label>
                  <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-lg text-sm">
                    {[['F', 'Fille'], ['M', 'Garçon']].map(([v, l]) => (
                      <button key={v} type="button" onClick={() => setEnfant(i, 'sexe', v)}
                        className={`px-3 py-1 rounded-md font-medium ${en.sexe === v ? 'bg-pink-600 text-white' : 'text-slate-500'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Né vivant</label>
                  <OuiNon value={en.vivant} onChange={(v) => setEnfant(i, 'vivant', v !== false)} />
                </div>
                {en.vivant && (
                  <div className="col-span-2">
                    <label className={labelClass}>Prénom (si déjà choisi)</label>
                    <input value={en.prenom} onChange={(e) => setEnfant(i, 'prenom', e.target.value)} className={inputClass} placeholder={`Sinon « Bébé${enfants.length > 1 ? ` ${i + 1}` : ''} »`} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <label className={labelClass}>Poids (g)</label>
                  <input type="number" min="200" max="7000" value={en.poids_g} onChange={(e) => setEnfant(i, 'poids_g', e.target.value)} className={inputClass} placeholder="3200" />
                </div>
                <div>
                  <label className={labelClass}>Taille (cm)</label>
                  <input type="number" step="0.5" min="20" max="70" value={en.taille_cm} onChange={(e) => setEnfant(i, 'taille_cm', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>PC (cm)</label>
                  <input type="number" step="0.5" min="15" max="50" value={en.perimetre_cranien_cm} onChange={(e) => setEnfant(i, 'perimetre_cranien_cm', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apgar 1 min</label>
                  <input type="number" min="0" max="10" value={en.apgar_1} onChange={(e) => setEnfant(i, 'apgar_1', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apgar 5 min</label>
                  <input type="number" min="0" max="10" value={en.apgar_5} onChange={(e) => setEnfant(i, 'apgar_5', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
                {[['reanimation', 'Réanimation'], ['vitamine_k', 'Vitamine K'], ['collyre', 'Collyre'], ['mise_au_sein_precoce', 'Mise au sein précoce']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={en[k]} onChange={(e) => setEnfant(i, k, e.target.checked)} className="w-4 h-4 accent-pink-600" />
                    {l}
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input value={en.malformations} onChange={(e) => setEnfant(i, 'malformations', e.target.value)} className={inputClass} placeholder="Malformations (si présentes)" />
                <input value={en.observations} onChange={(e) => setEnfant(i, 'observations', e.target.value)} className={inputClass} placeholder="Observations" />
              </div>
            </fieldset>
          ))}

          <button type="button" onClick={() => setEnfants([...enfants, { ...NOUVEL_ENFANT }])}
            className="inline-flex items-center gap-2 text-sm font-medium text-pink-700 hover:underline">
            <Plus className="w-4 h-4" /> Ajouter un nouveau-né (grossesse multiple)
          </button>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer l'accouchement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
