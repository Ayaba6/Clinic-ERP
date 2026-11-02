import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useClinique } from '../../lib/clinique'
import { getRole, titreSoignant } from '../../lib/roles'
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

  const menuItems = [
    { label: 'Réception & Patients', path: '/reception', icon: Users, roles: ['admin', 'reception', 'infirmier'] },
    { label: 'Rendez-vous', path: '/rendez-vous', icon: CalendarDays, roles: ['admin', 'reception', 'medecin', 'sage_femme', 'infirmier'] },
    { label: 'Maternité', path: '/maternite', icon: Baby, roles: ['admin', 'medecin', 'sage_femme', 'infirmier'] },
    { label: 'Salle de naissance', path: '/naissance', icon: BedDouble, roles: ['admin', 'medecin', 'sage_femme', 'infirmier'] },
    { label: 'Consultations', path: '/consultation', icon: Stethoscope, roles: ['admin', 'medecin', 'sage_femme'] },
    { label: 'Pharmacie', path: '/pharmacie', icon: Pill, roles: ['admin', 'pharmacien'] },
    { label: 'Bloc Opératoire', path: '/bloc', icon: Activity, roles: ['admin', 'chirurgien', 'infirmier'] },
    { label: 'Caisse & Facturation', path: '/caisse', icon: CreditCard, roles: ['admin', 'caisse'] },
  ]

  const adminSubMenus = [
    { label: 'Tableau de bord', path: '/admin', icon: LayoutDashboard },
    { label: 'Personnel & Rôles (RBAC)', path: '/admin/staff', icon: UserCog },
    { label: 'Paramètres de la clinique', path: '/admin/parametres', icon: Settings },
  ]

  const isAdmin = profile && profile.role === 'admin'
  const role = getRole(profile?.role)

  return (
    <div className="flex h-dvh bg-slate-100 print:block print:h-auto print:bg-white">
      {/* Fond sombre derrière le tiroir (mobile) */}
      {menuOuvert && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden print:hidden" onClick={() => setMenuOuvert(false)} aria-hidden="true" />
      )}

      {/* Sidebar : tiroir sur mobile, fixe à partir de lg */}
      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col shadow-xl transition-transform duration-200
          lg:static lg:z-auto lg:w-64 lg:translate-x-0 ${menuOuvert ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-5 lg:p-6 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">{clinique.nom}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Rôle : <span className="text-blue-400 font-medium">{role.label}</span>
            </p>
          </div>
          <button onClick={() => setMenuOuvert(false)} className="lg:hidden p-1.5 -mr-1.5 text-slate-400 hover:text-white rounded-lg" aria-label="Fermer le menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* 1. ADMINISTRATION EN HAUT (Réservé à l'Admin) */}
          {isAdmin && (
            <div className="pb-3 border-b border-slate-800 mb-3">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition duration-150 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Administration</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`} />
              </button>

              {adminOpen && (
                <div className="mt-1.5 ml-4 pl-4 border-l border-slate-800 space-y-1">
                  {adminSubMenus.map((sub) => {
                    const SubIcon = sub.icon
                    const isSubActive = location.pathname === sub.path
                    return (
                      <button
                        key={sub.path}
                        onClick={() => aller(sub.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg text-sm lg:text-xs font-medium transition duration-150 ${
                          isSubActive
                            ? 'bg-white/10 text-white font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
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

          {/* 2. AUTRES MODULES MÉTIERS */}
          {menuItems
            .filter(item => profile && item.roles.includes(profile.role))
            .map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path) ||
                (item.path === '/reception' && location.pathname.startsWith('/patients/'))
              return (
                <button
                  key={item.path}
                  onClick={() => aller(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition duration-150"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:overflow-visible">
        <header className="print:hidden h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 lg:px-8 shadow-sm">
          <button onClick={() => setMenuOuvert(true)} className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg" aria-label="Ouvrir le menu">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="flex-1 min-w-0 truncate text-base lg:text-lg font-semibold text-slate-800">
            {profile ? <>Bienvenue, {titreSoignant(profile.role)}{profile.prenom} {profile.nom}</> : 'Tableau de bord'}
          </h1>
          <div className="hidden sm:block shrink-0 text-xs lg:text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 uppercase">
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
