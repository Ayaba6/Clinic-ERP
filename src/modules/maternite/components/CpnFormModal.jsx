import { useState } from 'react'
import { enregistrerCpn, joursDeGrossesse, formatSA, PRESENTATIONS } from '../hooks/useMaternite'
import { X, Loader2, ShieldAlert, AlertCircle } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-pink-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Prochaine CPN proposée (calendrier OMS 2016 : 8 contacts —
// mensuel jusqu'à 28 SA, toutes les 2 semaines jusqu'à 36 SA, puis chaque semaine)
function prochaineCpnSuggeree(jours) {
  const ecart = jours < 28 * 7 ? 28 : jours < 36 * 7 ? 14 : 7
  const d = new Date()
  d.setDate(d.getDate() + ecart)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const OuiNon = ({ name, value, onChange }) => (
  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
    {[['oui', 'Oui'], ['non', 'Non']].map(([v, l]) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange({ target: { name, value: value === v ? '' : v } })}
        className={`px-3 py-1 rounded-md font-medium ${value === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
      >
        {l}
      </button>
    ))}
  </div>
)

export default function CpnFormModal({ grossesse: g, appointmentId, onSaved, onClose }) {
  const jours = joursDeGrossesse(g)
  const precedente = g.cpn?.[g.cpn.length - 1]
  const [values, setValues] = useState(() => ({
    poids: '', tension_sys: '', tension_dia: '', oedemes: '', albuminurie: '',
    hauteur_uterine: '', bcf: '', presentation: '', mouvements_actifs: '',
    tpi_dose: '', vat_dose: '',
    fer_acide_folique: true, moustiquaire: precedente?.moustiquaire ?? false,
    examens: '', observations: '', conduite: '',
    prochaine_cpn: prochaineCpnSuggeree(jours),
  }))
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setValues({ ...values, [name]: type === 'checkbox' ? checked : value })
  }

  const hta = Number(values.tension_sys) >= 140 || Number(values.tension_dia) >= 90
  const bcfAnormal = values.bcf !== '' && (Number(values.bcf) < 110 || Number(values.bcf) > 160)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const result = await enregistrerCpn({ ...values, grossesse_id: g.id, appointment_id: appointmentId })
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">CPN{(g.cpn?.length || 0) + 1} — {g.patient?.nom} {g.patient?.prenom}</h3>
        <p className="text-xs text-slate-500 mb-6">
          Âge gestationnel aujourd'hui : <b className="text-slate-700">{formatSA(jours)}</b>
          {appointmentId && ' • Le passage en file d\'attente sera clôturé et la CPN facturée.'}
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Examen maternel</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Poids (kg)</label>
                <input type="number" step="0.1" min="20" name="poids" value={values.poids} onChange={handleChange} className={inputClass} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className={labelClass}>Tension (mmHg)</label>
                <div className="flex items-center gap-1">
                  <input type="number" min="40" max="300" name="tension_sys" value={values.tension_sys} onChange={handleChange} className={inputClass} placeholder="120" />
                  <span className="text-slate-400">/</span>
                  <input type="number" min="20" max="200" name="tension_dia" value={values.tension_dia} onChange={handleChange} className={inputClass} placeholder="80" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Albuminurie</label>
                <select name="albuminurie" value={values.albuminurie} onChange={handleChange} className={inputClass}>
                  <option value="">Non faite</option>
                  <option value="negatif">Négative</option>
                  <option value="traces">Traces</option>
                  <option value="+">+</option>
                  <option value="++">++</option>
                  <option value="+++">+++</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Œdèmes</label>
                <OuiNon name="oedemes" value={values.oedemes} onChange={handleChange} />
              </div>
            </div>
            {hta && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertCircle className="w-4 h-4" /> Tension élevée (≥ 140/90) : rechercher une pré-éclampsie.
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Examen obstétrical</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Hauteur utérine (cm)</label>
                <input type="number" step="0.5" min="0" max="60" name="hauteur_uterine" value={values.hauteur_uterine} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>BCF (/min)</label>
                <input type="number" min="0" max="250" name="bcf" value={values.bcf} onChange={handleChange} className={inputClass} placeholder="140" />
              </div>
              <div>
                <label className={labelClass}>Présentation</label>
                <select name="presentation" value={values.presentation} onChange={handleChange} className={inputClass}>
                  <option value="">–</option>
                  {PRESENTATIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Mouvements actifs</label>
                <OuiNon name="mouvements_actifs" value={values.mouvements_actifs} onChange={handleChange} />
              </div>
            </div>
            {bcfAnormal && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertCircle className="w-4 h-4" /> BCF hors de la plage normale (110–160/min).
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Prévention</legend>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className={labelClass}>TPI (SP) — dose n°</label>
                <select name="tpi_dose" value={values.tpi_dose} onChange={handleChange} className={inputClass}>
                  <option value="">Non donnée</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>TPI {n}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Vaccin antitétanique</label>
                <select name="vat_dose" value={values.vat_dose} onChange={handleChange} className={inputClass}>
                  <option value="">Non fait</option>
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>VAT {n}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
                <input type="checkbox" name="fer_acide_folique" checked={values.fer_acide_folique} onChange={handleChange} className="w-4 h-4 accent-pink-600" />
                Fer + acide folique
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
                <input type="checkbox" name="moustiquaire" checked={values.moustiquaire} onChange={handleChange} className="w-4 h-4 accent-pink-600" />
                Moustiquaire imprégnée
              </label>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Examens demandés / résultats</label>
              <textarea name="examens" rows="2" value={values.examens} onChange={handleChange} className={inputClass} placeholder="Ex: NFS, groupe-rhésus, sérologies, écho T2..." />
            </div>
            <div>
              <label className={labelClass}>Observations</label>
              <textarea name="observations" rows="2" value={values.observations} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Conduite à tenir</label>
              <input name="conduite" value={values.conduite} onChange={handleChange} className={inputClass} placeholder="Ex: Repos, contrôle TA dans 1 semaine..." />
            </div>
            <div>
              <label className={labelClass}>Prochaine CPN</label>
              <input type="date" name="prochaine_cpn" value={values.prochaine_cpn} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-sm disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Enregistrer la CPN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
