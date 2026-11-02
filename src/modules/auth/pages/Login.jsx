import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { getHomePath } from '../../../lib/roles'
import { useClinique } from '../../../lib/clinique'
import { Lock, Mail, AlertCircle, Loader2, Stethoscope } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { user, profile, login, logout } = useAuth()
  const { clinique } = useClinique()

  // Déjà connecté : redirection vers l'espace correspondant au rôle
  if (user && profile) {
    return <Navigate to={getHomePath(profile.role)} replace />
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await login(email, password)
      if (error) throw error
      // La redirection se fait dès que le profil est chargé (voir plus haut)
    } catch (err) {
      setError(err.message || 'Identifiants incorrects ou erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* 1. Image de fond professionnelle (Médecin / Clinique) avec superposition sombre */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=1920')` 
        }}
      >
        {/* Overlay sombre pour contraster le texte et l'effet transparent */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"></div>
      </div>

      {/* 2. Carte de connexion semi-transparente (Glassmorphism) */}
      <div className="relative z-10 max-w-md w-full bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 sm:p-10">
        
        {/* En-tête / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{clinique.nom}</h1>
          <p className="text-sm text-slate-600 mt-1">{clinique.sous_titre}</p>
        </div>

        {/* Compte sans profil dans la table profiles */}
        {user && !profile && (
          <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
            <span className="font-medium">
              Aucun profil n'est associé à ce compte. Contactez l'administrateur.{' '}
              <button type="button" onClick={logout} className="underline">Se déconnecter</button>
            </span>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-700 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email professionnel
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@clinique.com"
                className="w-full pl-11 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition text-sm text-slate-800 placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-transparent outline-none transition text-sm text-slate-800 placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3.5 rounded-2xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connexion en cours...</span>
              </>
            ) : (
              <span>Accéder au portail</span>
            )}
          </button>
        </form>

        {/* Pied de page de la carte */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Sécurisé par authentification Supabase & RBAC
          </p>
        </div>
      </div>
    </div>
  )
}