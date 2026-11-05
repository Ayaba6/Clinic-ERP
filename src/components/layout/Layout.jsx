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
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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

// Tableau de bord : premier élément du menu (admin)
const tableauDeBord = { label: 'Tableau de bord', path: '/admin', icon: LayoutDashboard }

// Administration : regroupée tout en bas du menu (admin)
const adminSubMenus = [
  { label: 'Personnel & rôles', path: '/admin/staff', icon: UserCog },
  { label: 'Paramètres de la clinique', path: '/admin/parametres', icon: Settings },
]

// Largeur du menu sur grand écran (px)
const LARGEUR_REDUITE = 80
const LARGEUR_MIN = 220
const LARGEUR_MAX = 380
const LARGEUR_DEFAUT = 272
// En dessous de cette largeur pendant le glissement, le menu se réduit
const SEUIL_REDUCTION = 150

// Préférence du menu, conservée dans ce navigateur (si le stockage est disponible)
const CLE_MENU = 'clinique:menu'
function lirePreference() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_MENU) || '{}')
    return {
      replie: !!v.replie,
      largeur: Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, Number(v.largeur) || LARGEUR_DEFAUT)),
    }
  } catch {
    return { replie: false, largeur: LARGEUR_DEFAUT }
  }
}
function ecrirePreference(pref) {
  try {
    localStorage.setItem(CLE_MENU, JSON.stringify(pref))
  } catch {
    // stockage indisponible (navigation privée) : la préférence n'est pas conservée
  }
}

// Vrai à partir de 1024 px (point de rupture « lg »)
function useGrandEcran() {
  const [grand, setGrand] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e) => setGrand(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return grand
}

export default function Layout() {
  const { profile, logout } = useAuth()
  const { clinique } = useClinique()
  const navigate = useNavigate()
  const location = useLocation()
  const grandEcran = useGrandEcran()

  // Section Administration ouverte par défaut si on est sur l'une de ses pages
  const [adminOpen, setAdminOpen] = useState(adminSubMenus.some(s => location.pathname === s.path))
  // Sur mobile, le menu est un tiroir fermé par défaut
  const [menuOuvert, setMenuOuvert] = useState(false)
  // Sur grand écran : menu réduit (icônes) ou déplié, et sa largeur
  const [pref, setPref] = useState(lirePreference)
  const [glisse, setGlisse] = useState(false)
  const largeurGlisse = useRef(pref.largeur)

  const reduit = grandEcran && pref.replie
  const largeur = reduit ? LARGEUR_REDUITE : pref.largeur

  const majPref = (next) => {
    setPref(next)
    ecrirePreference(next)
  }
  const basculer = () => majPref({ ...pref, replie: !pref.replie })

  // Touche Échap : ferme le tiroir
  useEffect(() => {
    if (!menuOuvert) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOuvert(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOuvert])

  // Poignée : on tire le bord du menu pour le redimensionner (ou le réduire)
  const debutGlisse = (e) => {
    e.preventDefault()
    setGlisse(true)
    // Largeur à retrouver si le glissement se termine en menu réduit
    const largeurDepart = pref.largeur
    largeurGlisse.current = largeurDepart
    const bouger = (ev) => {
      const x = ev.clientX
      if (x < SEUIL_REDUCTION) {
        setPref(p => ({ ...p, replie: true }))
      } else {
        const l = Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, x))
        largeurGlisse.current = l
        setPref(p => ({ ...p, replie: false, largeur: l }))
      }
    }
    const fin = () => {
      setGlisse(false)
      window.removeEventListener('pointermove', bouger)
      window.removeEventListener('pointerup', fin)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setPref(p => {
        const next = { ...p, largeur: p.replie ? largeurDepart : largeurGlisse.current }
        ecrirePreference(next)
        return next
      })
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', bouger)
    window.addEventListener('pointerup', fin)
  }

  // Clavier sur la poignée : flèches pour élargir / rétrécir, Entrée pour réduire / déplier
  const clavierPoignee = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      if (reduit) return majPref({ ...pref, replie: false })
      const l = Math.min(LARGEUR_MAX, Math.max(LARGEUR_MIN, pref.largeur + (e.key === 'ArrowRight' ? 20 : -20)))
      majPref({ ...pref, largeur: l })
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      basculer()
    }
  }

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

  const itemClass = (actif) => `w-full flex items-center ${reduit ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-sm font-medium transition duration-150 ${
    actif
      ? 'bg-white text-brand-800 shadow-sm'
      : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
  }`

  const lien = (item, actif) => {
    const Icon = item.icon
    return (
      <button
        key={item.path}
        onClick={() => aller(item.path)}
        className={`${itemClass(actif)} relative`}
        title={reduit ? item.label : undefined}
        aria-label={reduit ? item.label : undefined}
        aria-current={actif ? 'page' : undefined}
      >
        <Icon className={`w-5 h-5 shrink-0 ${actif ? 'text-brand-600' : ''}`} />
        {!reduit && <span className="truncate">{item.label}</span>}
        {actif && <span className={`w-1.5 h-1.5 rounded-full bg-or-400 ${reduit ? 'absolute right-1.5 top-1.5' : 'ml-auto'}`} />}
      </button>
    )
  }

  return (
    <div className="flex h-dvh bg-slate-50 print:block print:h-auto print:bg-white">
      {/* Fond sombre derrière le tiroir (mobile) */}
      {menuOuvert && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden print:hidden" onClick={() => setMenuOuvert(false)} aria-hidden="true" />
      )}

      {/* Menu latéral : tiroir sur mobile, fixe (réductible et redimensionnable) à partir de lg */}
      <aside
        style={{ '--largeur-menu': `${largeur}px` }}
        className={`print:hidden fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-gradient-to-b from-brand-800 via-brand-900 to-brand-950 text-brand-50 flex flex-col shadow-xl
          lg:relative lg:z-auto lg:max-w-none lg:w-[var(--largeur-menu)] lg:shrink-0 lg:translate-x-0
          ${glisse ? '' : 'transition-[transform,width] duration-200'} ${menuOuvert ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Identité de la clinique */}
        <div className={`border-b border-white/10 flex ${reduit ? 'flex-col items-center gap-3 px-2 pt-5 pb-4' : 'items-start gap-3 px-5 pt-6 pb-5'}`}>
          <LogoPastille className={reduit ? 'w-11 h-11' : 'w-12 h-12'} />
          {!reduit && (
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-white leading-tight">{clinique.nom}</h2>
              {clinique.slogan && <p className="text-[11px] text-brand-200/80 leading-snug mt-1">{clinique.slogan}</p>}
            </div>
          )}
          <button onClick={() => setMenuOuvert(false)} className="lg:hidden p-1.5 -mr-1.5 text-brand-200 hover:text-white rounded-lg" aria-label="Fermer le menu">
            <X className="w-5 h-5" />
          </button>
          {/* Réduire / déplier (grand écran) */}
          <button
            onClick={basculer}
            className="hidden lg:inline-flex p-1.5 text-brand-200 hover:text-white hover:bg-white/10 rounded-lg"
            title={reduit ? 'Déplier le menu' : 'Réduire le menu'}
            aria-label={reduit ? 'Déplier le menu' : 'Réduire le menu'}
          >
            {reduit ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        <nav className={`flex-1 py-5 space-y-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent] ${reduit ? 'px-2' : 'px-3'}`}>
          {/* Tableau de bord en premier (réservé à l'admin) */}
          {isAdmin && (
            <div className="pb-3 mb-3 border-b border-white/10">
              {lien(tableauDeBord, location.pathname === tableauDeBord.path)}
            </div>
          )}

          {reduit
            ? <div className="mx-auto w-6 border-t border-white/15 mb-2" aria-hidden="true" />
            : <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-300/70">Services</p>}

          {menuItems
            .filter(item => profile && item.roles.includes(profile.role))
            .map(item => lien(item, location.pathname.startsWith(item.path) ||
              (item.path === '/reception' && location.pathname.startsWith('/patients/'))))}
        </nav>

        {/* Administration : tout en bas du menu (réservé à l'admin) */}
        {isAdmin && (
          <div className={`border-t border-white/10 py-3 space-y-1 ${reduit ? 'px-2' : 'px-3'}`}>
            {reduit ? (
              // Menu réduit : les pages d'administration directement en icônes
              adminSubMenus.map(sub => lien(sub, location.pathname === sub.path))
            ) : (
              <>
                {adminOpen && (
                  <div className="mb-1 ml-5 pl-3 border-l border-white/15 space-y-1">
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
                          <SubIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  aria-expanded={adminOpen}
                  className={`${itemClass(!adminOpen && adminSubMenus.some(sub => location.pathname === sub.path))} justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    Administration
                  </span>
                  {/* La section s'ouvre vers le haut */}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${adminOpen ? '' : 'rotate-180'}`} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Utilisateur connecté */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center ${reduit ? 'flex-col gap-2 py-1' : 'gap-3 px-2 py-2'}`}>
            <div
              className="w-9 h-9 shrink-0 rounded-full bg-or-400 text-brand-950 font-bold text-sm flex items-center justify-center"
              title={reduit ? `${profile?.prenom || ''} ${profile?.nom || ''} — ${role.label}` : undefined}
            >
              {initiales}
            </div>
            {!reduit && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{profile?.prenom} {profile?.nom}</div>
                <div className="text-xs text-brand-200/80 truncate">{role.label}</div>
              </div>
            )}
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

        {/* Poignée : tirer pour redimensionner, double-clic pour réduire / déplier */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le menu"
          aria-valuenow={largeur}
          aria-valuemin={LARGEUR_REDUITE}
          aria-valuemax={LARGEUR_MAX}
          tabIndex={0}
          title="Tirer pour redimensionner • double-clic pour réduire ou déplier"
          onPointerDown={debutGlisse}
          onDoubleClick={basculer}
          onKeyDown={clavierPoignee}
          className="hidden lg:block absolute top-0 -right-1.5 w-3 h-full cursor-col-resize group z-10 outline-none"
        >
          <div className={`mx-auto h-full w-0.5 transition-colors ${glisse ? 'bg-or-400' : 'bg-transparent group-hover:bg-or-400/70 group-focus-visible:bg-or-400'}`} />
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
