import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  useGrossesses, alertesGrossesse, derniereCpn, joursDeGrossesse, joursAvant, formatSA, trimestre,
} from '../hooks/useMaternite'
import GrossesseFormModal from '../components/GrossesseFormModal'
import Alertes from '../components/Alertes'
import StatutBadge from '../../../components/ui/StatutBadge'
import { formatDate } from '../../../lib/format'
import { Baby, HeartPulse, CalendarClock, AlertCircle, CalendarCheck, Plus, Search, Loader2, Archive } from 'lucide-react'

const TABS = [
  { key: 'suivi', label: 'Grossesses suivies', icon: HeartPulse },
  { key: 'cpn', label: 'CPN à faire', icon: CalendarCheck },
  { key: 'cloturees', label: 'Clôturées', icon: Archive },
]

export default function MaternitePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const canWrite = ['admin', 'medecin', 'sage_femme'].includes(profile?.role)
  const [tab, setTab] = useState('suivi')
  const [nouvelle, setNouvelle] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const enCours = useGrossesses('en_cours')
  const cloturees = useGrossesses('cloturees')

  // Enrichissement : âge gestationnel, dernière CPN, alertes
  const suivies = enCours.grossesses.map(g => {
    const last = derniereCpn(g)
    return {
      ...g,
      jours: joursDeGrossesse(g),
      last,
      prochaine: last?.prochaine_cpn || null,
      alertes: alertesGrossesse(g),
    }
  })

  const term = searchTerm.trim().toLowerCase()
  const match = (g) => [g.patient?.nom, g.patient?.prenom, g.patient?.code_patient, g.patient?.telephone]
    .some(v => (v || '').toLowerCase().includes(term))

  // CPN à faire : prévue aujourd'hui ou en retard, ou aucune CPN encore
  const aFaire = suivies
    .filter(g => !g.prochaine || joursAvant(g.prochaine) <= 0)
    .sort((a, b) => (a.prochaine || '0000').localeCompare(b.prochaine || '0000'))

  const kpis = [
    { label: 'Grossesses suivies', value: suivies.length, icon: HeartPulse },
    { label: 'Alertes critiques', value: suivies.filter(g => g.alertes.some(a => a.niveau === 'critique')).length, icon: AlertCircle, alerte: true },
    { label: 'CPN à faire / en retard', value: aFaire.length, icon: CalendarClock, alerte: true },
    { label: 'Termes dans 14 jours', value: suivies.filter(g => { const d = joursAvant(g.date_terme_prevue); return d >= 0 && d <= 14 }).length, icon: Baby },
  ]

  const liste = tab === 'suivi' ? suivies : tab === 'cpn' ? aFaire : cloturees.grossesses
  const loading = tab === 'cloturees' ? cloturees.loading : enCours.loading
  const error = tab === 'cloturees' ? cloturees.error : enCours.error

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Maternité — Suivi de grossesse</h2>
          <p className="text-sm text-slate-500">Consultations prénatales, alertes et termes à venir.</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setNouvelle(true)}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau suivi de grossesse</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{k.label}</p>
                <Icon className={`w-4 h-4 ${k.alerte && k.value > 0 ? 'text-[#d03b3b]' : 'text-slate-400'}`} />
              </div>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{k.value}</p>
            </div>
          )
        })}
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 border-b border-slate-200">
        <div className="flex overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.key ? 'border-brand-600 text-pink-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.key === 'cpn' && aFaire.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 font-semibold">{aFaire.length}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 mb-2 rounded-xl border border-slate-200 md:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Patiente, code, téléphone..." className="w-full bg-transparent outline-none text-sm" />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}{error.includes('grossesses') && ' — le script supabase/grossesse.sql doit être exécuté dans Supabase.'}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : liste.filter(match).length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">
            {tab === 'suivi' ? 'Aucune grossesse en cours de suivi.' : tab === 'cpn' ? 'Aucune CPN à faire aujourd\'hui.' : 'Aucune grossesse clôturée ces 12 derniers mois.'}
          </div>
        ) : tab === 'cloturees' ? (
          <TableCloturees grossesses={liste.filter(match)} onOpen={(id) => navigate(`/maternite/grossesses/${id}`)} />
        ) : (
          <TableSuivi grossesses={liste.filter(match)} onOpen={(id) => navigate(`/maternite/grossesses/${id}`)} />
        )}
      </div>

      {nouvelle && (
        <GrossesseFormModal
          onSaved={(id) => navigate(`/maternite/grossesses/${id}`)}
          onClose={() => setNouvelle(false)}
        />
      )}
    </div>
  )
}

function TableSuivi({ grossesses, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
            <th className="py-3 px-5">Patiente</th>
            <th className="py-3 px-5">Âge gestationnel</th>
            <th className="py-3 px-5">Terme prévu</th>
            <th className="py-3 px-5">Dernière CPN</th>
            <th className="py-3 px-5">Prochaine CPN</th>
            <th className="py-3 px-5">Alertes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {grossesses.map(g => (
            <tr key={g.id} onClick={() => onOpen(g.id)} className="hover:bg-pink-50/40 cursor-pointer">
              <td className="py-3 px-5">
                <div className="font-medium text-slate-800">{g.patient?.nom} {g.patient?.prenom}</div>
                <div className="text-xs text-slate-400 font-mono">{g.patient?.code_patient}</div>
              </td>
              <td className="py-3 px-5 whitespace-nowrap">
                <div className="font-semibold text-slate-800">{formatSA(g.jours)}</div>
                <div className="text-xs text-slate-500">{trimestre(g.jours)}</div>
              </td>
              <td className="py-3 px-5 whitespace-nowrap text-slate-700">{formatDate(g.date_terme_prevue)}</td>
              <td className="py-3 px-5 whitespace-nowrap text-slate-600">
                {g.last ? <>CPN{g.last.numero} • {formatDate(g.last.date_cpn)}</> : <span className="text-slate-400">Aucune</span>}
              </td>
              <td className="py-3 px-5 whitespace-nowrap text-slate-700">{g.prochaine ? formatDate(g.prochaine) : '–'}</td>
              <td className="py-3 px-5"><Alertes alertes={g.alertes} compact /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableCloturees({ grossesses, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
            <th className="py-3 px-5">Patiente</th>
            <th className="py-3 px-5">Issue</th>
            <th className="py-3 px-5">Clôturée le</th>
            <th className="py-3 px-5">CPN réalisées</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {grossesses.map(g => (
            <tr key={g.id} onClick={() => onOpen(g.id)} className="hover:bg-pink-50/40 cursor-pointer">
              <td className="py-3 px-5 font-medium text-slate-800">{g.patient?.nom} {g.patient?.prenom}</td>
              <td className="py-3 px-5">
                <StatutBadge statut={g.statut} />
                {g.issue && <div className="text-xs text-slate-500 mt-0.5">{g.issue}</div>}
              </td>
              <td className="py-3 px-5 text-slate-600">{formatDate(g.date_cloture)}</td>
              <td className="py-3 px-5 text-slate-600">{g.cpn?.length || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
