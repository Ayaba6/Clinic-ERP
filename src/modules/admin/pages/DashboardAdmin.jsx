import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminStats } from '../hooks/useAdminStats'
import { labelMode } from '../../caisse/hooks/useCaisse'
import { labelMode as labelModeAccouchement } from '../../naissance/hooks/useNaissance'
import ColumnChart from '../../../components/charts/ColumnChart'
import BarList from '../../../components/charts/BarList'
import Sparkline from '../../../components/charts/Sparkline'
import Jauge from '../../../components/charts/Jauge'
import { formatMontant } from '../../../lib/format'
import {
  Loader2, Stethoscope, UserPlus, Wallet, Users, PackageX, AlertTriangle, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Table2, BarChart3, Baby, HeartPulse, BedDouble, CalendarDays,
  Ambulance, Receipt, Clock, ArrowRight,
} from 'lucide-react'

const PERIODES = [
  [7, '7 jours'],
  [30, '30 jours'],
  [90, '90 jours'],
  [365, '12 mois'],
]

// « 2026-11-02 » -> date locale (sans décalage de fuseau)
const parseJour = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const nombre = (v) => Number(v || 0).toLocaleString('fr-FR')

// Variation vs période précédente. sens = 1 si la hausse est une bonne nouvelle.
function variation(cur, prev, sens = 1) {
  cur = Number(cur || 0)
  prev = Number(prev || 0)
  if (!prev) return cur > 0 ? { texte: 'nouveau', ton: 'neutre', icone: TrendingUp } : null
  const pct = Math.round(((cur - prev) / prev) * 100)
  if (pct === 0) return { texte: 'stable', ton: 'neutre', icone: Minus }
  const hausse = pct > 0
  return {
    texte: `${hausse ? '+' : ''}${pct} %`,
    ton: (hausse ? sens : -sens) > 0 ? 'bon' : 'mauvais',
    icone: hausse ? TrendingUp : TrendingDown,
  }
}

const TON_DELTA = {
  bon: 'text-[#006300] bg-emerald-50',
  mauvais: 'text-[#d03b3b] bg-red-50',
  neutre: 'text-slate-600 bg-slate-100',
}

export default function DashboardAdmin() {
  const [jours, setJours] = useState(30)
  const { data, error, initialLoading, refreshing } = useAdminStats(jours)

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
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
  const m = data.maternite || {}
  const mensuel = data.periode.mensuel
  const serie = (data.recettes_serie || []).map(p => {
    const d = parseJour(p.date)
    return {
      ...p,
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
  const tendance = (champ) => serie.map(p => Number(p[champ] || 0))

  const recettes = Number(k.recettes)
  const facture = Number(k.facture || 0)
  const recouvrement = facture > 0 ? Math.round((recettes / facture) * 100) : null
  const tauxCesarienne = m.accouchements > 0 ? Math.round((m.cesariennes / m.accouchements) * 100) : null
  const libellePeriode = `du ${parseJour(data.periode.debut).toLocaleDateString('fr-FR')} au ${parseJour(data.periode.fin).toLocaleDateString('fr-FR')}`

  // Points d'attention pour la direction : icône + libellé, jamais la couleur seule
  const alertes = [
    { n: m.hemorragies, texte: 'hémorragie(s) du post-partum', critique: true, icone: AlertCircle, to: '/naissance' },
    { n: m.mort_nes, texte: 'mort-né(s)', critique: true, icone: AlertCircle, to: '/naissance' },
    { n: m.apgar_bas, texte: 'nouveau-né(s) avec Apgar < 7 à 5 min', critique: true, icone: AlertCircle, to: '/naissance' },
    { n: k.ruptures, texte: 'médicament(s) en rupture de stock', critique: true, icone: PackageX, to: '/pharmacie' },
    { n: k.impayes_anciens, texte: `facture(s) impayée(s) depuis plus de 7 jours (${formatMontant(k.impayes_anciens_montant)})`, icone: Receipt, to: '/caisse' },
    { n: m.transferts, texte: 'transfert(s) / évacuation(s)', icone: Ambulance, to: '/naissance' },
    { n: m.petits_poids, texte: 'petit(s) poids de naissance < 2 500 g', icone: AlertTriangle, to: '/naissance' },
    { n: k.stock_bas, texte: 'médicament(s) en stock bas', icone: AlertTriangle, to: '/pharmacie' },
    { n: m.grossesses_a_risque, texte: 'grossesse(s) à risque en cours de suivi', icone: HeartPulse, to: '/maternite' },
  ].filter(a => Number(a.n) > 0)

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* En-tête et période (s'applique à tout ce qui suit) */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Pilotage de la clinique</p>
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">Tableau de bord</h2>
          <p className="text-sm text-slate-500 mt-0.5">Activité et résultats {libellePeriode}</p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl text-sm shadow-sm">
            {PERIODES.map(([j, label]) => (
              <button
                key={j}
                onClick={() => setJours(j)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${jours === j ? 'bg-brand-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className={`space-y-6 transition-opacity ${refreshing ? 'opacity-50' : ''}`}>
        {/* Aujourd'hui : la situation en temps réel */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-800 text-white shadow-sm">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5" aria-hidden="true" />
          <div className="relative px-5 py-4 lg:px-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-100 mb-3">Aujourd'hui</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-4">
              <MiniStat icone={Wallet} label="Encaissé" valeur={formatMontant(k.recettes_jour)} to="/caisse" />
              <MiniStat icone={Stethoscope} label="Consultations" valeur={nombre(k.consultations_jour)} to="/consultation" />
              <MiniStat icone={Baby} label="Accouchements" valeur={nombre(k.accouchements_jour)} to="/naissance" />
              <MiniStat icone={BedDouble} label="En salle de naissance" valeur={nombre(m.en_travail)} to="/naissance" />
              <MiniStat icone={Users} label="En file d'attente" valeur={nombre(k.en_attente)} to="/consultation" />
              <MiniStat icone={CalendarDays} label="Rendez-vous" valeur={nombre(m.rdv_aujourdhui)} to="/rendez-vous" />
            </div>
          </div>
        </section>

        {/* Finances */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Carte className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">Recettes encaissées</p>
                <Delta v={variation(recettes, k.recettes_prec)} />
              </div>
              <p className="text-4xl lg:text-5xl font-bold text-slate-900 mt-2 tracking-tight">
                {recettes.toLocaleString('fr-FR')}
                <span className="text-base font-medium text-slate-400 ml-2">FCFA</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">vs {formatMontant(k.recettes_prec)} sur la période précédente</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Taux de recouvrement</span>
                <b className="text-slate-900">{recouvrement !== null ? `${recouvrement} %` : '–'}</b>
              </div>
              <Jauge valeur={recouvrement} etat={recouvrement === null || recouvrement >= 85 ? 'bon' : recouvrement >= 60 ? 'attention' : 'critique'} />
              <p className="text-xs text-slate-500">Encaissé ÷ facturé ({formatMontant(facture)} facturés sur la période)</p>
            </div>

            <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm mt-auto">
              <div>
                <dt className="text-slate-500">Reste à encaisser</dt>
                <dd className="font-semibold text-slate-900">{formatMontant(k.reste_a_encaisser)}</dd>
                <dd className="text-xs text-slate-500">{nombre(k.factures_ouvertes)} facture(s) ouverte(s)</dd>
              </div>
              <div>
                <dt className="text-slate-500">Impayés &gt; 7 jours</dt>
                <dd className={`font-semibold ${Number(k.impayes_anciens) > 0 ? 'text-[#d03b3b]' : 'text-slate-900'}`}>{formatMontant(k.impayes_anciens_montant)}</dd>
                <dd className="text-xs text-slate-500">{nombre(k.impayes_anciens)} facture(s) à relancer</dd>
              </div>
            </dl>
          </Carte>

          <ChartCard
            className="xl:col-span-2"
            title={mensuel ? 'Recettes encaissées par mois' : 'Recettes encaissées par jour'}
            action={<Link to="/caisse" className="text-xs font-medium text-brand-700 hover:underline">Caisse →</Link>}
            table={{
              head: [mensuel ? 'Mois' : 'Jour', 'Montant'],
              rows: serie.map(p => [p.tooltip, formatMontant(p.value)]),
            }}
          >
            <ColumnChart data={serie} formatValue={formatMontant} height={260} />
          </ChartCard>
        </div>

        {/* Activité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Tuile icone={Stethoscope} label="Consultations" valeur={k.consultations}
            delta={variation(k.consultations, k.consultations_prec)} tendance={tendance('consultations')} to="/consultation" />
          <Tuile icone={Baby} label="Accouchements" valeur={m.accouchements}
            delta={variation(m.accouchements, m.accouchements_prec)} tendance={tendance('accouchements')} to="/naissance"
            sous={`${nombre(m.naissances_vivantes)} naissance(s) vivante(s)`} />
          <Tuile icone={HeartPulse} label="CPN réalisées" valeur={m.cpn}
            delta={variation(m.cpn, m.cpn_prec)} tendance={tendance('cpn')} to="/maternite"
            sous={`${nombre(m.grossesses_suivies)} grossesse(s) suivie(s)`} />
          <Tuile icone={UserPlus} label="Nouveaux patients" valeur={k.nouveaux_patients}
            delta={variation(k.nouveaux_patients, k.nouveaux_patients_prec)} tendance={tendance('patients')} to="/reception"
            sous={`${nombre(k.total_patients)} dossiers au total`} />
        </div>

        {/* Maternité et points d'attention */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <Carte className="xl:col-span-3 space-y-5">
            <EnTeteCarte icone={Baby} titre="Maternité" lien="/naissance" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Naissances vivantes</p>
                <p className="text-3xl font-semibold text-slate-900">{nombre(m.naissances_vivantes)}</p>
                <p className="text-xs text-slate-500">{nombre(m.filles)} fille(s) • {nombre(m.garcons)} garçon(s)</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Taux de césarienne</span>
                  <b className="text-slate-900">{tauxCesarienne !== null ? `${tauxCesarienne} %` : '–'}</b>
                </div>
                <Jauge
                  valeur={tauxCesarienne}
                  etat={tauxCesarienne === null || tauxCesarienne <= 15 ? 'bon' : tauxCesarienne <= 25 ? 'attention' : 'critique'}
                  repere={[10, 15]}
                  libelleRepere="Repère couramment cité par l'OMS : 10 à 15 %"
                />
                <p className="text-xs text-slate-500">
                  {nombre(m.cesariennes)} césarienne(s) sur {nombre(m.accouchements)} accouchement(s) •
                  zone grisée : repère 10–15 % couramment cité par l'OMS
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Repere icone={HeartPulse} label="Grossesses suivies" valeur={nombre(m.grossesses_suivies)} to="/maternite" />
              <Repere icone={AlertTriangle} label="dont à risque" valeur={nombre(m.grossesses_a_risque)} to="/maternite" alerte={Number(m.grossesses_a_risque) > 0} />
              <Repere icone={BedDouble} label="En salle de naissance" valeur={nombre(m.en_travail)} to="/naissance" />
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-700 mb-3">Accouchements par mode</p>
              <BarList
                data={(m.par_mode || []).map(x => ({ key: x.mode, label: labelModeAccouchement(x.mode), value: Number(x.nombre) }))}
                formatValue={nombre}
              />
            </div>
          </Carte>

          <Carte className="xl:col-span-2 space-y-4">
            <EnTeteCarte icone={AlertTriangle} titre="À surveiller" />
            {alertes.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 border border-brand-100 text-sm text-brand-800">
                <CheckCircle2 className="w-5 h-5 text-brand-600" />
                Rien à signaler sur la période.
              </div>
            ) : (
              <ul className="space-y-2">
                {alertes.map(a => {
                  const Icone = a.icone
                  return (
                    <li key={a.texte}>
                      <Link to={a.to} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition">
                        <Icone className={`w-5 h-5 shrink-0 mt-0.5 ${a.critique ? 'text-[#d03b3b]' : 'text-[#ec835a]'}`} />
                        <span className="text-sm text-slate-700 flex-1"><b className="text-slate-900">{nombre(a.n)}</b> {a.texte}</span>
                        <ArrowRight className="w-4 h-4 text-slate-300 mt-0.5" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Événements médicaux sur la période, stocks et impayés en ce moment.
            </p>
          </Carte>
        </div>

        {/* Répartitions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Prestations qui rapportent le plus" sousTitre="Montant facturé, hors médicaments">
            <BarList
              data={(data.top_prestations || []).map((t, i) => ({ key: `${t.libelle}-${i}`, label: `${t.libelle} (${nombre(t.nombre)})`, value: Number(t.montant) }))}
              formatValue={formatMontant}
            />
          </ChartCard>
          <ChartCard title="Recettes par mode de paiement">
            <BarList
              data={(data.par_mode || []).map(x => ({ key: x.mode, label: labelMode(x.mode), value: Number(x.montant) }))}
              formatValue={formatMontant}
            />
          </ChartCard>
          <ChartCard title="Consultations par praticien">
            <BarList
              data={(data.par_medecin || []).map((x, i) => ({ key: `${x.nom}-${i}`, label: x.nom, value: Number(x.consultations) }))}
              formatValue={nombre}
            />
          </ChartCard>
          <ChartCard title="Médicaments les plus délivrés" sousTitre="Unités sorties du stock">
            <BarList
              data={(data.top_medicaments || []).map((x, i) => ({ key: `${x.nom}-${i}`, label: x.nom, value: Number(x.quantite) }))}
              formatValue={(v) => `${nombre(v)} u.`}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

// --- Composants de la page ---------------------------------------------

function Carte({ className = '', children }) {
  return <div className={`bg-white p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-sm min-w-0 ${className}`}>{children}</div>
}

function EnTeteCarte({ icone: Icone, titre, lien }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
        <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center"><Icone className="w-4 h-4" /></span>
        {titre}
      </h3>
      {lien && <Link to={lien} className="text-xs font-medium text-brand-700 hover:underline">Voir →</Link>}
    </div>
  )
}

function Delta({ v }) {
  if (!v) return null
  const Icone = v.icone
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TON_DELTA[v.ton]}`}>
      <Icone className="w-3.5 h-3.5" /> {v.texte}
    </span>
  )
}

function Repere({ icone: Icone, label, valeur, to, alerte }) {
  return (
    <Link to={to} className="rounded-xl bg-slate-50 hover:bg-brand-50 border border-slate-100 p-3 transition">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icone className={`w-3.5 h-3.5 ${alerte ? 'text-[#ec835a]' : 'text-brand-600'}`} /> {label}
      </p>
      <p className="text-xl font-semibold text-slate-900 mt-1">{valeur}</p>
    </Link>
  )
}

function MiniStat({ icone: Icone, label, valeur, to }) {
  return (
    <Link to={to} className="group flex items-center gap-3 min-w-0">
      <span className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-white/10 group-hover:bg-white/20 transition flex items-center justify-center">
        <Icone className="w-4 h-4 text-or-300" />
      </span>
      <span className="min-w-0">
        <span className="block text-base sm:text-lg font-bold leading-tight whitespace-nowrap">{valeur}</span>
        <span className="block text-xs text-brand-100 leading-tight">{label}</span>
      </span>
    </Link>
  )
}

function Tuile({ icone: Icone, label, valeur, delta, tendance, sous, to }) {
  return (
    <Link to={to} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand-200 hover:shadow transition block">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Icone className="w-4 h-4 text-brand-600" /> {label}
        </p>
        <Delta v={delta} />
      </div>
      <div className="flex items-end justify-between gap-3 mt-3">
        <div className="min-w-0">
          <p className="text-3xl font-semibold text-slate-900">{nombre(valeur)}</p>
          {sous && <p className="text-xs text-slate-500 mt-0.5">{sous}</p>}
        </div>
        <div className="shrink-0"><Sparkline values={tendance} width={96} label={`Tendance : ${label}`} /></div>
      </div>
    </Link>
  )
}

// Carte de graphique, avec bascule vers une vue tableau quand `table` est fourni
function ChartCard({ title, sousTitre, table, action, className = '', children }) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Carte className={className}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {sousTitre && <p className="text-xs text-slate-500">{sousTitre}</p>}
        </div>
        <div className="flex items-center gap-3">
          {action}
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
    </Carte>
  )
}
