import { useState } from 'react'
import { ShieldAlert, X, Loader2, UserPlus, RefreshCw, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { ROLES } from '../../../lib/roles'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

// Mot de passe provisoire lisible (sans 0/O, 1/l/I)
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

export default function CreateStaffModal({ onSubmit, onClose }) {
  const [values, setValues] = useState(() => ({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'medecin',
    specialite: '',
    password: generatePassword(),
  }))
  const [showPassword, setShowPassword] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const result = await onSubmit(values)
    setSubmitting(false)
    if (result.success) {
      setCreated(values)
    } else {
      setFormError(result.error)
    }
  }

  const copyAccess = async () => {
    try {
      await navigator.clipboard.writeText(`Email : ${created.email}\nMot de passe provisoire : ${created.password}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const showSpecialite = ['medecin', 'sage_femme', 'chirurgien', 'infirmier'].includes(values.role)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        {created ? (
          // Écran de confirmation : identifiants à transmettre au collaborateur
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Compte créé</h3>
              <p className="text-sm text-slate-500">
                {created.nom} {created.prenom} peut maintenant se connecter. Transmettez-lui ces accès en main propre :
                le mot de passe ne sera plus affiché après fermeture.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm space-y-1">
              <div><span className="text-slate-500">Email : </span>{created.email}</div>
              <div><span className="text-slate-500">Mot de passe : </span>{created.password}</div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={copyAccess}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
              >
                Terminé
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Nouveau membre du personnel</h3>
            <p className="text-xs text-slate-500 mb-6">Le compte est actif immédiatement, sans email de confirmation.</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nom</label>
                  <input name="nom" required value={values.nom} onChange={handleChange} className={inputClass} placeholder="Ex: Sawadogo" />
                </div>
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input name="prenom" required value={values.prenom} onChange={handleChange} className={inputClass} placeholder="Ex: Aminata" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Rôle</label>
                  <select name="role" value={values.role} onChange={handleChange} className={inputClass}>
                    {ROLES.map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Téléphone</label>
                  <input type="tel" name="telephone" value={values.telephone} onChange={handleChange} className={inputClass} placeholder="Ex: 70000000" />
                </div>
              </div>

              {showSpecialite && (
                <div>
                  <label className={labelClass}>Spécialité / service</label>
                  <input name="specialite" value={values.specialite} onChange={handleChange} className={inputClass} placeholder="Ex: Pédiatrie, Médecine générale..." />
                </div>
              )}

              <div>
                <label className={labelClass}>Email de connexion</label>
                <input type="email" name="email" required value={values.email} onChange={handleChange} className={inputClass} placeholder="nom@clinique.com" />
              </div>

              <div>
                <label className={labelClass}>Mot de passe provisoire</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      minLength={8}
                      value={values.password}
                      onChange={handleChange}
                      className={`${inputClass} font-mono pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      title={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValues({ ...values, password: generatePassword() })}
                    className="px-3 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                    title="Générer un autre mot de passe"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">8 caractères minimum. Généré automatiquement, modifiable.</p>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Créer le compte</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
