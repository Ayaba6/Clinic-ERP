// Rôles de l'application (doivent correspondre à la contrainte profiles_role_check)
export const ROLES = [
  { key: 'admin', label: 'Administrateur', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { key: 'reception', label: 'Réception / Accueil', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'medecin', label: 'Médecin', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'sage_femme', label: 'Sage-femme / Maïeuticien', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'infirmier', label: 'Infirmier(ère)', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'pharmacien', label: 'Pharmacien', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'chirurgien', label: 'Chirurgien', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'caisse', label: 'Caissier(ère)', color: 'bg-amber-50 text-amber-700 border-amber-200' },
]

export const getRole = (key) => ROLES.find(r => r.key === key) || { key, label: key, color: 'bg-slate-100 text-slate-600 border-slate-200' }

// Page d'accueil de chaque rôle après connexion
const homeByRole = {
  admin: '/admin',
  reception: '/reception',
  medecin: '/consultation',
  sage_femme: '/maternite',
  infirmier: '/reception',
  pharmacien: '/pharmacie',
  chirurgien: '/bloc',
  caisse: '/caisse',
}

export const getHomePath = (role) => homeByRole[role] || '/login'

// Titre devant le nom d'un soignant : « Dr », « SF » (sage-femme)
export const titreSoignant = (role) => (role === 'sage_femme' ? 'SF ' : ['medecin', 'chirurgien'].includes(role) ? 'Dr ' : '')
