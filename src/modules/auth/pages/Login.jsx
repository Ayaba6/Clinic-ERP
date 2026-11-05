import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { getHomePath } from '../../../lib/roles'
import { useClinique } from '../../../lib/clinique'
import { Lock, Mail, AlertCircle, Loader2, Baby, Stethoscope, HeartPulse, MapPin, Eye, EyeOff } from 'lucide-react'

// Photo libre de droits (licence Unsplash) : une maman souriante et son bébé
const PHOTO_BASE = 'https://images.unsplash.com/photo-1591451855781-9eb0f9726a33?auto=format&fit=crop&q=75'
// Taille adaptée à l'écran : chargement rapide sur téléphone
const PHOTO_SRCSET = [640, 1080, 1600, 2200].map(w => `${PHOTO_BASE}&w=${w} ${w}w`).join(', ')

const SERVICES = [
  { icon: Baby, label: 'Maternité et accouchements' },
  { icon: HeartPulse, label: 'Gynécologie-obstétrique' },
  { icon: Stethoscope, label: 'Médecine générale' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [voir, setVoir] = useState(false)
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
      setError(err.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect.'
        : err.message || 'Identifiants incorrects ou erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-dvh grid lg:grid-cols-[1fr_32rem] overflow-hidden bg-brand-950">
      {/* Photo de fond : tout l'écran sur mobile, partie gauche sur grand écran */}
      <img
        src={`${PHOTO_BASE}&w=1080`}
        srcSet={PHOTO_SRCSET}
        sizes="(min-width: 1024px) calc(100vw - 32rem), 100vw"
        fetchPriority="high"
        alt="Une maman souriante tenant son bébé"
        className="absolute inset-x-0 top-0 h-[46dvh] lg:inset-y-0 lg:right-auto lg:h-full w-full lg:w-[calc(100%-32rem)] object-cover object-[62%_30%] lg:object-[50%_20%]"
      />
      {/* Voile vert : léger sur les visages (haut), plus dense sous le texte (bas) */}
      <div
        className="absolute inset-x-0 top-0 h-[46dvh] lg:inset-y-0 lg:h-auto lg:right-[32rem] bg-gradient-to-t from-brand-950 via-brand-900/30 to-brand-950/30 lg:from-brand-950/95 lg:via-brand-900/45 lg:to-brand-950/40"
        aria-hidden="true"
      />

      {/* Panneau d'identité (grand écran) */}
      <aside className="relative hidden lg:flex flex-col justify-between text-white p-12">

        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white shadow-lg overflow-hidden flex items-center justify-center">
            <img src="/logo.jpeg" alt="" className="w-full h-full object-contain scale-110" />
          </div>
          <div>
            <div className="text-xl font-bold">{clinique.nom}</div>
            <div className="text-sm text-brand-100">{clinique.sous_titre}</div>
          </div>
        </div>

        {/* Texte en bas, sous les visages */}
        <div className="relative space-y-6 max-w-xl">
          <p className="text-3xl xl:text-4xl font-bold leading-tight drop-shadow-lg">
            « {clinique.slogan} »
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {SERVICES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-white drop-shadow">
                <span className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
                  <Icon className="w-4 h-4 text-or-300" />
                </span>
                {label}
              </li>
            ))}
          </ul>
          {clinique.adresse && (
            <p className="flex items-center gap-2 text-sm text-brand-100 pt-2 border-t border-white/15">
              <MapPin className="w-4 h-4" /> {clinique.adresse}
            </p>
          )}
        </div>
      </aside>

      {/* Formulaire */}
      <main className="relative flex items-start lg:items-center justify-center px-4 pt-[34dvh] pb-6 sm:px-8 lg:p-12 lg:bg-white">
        {/* Carte blanche sur la photo (mobile), panneau blanc (grand écran) */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 lg:shadow-none lg:rounded-none lg:p-0">
          <div className="text-center mb-8">
            <img src="/logo.jpeg" alt={clinique.nom} className="mx-auto w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-full" />
            {/* Le logo porte déjà le nom et le slogan de la clinique */}
            <h1 className="mt-4 text-2xl font-bold text-slate-900">Connexion</h1>
            <p className="mt-1 text-sm text-slate-500">Accédez à votre espace de travail.</p>
          </div>

          {/* Compte sans profil dans la table profiles */}
          {user && !profile && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <span className="font-medium">
                Aucun profil n'est associé à ce compte. Contactez l'administrateur.{' '}
                <button type="button" onClick={logout} className="underline">Se déconnecter</button>
              </span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email professionnel</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@clinique.com"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition text-sm text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={voir ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition text-sm text-slate-800 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setVoir(!voir)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {voir ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Accès réservé au personnel de la clinique.
          </p>
        </div>
      </main>
    </div>
  )
}
