import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStats } from '../hooks/useAdminStats'
import { labelMode } from '../../caisse/hooks/useCaisse'
import ColumnChart from '../../../components/charts/ColumnChart'
import BarList from '../../../components/charts/BarList'
import { formatMontant } from '../../../lib/format'
import {
  Loader2, Stethoscope, UserPlus, Wallet, Users, PackageX, AlertTriangle,
  TrendingUp, TrendingDown, Table2, BarChart3,
} from 'lucide-react'

const PERIODES = [
  [7, '7 jours'],
  [30, '30 jours'],
  [90, '90 jours'],
  [365, '12 mois'],
]

const TYPES_ACTE = { consultation: 'Consultations', medicament: 'Médicaments', bloc: 'Bloc opératoire', autre: 'Autres actes' }

// « 2026-11-02 » -> date locale (sans décalage de fuseau)
const parseJour = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Variation vs période précédente : { texte, hausse } ou null
function variation(cur, prev) {
  if (!prev) return cur > 0 ? { texte: 'Nouveau sur la période', hausse: true } : null
  const pct = Math.round(((cur - prev) / prev) * 100)
  return { texte: `${pct > 0 ? '+' : ''}${pct} % vs période précédente`, hausse: pct >= 0 }
}

export default function DashboardAdmin() {
  const [jours, setJours] = useState(30)
  const { data, error, initialLoading, refreshing } = useAdminStats(jours)

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Chargement du tableau de bord...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-2">
        <p className="font-semibold text-slate-700">Impossible de charger le tableau de bord.</p>
        <p className="text-sm text-slate-500">{error}</p>
        {error?.includes('tableau_de_bord') && (
          <p className="text-sm text-slate-500">Le script supabase/tableau_de_bord.sql doit être exécuté dans Supabase.</p>
        )}
      </div>
    )
  }

  const k = data.kpis
  const mensuel = data.periode.mensuel
  const varRecettes = variation(Number(k.recettes), Number(k.recettes_prec))

  const serie = (data.recettes_serie || []).map(p => {
    const d = parseJour(p.date)
    return {
      key: p.date,
      value: Number(p.montant),
      label: mensuel
        ? d.toLocaleDateString('fr-FR', { month: 'short' })
        : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      tooltip: mensuel
        ? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    }
  })

  return (
    <div className="space-y-6">
      {/* En-tête + filtre de période (s'applique à tout ce qui suit) */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tableau de bord</h2>
          <p className="text-sm text-slate-500">
            Du {parseJour(data.periode.debut).toLocaleDateString('fr-FR')} au {parseJour(data.periode.fin).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl text-sm">
            {PERIODES.map(([j, label]) => (
              <button
                key={j}
                onClick={() => setJours(j)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${jours === j ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className={`space-y-6 transition-opacity ${refreshing ? 'opacity-50' : ''}`}>
        {/* Chiffre principal + recettes */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-slate-500">Recettes encaissées</p>
              <p className="text-5xl font-bold text-slate-900 mt-2 tracking-tight">
                {Number(k.recettes).toLocaleString('fr-FR')}
                <span className="text-lg font-medium text-slate-400 ml-2">FCFA</span>
              </p>
              {varRecettes && (
                <p className={`mt-2 inline-flex items-center gap-1 text-sm font-medium ${varRecettes.hausse ? 'text-[#006300]' : 'text-[#d03b3b]'}`}>
                  {varRecettes.hausse ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {varRecettes.texte}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
              <div>
                <dt className="text-slate-500">Aujourd'hui</dt>
                <dd className="font-semibold text-slate-800">{formatMontant(k.recettes_jour)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Reste à encaisser</dt>
                <dd className="font-semibold text-slate-800">{formatMontant(k.reste_a_encaisser)}</dd>
              </div>
            </dl>
          </div>

          <ChartCard
            className="xl:col-span-2"
            title={mensuel ? 'Recettes encaissées par mois' : 'Recettes encaissées par jour'}
            table={{
              head: [mensuel ? 'Mois' : 'Jour', 'Montant'],
              rows: serie.map(p => [p.tooltip, formatMontant(p.value)]),
            }}
          >
            <ColumnChart data={serie} formatValue={formatMontant} />
          </ChartCard>
        </div>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            icon={Stethoscope}
            label="Consultations"
            value={k.consultations}
            delta={variation(Number(k.consultations), Number(k.consultations_prec))}
          />
          <StatTile
            icon={UserPlus}
            label="Nouveaux patients"
            value={k.nouveaux_patients}
            delta={variation(Number(k.nouveaux_patients), Number(k.nouveaux_patients_prec))}
            sub={`${Number(k.total_patients).toLocaleString('fr-FR')} au total`}
          />
          <StatTile
            icon={Wallet}
            label="Factures à encaisser"
            value={k.factures_ouvertes}
            sub={formatMontant(k.reste_a_encaisser)}
            to="/caisse"
          />
          <StatTile
            icon={Users}
            label="Patients en file d'attente"
            value={k.en_attente}
            sub="en ce moment"
            to="/consultation"
          />
        </div>

        {/* Alertes de stock : statut avec icône + libellé, jamais la couleur seule */}
        {(k.ruptures > 0 || k.stock_bas > 0) && (
          <Link
            to="/pharmacie"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition text-sm"
          >
            <span className="font-semibold text-slate-700">Alertes pharmacie</span>
            {k.ruptures > 0 && (
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <PackageX className="w-4 h-4 text-[#d03b3b]" /> <b>{k.ruptures}</b> en rupture
              </span>
            )}
            {k.stock_bas > 0 && (
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <AlertTriangle className="w-4 h-4 text-[#ec835a]" /> <b>{k.stock_bas}</b> en stock bas
              </span>
            )}
            <span className="ml-auto text-xs text-blue-600">Voir le stock →</span>
          </Link>
        )}

        {/* Répartitions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Recettes par mode de paiement">
            <BarList
              data={(data.par_mode || []).map(m => ({ key: m.mode, label: labelMode(m.mode), value: Number(m.montant) }))}
              formatValue={formatMontant}
            />
          </ChartCard>
          <ChartCard title="Montant facturé par type d'acte">
            <BarList
              data={(data.facture_par_type || []).map(t => ({ key: t.type, label: TYPES_ACTE[t.type] || t.type, value: Number(t.montant) }))}
              formatValue={formatMontant}
            />
          </ChartCard>
          <ChartCard title="Consultations par médecin">
            <BarList
              data={(data.par_medecin || []).map((m, i) => ({ key: `${m.nom}-${i}`, label: `Dr ${m.nom}`, value: Number(m.consultations) }))}
              formatValue={(v) => v.toLocaleString('fr-FR')}
            />
          </ChartCard>
          <ChartCard title="Médicaments les plus délivrés">
            <BarList
              data={(data.top_medicaments || []).map((m, i) => ({ key: `${m.nom}-${i}`, label: m.nom, value: Number(m.quantite) }))}
              formatValue={(v) => `${v.toLocaleString('fr-FR')} u.`}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon: Icon, label, value, delta, sub, to }) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-3xl font-semibold text-slate-900 mt-2">{Number(value).toLocaleString('fr-FR')}</p>
      {delta && (
        <p className={`text-xs font-medium mt-1 ${delta.hausse ? 'text-[#006300]' : 'text-[#d03b3b]'}`}>{delta.texte}</p>
      )}
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </>
  )
  const className = 'bg-white p-5 rounded-2xl border border-slate-200 shadow-sm block'
  return to
    ? <Link to={to} className={`${className} hover:border-slate-300 transition`}>{content}</Link>
    : <div className={className}>{content}</div>
}

// Carte de graphique, avec bascule vers une vue tableau quand `table` est fourni
function ChartCard({ title, table, className = '', children }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {table && (
          <button
            onClick={() => setAsTable(!asTable)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
            title={asTable ? 'Afficher le graphique' : 'Afficher le tableau'}
          >
            {asTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
            {asTable ? 'Graphique' : 'Tableau'}
          </button>
        )}
      </div>
      {asTable && table ? (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                {table.head.map((h, i) => <th key={h} className={`py-2 ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i} className={`py-1.5 ${i > 0 ? 'text-right font-medium text-slate-800' : 'text-slate-600'}`} style={i > 0 ? { fontVariantNumeric: 'tabular-nums' } : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : children}
    </div>
  )
}
