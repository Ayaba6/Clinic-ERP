import { useAdminStats } from '../hooks/useAdminStats'
import { Users, UserCog, Pill, DollarSign, Loader2, ShieldCheck, Activity } from 'lucide-react'

export default function DashboardAdmin() {
  const { stats, loading } = useAdminStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Chargement du tableau de bord administrateur...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Administration & Pilotage</h2>
          <p className="text-sm text-slate-500">Vue d'ensemble des performances et de l'activité globale de la clinique.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Système Opérationnel & Sécurisé (RBAC)</span>
        </div>
      </div>

      {/* Cartes KPI (Indicateurs Clés) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Patients */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patients Enregistrés</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats.totalPatients}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Personnel Actif */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Personnel Médical / Admin</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats.totalStaff}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <UserCog className="w-6 h-6" />
          </div>
        </div>

        {/* Alertes Stock Pharmacie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ruptures / Alertes Stock</p>
            <h3 className={`text-3xl font-extrabold ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {stats.lowStockCount}
            </h3>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <Pill className="w-6 h-6" />
          </div>
        </div>

        {/* Chiffre d'affaires encaissé */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chiffre d'Affaires</p>
            <h3 className="text-2xl font-extrabold text-slate-800">
              {stats.totalRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-normal">FCFA</span>
            </h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Section informative / Raccourcis d'administration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">État de l'Architecture ERP</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Votre ERP clinique est configuré avec une architecture modulaire orientée domaine (Domain-Driven) et sécurisée par rôle (RBAC). 
            Chaque module (Réception, Consultation, Pharmacie, Bloc et Caisse) interagit en temps réel via Supabase.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <UserCog className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Gestion des rôles et accès</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            En tant qu'administrateur, vous possédez les droits globaux pour superviser l'ensemble des flux financiers, médicaux et logistiques de la structure de santé.
          </p>
        </div>
      </div>
    </div>
  )
}