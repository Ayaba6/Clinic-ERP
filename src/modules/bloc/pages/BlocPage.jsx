import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useInterventions, useBlocReferentiel } from '../hooks/useBloc'
import InterventionFormModal from '../components/InterventionFormModal'
import InterventionModal from '../components/InterventionModal'
import CompteRendu from '../components/CompteRendu'
import StatutBadge from '../../../components/ui/StatutBadge'
import { formatDateTime, formatPersonne } from '../../../lib/format'
import { CalendarDays, Inbox, History, ChevronLeft, ChevronRight, Plus, Loader2, AlertTriangle, Search } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')
const isoJour = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const aujourdhuiISO = () => isoJour(new Date())
const decaler = (jour, n) => {
  const d = new Date(`${jour}T12:00:00`)
  d.setDate(d.getDate() + n)
  return isoJour(d)
}
const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const heureFin = (i) => heure(new Date(new Date(i.date_programmee).getTime() + i.duree_prevue_min * 60000).toISOString())

const TABS = [
  { key: 'planning', label: 'Planning', icon: CalendarDays },
  { key: 'demandes', label: 'Demandes', icon: Inbox },
  { key: 'historique', label: 'Historique', icon: History },
]

export default function BlocPage() {
  const { profile } = useAuth()
  const canManage = ['admin', 'chirurgien'].includes(profile?.role)
  const [tab, setTab] = useState('planning')
  const [jour, setJour] = useState(() => isoJour(new Date()))
  const [selected, setSelected] = useState(null)
  // Formulaire ouvert : { intervention } (modification / programmation d'une demande) ou {} (nouvelle)
  const [form, setForm] = useState(null)
  const [toPrint, setToPrint] = useState(null)

  // Compteur de demandes en attente, visible depuis tous les onglets
  const { interventions: demandes } = useInterventions('demandes')

  const print = (intervention) => {
    setToPrint(intervention)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Bloc opératoire</h2>
            <p className="text-sm text-slate-500">Planning des salles, demandes des médecins et comptes rendus.</p>
          </div>
          {canManage && (
            <button
              onClick={() => setForm({})}
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Programmer une intervention</span>
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
                  tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.key === 'demandes' && demandes.length > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-semibold">{demandes.length}</span>
                )}
              </button>
            )
          })}
        </div>

        {tab === 'planning' && <Planning jour={jour} setJour={setJour} onOpen={setSelected} />}
        {tab === 'demandes' && <Demandes demandes={demandes} onOpen={setSelected} />}
        {tab === 'historique' && <Historique onOpen={setSelected} />}

        {selected && (
          <InterventionModal
            intervention={selected}
            canManage={canManage}
            onEdit={(i) => { setSelected(null); setForm({ intervention: i }) }}
            onPrint={print}
            onClose={() => setSelected(null)}
          />
        )}

        {form && (
          <InterventionFormModal
            mode="programmer"
            intervention={form.intervention}
            defaultDate={jour}
            profile={profile}
            onClose={() => setForm(null)}
          />
        )}
      </div>

      {/* Zone d'impression */}
      <div className="hidden print:block">
        {toPrint && <CompteRendu intervention={toPrint} />}
      </div>
    </>
  )
}

function Planning({ jour, setJour, onOpen }) {
  const { interventions, loading, error } = useInterventions('jour', jour)
  const { salles } = useBlocReferentiel()

  // Une colonne par salle active (+ les salles désactivées qui ont encore une intervention ce jour)
  const nomsSalles = [...new Set([...salles.map(s => s.nom), ...interventions.map(i => i.salle_operation)])]
  const dateLisible = new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const estAujourdhui = jour === aujourdhuiISO()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl">
          <button onClick={() => setJour(decaler(jour, -1))} className="p-2 text-slate-500 hover:text-slate-800" title="Jour précédent"><ChevronLeft className="w-4 h-4" /></button>
          <input type="date" value={jour} onChange={(e) => e.target.value && setJour(e.target.value)} className="px-2 py-1.5 text-sm outline-none bg-transparent" />
          <button onClick={() => setJour(decaler(jour, 1))} className="p-2 text-slate-500 hover:text-slate-800" title="Jour suivant"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {!estAujourdhui && (
          <button onClick={() => setJour(isoJour(new Date()))} className="px-3 py-1.5 text-sm font-medium text-brand-600 hover:underline">Aujourd'hui</button>
        )}
        <span className="text-sm text-slate-600 capitalize">{dateLisible}</span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))` }}>
        {nomsSalles.map(nom => {
          const liste = interventions.filter(i => i.salle_operation === nom)
          return (
            <div key={nom} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{nom}</h3>
                <span className="text-xs text-slate-500">{liste.length} intervention(s)</span>
              </div>
              <div className="p-3 space-y-2">
                {liste.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Salle libre</p>
                ) : liste.map(i => (
                  <button
                    key={i.id}
                    onClick={() => onOpen(i)}
                    className={`w-full text-left p-3 rounded-xl border transition hover:border-brand-300 hover:bg-brand-50/30 ${
                      i.statut === 'en_cours' ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {heure(i.date_programmee)} – {heureFin(i)}
                      </span>
                      <StatutBadge statut={i.statut} />
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">{i.libelle_intervention}</div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
                      <span>{i.patient?.nom} {i.patient?.prenom}</span>
                      <span>• {formatPersonne(i.chirurgien, 'Dr ')}</span>
                      {i.patient?.allergies && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium"><AlertTriangle className="w-3 h-3" /> Allergies</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Demandes({ demandes, onOpen }) {
  if (demandes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-sm text-slate-500">
        Aucune demande en attente. Les médecins peuvent en faire depuis le dossier d'un patient.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {demandes.map(i => (
        <button
          key={i.id}
          onClick={() => onOpen(i)}
          className="w-full text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <div className="font-semibold text-slate-800">{i.libelle_intervention}</div>
            <div className="text-sm text-slate-600">
              {i.patient?.nom} {i.patient?.prenom} <span className="font-mono text-xs text-brand-600">{i.patient?.code_patient}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Demandé le {formatDateTime(i.created_at)} par {formatPersonne(i.demandeur, 'Dr ')}
              {i.chirurgien && <> • Chirurgien souhaité : {formatPersonne(i.chirurgien, 'Dr ')}</>}
            </div>
            {i.notes_preop && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{i.notes_preop}</p>}
          </div>
          <span className="text-sm font-medium text-brand-600 whitespace-nowrap">Ouvrir →</span>
        </button>
      ))}
    </div>
  )
}

function Historique({ onOpen }) {
  const { interventions, loading, error } = useInterventions('historique')
  const [searchTerm, setSearchTerm] = useState('')
  const term = searchTerm.trim().toLowerCase()
  const filtered = interventions.filter(i =>
    [i.libelle_intervention, i.patient?.nom, i.patient?.prenom, i.patient?.code_patient, i.chirurgien?.nom]
      .some(v => (v || '').toLowerCase().includes(term))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 sm:w-80">
        <Search className="w-4 h-4 text-slate-400" />
        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Intervention, patient, chirurgien..." className="w-full bg-transparent outline-none text-sm" />
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500">Aucune intervention terminée ou annulée ces 90 derniers jours.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-5">Intervention</th>
                  <th className="py-3 px-5">Patient</th>
                  <th className="py-3 px-5">Chirurgien</th>
                  <th className="py-3 px-5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map(i => (
                  <tr key={i.id} onClick={() => onOpen(i)} className="hover:bg-brand-50/40 cursor-pointer">
                    <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(i.date_programmee || i.created_at)}</td>
                    <td className="py-3 px-5 font-medium text-slate-800">{i.libelle_intervention}</td>
                    <td className="py-3 px-5 text-slate-700">{i.patient?.nom} {i.patient?.prenom}</td>
                    <td className="py-3 px-5 text-slate-600">{formatPersonne(i.chirurgien, 'Dr ')}</td>
                    <td className="py-3 px-5"><StatutBadge statut={i.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
