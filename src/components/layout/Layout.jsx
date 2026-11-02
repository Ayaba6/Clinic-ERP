import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { 
  Users, 
  Stethoscope, 
  Pill, 
  Activity, 
  CreditCard, 
  LayoutDashboard, 
  UserCog,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // État ouvert par défaut si on est dans l'admin
  const [adminOpen, setAdminOpen] = useState(location.pathname.startsWith('/admin'))

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const menuItems = [
    { label: 'Réception & Patients', path: '/reception', icon: Users, roles: ['admin', 'reception', 'infirmier'] },
    { label: 'Consultations', path: '/consultation', icon: Stethoscope, roles: ['admin', 'medecin'] },
    { label: 'Pharmacie', path: '/pharmacie', icon: Pill, roles: ['admin', 'pharmacien'] },
    { label: 'Bloc Opératoire', path: '/bloc', icon: Activity, roles: ['admin', 'chirurgien', 'infirmier'] },
    { label: 'Caisse & Facturation', path: '/caisse', icon: CreditCard, roles: ['admin', 'caisse'] },
  ]

  const adminSubMenus = [
    { label: 'Tableau de bord', path: '/admin', icon: LayoutDashboard },
    { label: 'Personnel & Rôles (RBAC)', path: '/admin/staff', icon: UserCog },
  ]

  const isAdmin = profile && profile.role === 'admin'

  return (
    <div className="flex h-screen bg-slate-100 print:block print:h-auto print:bg-white">
      {/* Sidebar latérale */}
      <aside className="print:hidden w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white tracking-wide">Clinic ERP</h2>
          <p className="text-xs text-slate-400 mt-1 capitalize">
            Rôle : <span className="text-blue-400 font-medium">{profile?.role}</span>
          </p>
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
                        onClick={() => navigate(sub.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition duration-150 ${
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
                  onClick={() => navigate(item.path)}
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
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        <header className="print:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">
            {profile ? `Bienvenue, Dr./M(e). ${profile.nom}` : 'Tableau de bord'}
          </h1>
          <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 uppercase">
            {profile?.specialite || profile?.role}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}