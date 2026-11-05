import { useState } from 'react'
import { useMedicaments, etatStock, etatPeremption } from '../hooks/usePharmacie'
import OrdonnancesTab from '../components/OrdonnancesTab'
import StockTab from '../components/StockTab'
import MouvementsTab from '../components/MouvementsTab'
import { ClipboardList, Package, History, PackageX, AlertTriangle, CalendarClock } from 'lucide-react'

const TABS = [
  { key: 'ordonnances', label: 'Ordonnances', icon: ClipboardList },
  { key: 'stock', label: 'Stock', icon: Package },
  { key: 'mouvements', label: 'Mouvements', icon: History },
]

export default function PharmaciePage() {
  const [tab, setTab] = useState('ordonnances')
  // Chargé ici pour les indicateurs et partagé avec l'onglet Stock
  const medicamentsState = useMedicaments()
  const { medicaments, fetchMedicaments } = medicamentsState

  const ruptures = medicaments.filter(m => etatStock(m) === 'rupture').length
  const stockBas = medicaments.filter(m => etatStock(m) === 'bas').length
  const peremptions = medicaments.filter(m => ['perime', 'proche'].includes(etatPeremption(m))).length

  const kpis = [
    { label: 'Ruptures', value: ruptures, icon: PackageX, alert: 'text-red-600 bg-red-50' },
    { label: 'Stock bas', value: stockBas, icon: AlertTriangle, alert: 'text-amber-600 bg-amber-50' },
    { label: 'Périmés ou < 3 mois', value: peremptions, icon: CalendarClock, alert: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pharmacie & Stock</h2>
        <p className="text-sm text-slate-500">Délivrance des ordonnances, gestion du catalogue et suivi des mouvements.</p>
      </div>

      {/* Indicateurs : cliquer ouvre le stock */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <button
              key={k.label}
              onClick={() => setTab('stock')}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between text-left hover:border-slate-300 transition"
            >
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-3xl font-extrabold ${k.value > 0 ? k.alert.split(' ')[0] : 'text-slate-800'}`}>{k.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.value > 0 ? k.alert : 'bg-emerald-50 text-emerald-600'}`}>
                <Icon className="w-5 h-5" />
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex overflow-x-auto border-b border-slate-200">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* Après une délivrance, le stock affiché est rechargé */}
      {tab === 'ordonnances' && <OrdonnancesTab onDelivered={fetchMedicaments} />}
      {tab === 'stock' && <StockTab medicamentsState={medicamentsState} />}
      {tab === 'mouvements' && <MouvementsTab />}
    </div>
  )
}
