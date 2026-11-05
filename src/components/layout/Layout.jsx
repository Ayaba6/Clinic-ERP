import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useClinique } from '../../lib/clinique'
import { getRole, titreSoignant } from '../../lib/roles'
import { aujourdhuiLong } from '../../lib/format'
import LogoPastille from '../ui/Logo'
import {
  Users,
  Stethoscope,
  Pill,
  Activity,
  CreditCard,
  LayoutDashboard,
  UserCog,
  LogOut,
  ChevronDown,
  Settings,
  Baby,
  BedDouble,
  CalendarDays,
  Menu,
  X
} from 'lucide-react'
import { useEffect, useState } from 'react'

const menuItems = [
  { label: 'Réception & Patients', path: '/reception', icon: Users, roles: ['admin', 'reception', 'infirmier'] },
  { label: 'Rendez-vous', path: '/rendez-vous', icon: CalendarDays, roles: ['admin', 'reception', 'medecin', 'sage_femme', 'infirmier'] },
  { label: 'Maternité', path: '/maternite', icon: Baby, roles: ['admin', 'medecin', 'sage_femme', 'infirmier'] },
  { label: 'Salle de naissance', path: '/naissance', icon: BedDouble, roles: ['admin', 'medecin', 'sage_femme', 'infirmier'] },
  { label: 'Consultations', path: '/consultation', icon: Stethoscope, roles: ['admin', 'medecin', 'sage_femme'] },
  { label: 'Pharmacie', path: '/pharmacie', icon: Pill, roles: ['admin', 'pharmacien'] },
  { label: 'Bloc opératoire', path: '/bloc', icon: Activity, roles: ['admin', 'chirurgien', 'infirmier'] },
  { label: 'Caisse & Facturation', path: '/caisse', icon: CreditCard, roles: ['admin', 'caisse'] },
]

const adminSubMenus = [
  { label: 'Tableau de bord', path: '/admin', icon: LayoutDashboard },
  { label: 'Personnel & rôles', path: '/admin/staff', icon: UserCog },
  { label: 'Paramètres de la clinique', path: '/admin/parametres', icon: Settings },
]

export default function Layout() {
  const { profile, logout } = useAuth()
  const { clinique } = useClinique()
  const navigate = useNavigate()
  const location = useLocation()

  // État ouvert par défaut si on est dans l'admin
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'))
  // Sur mobile, le menu est un tiroir fermé par défaut
  const [menuOuvert, setMenuOuvert] = useState(false)

  // Touche Échap : ferme le tiroir
  useEffect(() => {
    if (!menuOuvert) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOuvert(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOuvert])

  const aller = (path) => {
    setMenuOuvert(false)
    navigate(path)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const isAdmin = profile && profile.role === 'admin'
  const role = getRole(profile?.role)
  const initiales = `${profile?.prenom?.[0] || ''}${profile?.nom?.[0] || ''}`.toUpperCase() || '?'

  const itemClass = (actif) => `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition duration-150 ${
    actif
      ? 'bg-white text-brand-800 shadow-sm'
      : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
  }`

  return (
    <div className="flex h-dvh bg-slate-50 print:block print:h-auto print:bg-white">
      {/* Fond sombre derrière le tiroir (mobile) */}
      {menuOuvert && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden print:hidden" onClick={() => setMenuOuvert(false)} aria-hidden="true" />
      )}

      {/* Menu latéral : tiroir sur mobile, fixe à partir de lg */}
      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-gradient-to-b from-brand-800 via-brand-900 to-brand-950 text-brand-50 flex flex-col shadow-xl transition-transform duration-200
          lg:static lg:z-auto lg:w-[17rem] lg:translate-x-0 ${menuOuvert ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Identité de la clinique */}
        <div className="px-5 pt-6 pb-5 border-b border-white/10 flex items-start gap-3">
          <LogoPastille />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white leading-tight">{clinique.nom}</h2>
            {clinique.slogan && <p className="text-[11px] text-brand-200/80 leading-snug mt-1">{clinique.slogan}</p>}
          </div>
          <button onClick={() => setMenuOuvert(false)} className="lg:hidden p-1.5 -mr-1.5 text-brand-200 hover:text-white rounded-lg" aria-label="Fermer le menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {/* Administration en haut (réservé à l'admin) */}
          {isAdmin && (
            <div className="pb-3 mb-3 border-b border-white/10">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={`${itemClass(location.pathname.startsWith('/admin') && !adminOpen)} justify-between`}
              >
                <span className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5" />
                  Administration
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminOpen && (
                <div className="mt-1 ml-5 pl-3 border-l border-white/15 space-y-1">
                  {adminSubMenus.map((sub) => {
                    const SubIcon = sub.icon
                    const actif = location.pathname === sub.path
                    return (
                      <button
                        key={sub.path}
                        onClick={() => aller(sub.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                          actif ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-100/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <SubIcon className="w-4 h-4" />
                        <span>{sub.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-300/70">Services</p>

          {menuItems
            .filter(item => profile && item.roles.includes(profile.role))
            .map((item) => {
              const Icon = item.icon
              const actif = location.pathname.startsWith(item.path) ||
                (item.path === '/reception' && location.pathname.startsWith('/patients/'))
              return (
                <button key={item.path} onClick={() => aller(item.path)} className={itemClass(actif)}>
                  <Icon className={`w-5 h-5 ${actif ? 'text-brand-600' : ''}`} />
                  <span>{item.label}</span>
                  {actif && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-or-400" />}
                </button>
              )
            })}
        </nav>

        {/* Utilisateur connecté */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 shrink-0 rounded-full bg-or-400 text-brand-950 font-bold text-sm flex items-center justify-center">
              {initiales}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">{profile?.prenom} {profile?.nom}</div>
              <div className="text-xs text-brand-200/80 truncate">{role.label}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-brand-200 hover:text-white hover:bg-white/10 transition"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:overflow-visible">
        <header className="print:hidden h-14 lg:h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setMenuOuvert(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg" aria-label="Ouvrir le menu">
            <Menu className="w-6 h-6" />
          </button>
          <div className="lg:hidden"><LogoPastille className="w-8 h-8" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm sm:text-base lg:text-lg font-semibold text-slate-800">
              {profile ? <>Bienvenue, {titreSoignant(profile.role)}{profile.prenom} {profile.nom}</> : clinique.nom}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 capitalize">{aujourdhuiLong()}</p>
          </div>
          <div className="hidden sm:block shrink-0 text-xs font-semibold text-brand-800 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">
            {profile?.specialite || role.label}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
