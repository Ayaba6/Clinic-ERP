import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useAccouchements, useRegistre, alertesMesure, labelMode, hemorragie, apgarBas } from '../hooks/useNaissance'
import { joursDeGrossesse, formatSA } from '../../maternite/hooks/useMaternite'
import AdmissionModal from '../components/AdmissionModal'
import { RegistreNaissances } from '../components/Impressions'
import StatutBadge from '../../../components/ui/StatutBadge'
import { formatAttente, formatDateTime } from '../../../lib/format'
import { Activity, BookOpen, History, Plus, Loader2, AlertCircle, Clock, Printer } from 'lucide-react'

const TABS = [
  { key: 'travail', label: 'En travail', icon: Activity },
  { key: 'recents', label: 'Accouchements (30 j)', icon: History },
  { key: 'registre', label: 'Registre des naissances', icon: BookOpen },
]

const pad = (n) => String(n).padStart(2, '0')
const moisCourant = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export default function SalleNaissancePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const canWrite = ['admin', 'medecin', 'sage_femme'].includes(profile?.role)
  const [tab, setTab] = useState('travail')
  const [admission, setAdmission] = useState(false)
  const [toPrint, setToPrint] = useState(null)

  const travail = useAccouchements('travail')

  const print = (doc) => {
    setToPrint(doc)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Salle de naissance</h2>
            <p className="text-sm text-slate-500">Surveillance du travail, accouchements et registre des naissances.</p>
          </div>
          {canWrite && (
            <button
              onClick={() => setAdmission(true)}
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Admettre une parturiente</span>
            </button>
          )}
        </div>

        <div className="flex overflow-x-auto border-b border-slate-200">
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
                {t.key === 'travail' && travail.accouchements.length > 0 && (
                  <span className="text-xs bg-pink-100 text-pink-700 rounded-full px-2 py-0.5 font-semibold">{travail.accouchements.length}</span>
                )}
              </button>
            )
          })}
        </div>

        {tab === 'travail' && <EnTravail state={travail} onOpen={(id) => navigate(`/naissance/${id}`)} />}
        {tab === 'recents' && <Recents onOpen={(id) => navigate(`/naissance/${id}`)} />}
        {tab === 'registre' && <Registre onPrint={(mois, naissances) => print({ mois, naissances })} />}

        {admission && (
          <AdmissionModal onSaved={(id) => navigate(`/naissance/${id}`)} onClose={() => setAdmission(false)} />
        )}
      </div>

      <div className="hidden print:block">
        {toPrint && <RegistreNaissances mois={toPrint.mois} naissances={toPrint.naissances} />}
      </div>
    </>
  )
}

function EnTravail({ state, onOpen }) {
  const { accouchements, loading, error } = state
  if (loading) return <Chargement />
  if (error) return <Erreur error={error} />
  if (accouchements.length === 0) {
    return <Vide>Aucune parturiente en salle de naissance. La liste se met à jour automatiquement.</Vide>
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {accouchements.map(a => {
        const mesures = [...(a.surveillance_travail || [])].sort((x, y) => new Date(y.mesure_le) - new Date(x.mesure_le))
        const last = mesures[0]
        const alertes = last ? alertesMesure(last) : []
        return (
          <button
            key={a.id}
            onClick={() => onOpen(a.id)}
            className="text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-pink-300 transition space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800">{a.patient?.nom} {a.patient?.prenom}</div>
                <div className="text-xs text-slate-500">
                  {a.grossesse ? formatSA(joursDeGrossesse(a.grossesse)) : 'Sans suivi de grossesse'}
                  {a.grossesse?.grossesse_a_risque && <span className="ml-2 font-semibold text-amber-700">• À risque</span>}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" /> Admise depuis {formatAttente(a.admission_le)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Mesure label="Dilatation" value={last?.dilatation_cm != null ? `${last.dilatation_cm} cm` : '–'} />
              <Mesure label="BCF" value={last?.bcf ?? '–'} />
              <Mesure label="Dernier relevé" value={last ? formatAttente(last.mesure_le) : 'Aucun'} />
            </div>
            {alertes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {alertes.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <AlertCircle className="w-3 h-3" /> {t}
                  </span>
                ))}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Recents({ onOpen }) {
  const { accouchements, loading, error } = useAccouchements('recents')
  if (loading) return <Chargement />
  if (error) return <Erreur error={error} />
  if (accouchements.length === 0) return <Vide>Aucun accouchement ces 30 derniers jours.</Vide>
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
            <th className="py-3 px-5">Mère</th>
            <th className="py-3 px-5">Date</th>
            <th className="py-3 px-5">Issue</th>
            <th className="py-3 px-5">Nouveau-né(s)</th>
            <th className="py-3 px-5">Alertes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {accouchements.map(a => (
            <tr key={a.id} onClick={() => onOpen(a.id)} className="hover:bg-pink-50/40 cursor-pointer">
              <td className="py-3 px-5 font-medium text-slate-800">{a.patient?.nom} {a.patient?.prenom}</td>
              <td className="py-3 px-5 text-slate-600 whitespace-nowrap">{formatDateTime(a.accouchement_le || a.admission_le)}</td>
              <td className="py-3 px-5">
                {a.statut === 'accouchee' ? <span className="text-slate-700">{labelMode(a.mode)}</span> : <StatutBadge statut={a.statut} />}
              </td>
              <td className="py-3 px-5 text-slate-600">
                {(a.nouveau_nes || []).map(n => `${n.sexe === 'F' ? 'Fille' : 'Garçon'}${n.poids_g ? ` ${(n.poids_g / 1000).toLocaleString('fr-FR')} kg` : ''}${n.vivant ? '' : ' (mort-né)'}`).join(', ') || '–'}
              </td>
              <td className="py-3 px-5 text-xs">
                {hemorragie(a) && <span className="block font-semibold text-red-700">Hémorragie ({a.pertes_sang_ml} ml)</span>}
                {(a.nouveau_nes || []).some(apgarBas) && <span className="block font-semibold text-red-700">Apgar bas à 5 min</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Registre({ onPrint }) {
  const [mois, setMois] = useState(moisCourant)
  const { naissances, loading, error } = useRegistre(mois)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mois</label>
          <input type="month" value={mois} max={moisCourant()} onChange={(e) => e.target.value && setMois(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white" />
        </div>
        <button
          onClick={() => onPrint(mois, naissances)}
          disabled={naissances.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Printer className="w-4 h-4" /> Imprimer le registre
        </button>
      </div>
      {loading ? <Chargement /> : error ? <Erreur error={error} /> : naissances.length === 0 ? (
        <Vide>Aucune naissance enregistrée ce mois-ci.</Vide>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">N°</th>
                <th className="py-3 px-4">Date et heure</th>
                <th className="py-3 px-4">Enfant</th>
                <th className="py-3 px-4">Sexe</th>
                <th className="py-3 px-4 text-right">Poids</th>
                <th className="py-3 px-4">Mère</th>
                <th className="py-3 px-4">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {naissances.map((n, i) => (
                <tr key={n.id}>
                  <td className="py-2.5 px-4 text-slate-500">{i + 1}</td>
                  <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">{formatDateTime(n.accouchement.accouchement_le)}</td>
                  <td className="py-2.5 px-4 text-slate-800">{n.bebe ? `${n.bebe.nom} ${n.bebe.prenom}` : 'Mort-né'}</td>
                  <td className="py-2.5 px-4 text-slate-700">{n.sexe === 'F' ? 'F' : 'M'}</td>
                  <td className="py-2.5 px-4 text-right text-slate-700">{n.poids_g ? `${n.poids_g} g` : '–'}</td>
                  <td className="py-2.5 px-4 text-slate-700">{n.accouchement.patient?.nom} {n.accouchement.patient?.prenom}</td>
                  <td className="py-2.5 px-4 text-slate-600">{labelMode(n.accouchement.mode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const Mesure = ({ label, value }) => (
  <div className="bg-slate-50 rounded-xl py-2">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-sm font-semibold text-slate-800">{value}</div>
  </div>
)
const Chargement = () => (
  <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
)
const Erreur = ({ error }) => (
  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
    {error}{error.includes('accouchements') && ' — le script supabase/naissance.sql doit être exécuté dans Supabase.'}
  </div>
)
const Vide = ({ children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-sm text-slate-500">{children}</div>
)
