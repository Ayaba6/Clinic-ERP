import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useClinique, CliniqueContext } from '../../../lib/clinique'
import EnTeteDocument, { PiedDocument } from '../../../components/ui/EnTeteDocument'
import { Loader2, CheckCircle2, ShieldAlert, Save } from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

const CHAMPS = ['nom', 'slogan', 'sous_titre', 'adresse', 'telephone', 'email', 'mention_documents']

// Identité de la clinique imprimée sur les ordonnances, reçus et comptes rendus
export default function ParametresPage() {
  const { clinique, setClinique } = useClinique()
  const [values, setValues] = useState(() => Object.fromEntries(CHAMPS.map(k => [k, clinique[k] ?? ''])))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null) // { ok, texte }

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value })
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const payload = Object.fromEntries(CHAMPS.map(k => [k, values[k].trim() || null]))
    payload.nom = payload.nom || 'Clinique'
    const { data, error } = await supabase
      .from('parametres_clinique')
      .update(payload)
      .eq('id', 1)
      .select()
      .maybeSingle()
    setBusy(false)

    if (error || !data) {
      setMessage({
        ok: false,
        texte: error?.message || 'Paramètres introuvables : le script supabase/parametres.sql doit être exécuté dans Supabase.',
      })
      return
    }
    setClinique({ ...clinique, ...Object.fromEntries(CHAMPS.map(k => [k, data[k] ?? ''])) })
    setMessage({ ok: true, texte: 'Paramètres enregistrés. Ils s\'appliquent immédiatement aux documents imprimés.' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Paramètres de la clinique</h2>
        <p className="text-sm text-slate-500">Nom et coordonnées affichés dans l'application et imprimés sur les ordonnances, reçus et comptes rendus.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {message && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-2 border ${message.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {message.ok ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 flex-shrink-0" />}
              <span>{message.texte}</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Nom de la clinique</label>
            <input name="nom" required value={values.nom} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Slogan</label>
            <input name="slogan" value={values.slogan} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sous-titre / spécialités</label>
            <input name="sous_titre" value={values.sous_titre} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Adresse</label>
            <input name="adresse" value={values.adresse} onChange={handleChange} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="tel" name="telephone" value={values.telephone} onChange={handleChange} className={inputClass} placeholder="Ex: +226 25 00 00 00" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" name="email" value={values.email} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Mention en bas des documents (facultatif)</label>
            <textarea name="mention_documents" rows="2" value={values.mention_documents} onChange={handleChange} className={inputClass}
              placeholder="Ex: Ouvert 24 h/24 — Urgences maternité" />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </form>

        {/* Aperçu de l'en-tête tel qu'il sera imprimé */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Aperçu de l'en-tête des documents</h3>
          <div className="p-5 border border-dashed border-slate-300 rounded-xl text-sm">
            <ApercuEnTete values={values} />
          </div>
        </div>
      </div>
    </div>
  )
}

// L'aperçu suit la saisie en cours, avant enregistrement
function ApercuEnTete({ values }) {
  const { clinique, setClinique } = useClinique()
  const apercu = { ...clinique, ...values }
  return (
    <CliniqueContext.Provider value={{ clinique: apercu, setClinique }}>
      <EnTeteDocument titre="Ordonnance">
        <div className="text-sm font-semibold text-slate-900">Dr Exemple</div>
      </EnTeteDocument>
      <div className="py-6 text-center text-xs text-slate-400">… contenu du document …</div>
      <PiedDocument />
    </CliniqueContext.Provider>
  )
}
