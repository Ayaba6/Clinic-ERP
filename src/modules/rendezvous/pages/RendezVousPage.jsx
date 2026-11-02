import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import {
  useRendezVous, usePraticiens, aujourdhuiISO, decalerJour, lundi, heure, typeRdv,
} from '../hooks/useRendezVous'
import RdvCard, { BadgeRdv } from '../components/RdvCard'
import RdvFormModal from '../components/RdvFormModal'
import { titreSoignant } from '../../../lib/roles'
import { formatPersonne } from '../../../lib/format'
import { CalendarDays, CalendarRange, PhoneCall, ChevronLeft, ChevronRight, Plus, Loader2, Clock } from 'lucide-react'

const VUES = [
  { key: 'jour', label: 'Jour', icon: CalendarDays },
  { key: 'semaine', label: 'Semaine', icon: CalendarRange },
  { key: 'appeler', label: 'À appeler (demain)', icon: PhoneCall },
]

const libelleJour = (jour, opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', opts)

export default function RendezVousPage() {
  const { profile } = useAuth()
  const canWrite = ['admin', 'reception', 'medecin', 'sage_femme'].includes(profile?.role)
  const praticiens = usePraticiens()
  const [vue, setVue] = useState('jour')
  const [jour, setJour] = useState(aujourdhuiISO)
  // Les praticiens voient d'abord leur propre agenda
  const [filtre, setFiltre] = useState(['medecin', 'sage_femme'].includes(profile?.role) ? profile.id : '')
  const [form, setForm] = useState(null) // null | {} | { rdv }

  const filtrer = (rdvs) => (filtre ? rdvs.filter(r => r.praticien_id === filtre) : rdvs)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Rendez-vous</h2>
          <p className="text-sm text-slate-500">Agenda des praticiens, appels de confirmation et arrivées en file d'attente.</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setForm({})}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau rendez-vous</span>
          </button>
        )}
      </div>

      {/* Filtres : vue, date, praticien */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl text-sm">
          {VUES.map(v => {
            const Icon = v.icon
            return (
              <button key={v.key} onClick={() => setVue(v.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${vue === v.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                <Icon className="w-4 h-4" /> {v.label}
              </button>
            )
          })}
        </div>
        {vue !== 'appeler' && (
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl">
            <button onClick={() => setJour(decalerJour(jour, vue === 'semaine' ? -7 : -1))} className="p-2 text-slate-500 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
            <input type="date" value={jour} onChange={(e) => e.target.value && setJour(e.target.value)} className="px-2 py-1.5 text-sm outline-none bg-transparent" />
            <button onClick={() => setJour(decalerJour(jour, vue === 'semaine' ? 7 : 1))} className="p-2 text-slate-500 hover:text-slate-800"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        {vue !== 'appeler' && jour !== aujourdhuiISO() && (
          <button onClick={() => setJour(aujourdhuiISO())} className="text-sm font-medium text-blue-600 hover:underline">Aujourd'hui</button>
        )}
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none">
          <option value="">Tous les praticiens</option>
          {praticiens.map(p => <option key={p.id} value={p.id}>{titreSoignant(p.role)}{p.nom} {p.prenom}</option>)}
        </select>
      </div>

      {vue === 'jour' && <VueJour jour={jour} praticiens={praticiens} filtre={filtre} filtrer={filtrer} canWrite={canWrite} onEdit={(rdv) => setForm({ rdv })} />}
      {vue === 'semaine' && <VueSemaine jour={jour} filtrer={filtrer} onPickDay={(d) => { setJour(d); setVue('jour') }} />}
      {vue === 'appeler' && <VueAppeler filtrer={filtrer} canWrite={canWrite} onEdit={(rdv) => setForm({ rdv })} />}

      {form && (
        <RdvFormModal
          rdv={form.rdv}
          defaultDate={jour}
          defaultPraticien={filtre}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  )
}

function VueJour({ jour, praticiens, filtre, filtrer, canWrite, onEdit }) {
  const { rdvs, loading, error } = useRendezVous(jour, jour)
  const liste = filtrer(rdvs)
  const aFixer = liste.filter(r => r.heure_a_confirmer && ['prevu', 'confirme'].includes(r.statut))
  const planifies = liste.filter(r => !aFixer.includes(r))

  // Une colonne par praticien ayant des RDV ce jour (ou le praticien filtré)
  const ids = [...new Set(planifies.map(r => r.praticien_id || ''))]
  if (filtre && !ids.includes(filtre)) ids.push(filtre)
  const colonnes = ids.map(id => ({
    id,
    titre: id ? (() => { const p = praticiens.find(x => x.id === id); return p ? formatPersonne(p, titreSoignant(p.role)) : 'Praticien' })() : 'Non attribué',
    rdvs: planifies.filter(r => (r.praticien_id || '') === id),
  }))

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 capitalize flex items-center gap-2">
        {libelleJour(jour)} • {liste.filter(r => r.statut !== 'annule').length} rendez-vous
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </p>
      {error && <Erreur error={error} />}

      {aFixer.length > 0 && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><Clock className="w-4 h-4" /> Heure à fixer ({aFixer.length})</h3>
          <p className="text-xs text-amber-800">Rendez-vous créés automatiquement après une CPN : appelez la patiente pour fixer l'heure.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {aFixer.map(r => <RdvCard key={r.id} rdv={r} canWrite={canWrite} showPraticien onEdit={onEdit} />)}
          </div>
        </div>
      )}

      {colonnes.length === 0 && aFixer.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-sm text-slate-500">Aucun rendez-vous ce jour-là.</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {colonnes.map(c => (
            <div key={c.id || 'aucun'} className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">{c.titre}</h3>
                <span className="text-xs text-slate-500">{c.rdvs.filter(r => r.statut !== 'annule').length} RDV</span>
              </div>
              <div className="p-3 space-y-2">
                {c.rdvs.length === 0
                  ? <p className="py-6 text-center text-sm text-slate-400">Aucun rendez-vous</p>
                  : c.rdvs.map(r => <RdvCard key={r.id} rdv={r} canWrite={canWrite} onEdit={onEdit} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VueSemaine({ jour, filtrer, onPickDay }) {
  const debut = lundi(jour)
  const fin = decalerJour(debut, 6)
  const { rdvs, loading, error } = useRendezVous(debut, fin)
  const liste = filtrer(rdvs).filter(r => r.statut !== 'annule')
  const jours = Array.from({ length: 7 }, (_, i) => decalerJour(debut, i))

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 flex items-center gap-2">
        Semaine du {libelleJour(debut, { day: 'numeric', month: 'long' })} au {libelleJour(fin, { day: 'numeric', month: 'long', year: 'numeric' })} • {liste.length} rendez-vous
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </p>
      {error && <Erreur error={error} />}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {jours.map(d => {
          const duJour = liste.filter(r => {
            const x = new Date(r.date_heure)
            return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` === d
          })
          return (
            <button key={d} onClick={() => onPickDay(d)} className="text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-3 hover:border-blue-300 transition min-h-32">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold text-slate-800 capitalize">{libelleJour(d, { weekday: 'short', day: 'numeric' })}</span>
                <span className="text-xs text-slate-500">{duJour.length}</span>
              </div>
              <ul className="space-y-1">
                {duJour.slice(0, 6).map(r => (
                  <li key={r.id} className="text-xs text-slate-600 truncate">
                    <span className="font-semibold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.heure_a_confirmer ? '--:--' : heure(r.date_heure)}</span>{' '}
                    {r.patient?.nom} • {typeRdv(r.type).label}
                  </li>
                ))}
                {duJour.length > 6 && <li className="text-xs text-blue-600">+ {duJour.length - 6} autre(s)</li>}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function VueAppeler({ filtrer, canWrite, onEdit }) {
  const demain = decalerJour(aujourdhuiISO(), 1)
  const { rdvs, loading, error } = useRendezVous(demain, demain)
  const liste = filtrer(rdvs).filter(r => ['prevu', 'confirme'].includes(r.statut))
  const aAppeler = liste.filter(r => r.statut === 'prevu')

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 flex items-center gap-2">
        <span className="capitalize">{libelleJour(demain)}</span> • {aAppeler.length} patient(s) à appeler, {liste.length - aAppeler.length} déjà confirmé(s)
        {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </p>
      {error && <Erreur error={error} />}
      {liste.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-sm text-slate-500">Aucun rendez-vous demain.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {liste.map(r => (
            <div key={r.id} className="p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
              <RdvCard rdv={r} canWrite={canWrite} showPraticien onEdit={onEdit} />
              {r.patient?.telephone && (
                <a href={`tel:${r.patient.telephone}`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap">
                  <PhoneCall className="w-4 h-4" /> Appeler
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      {liste.length > 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-1.5">Statut : <BadgeRdv statut="prevu" /> à appeler • <BadgeRdv statut="confirme" /> déjà confirmé</p>
      )}
    </div>
  )
}

const Erreur = ({ error }) => (
  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
    {error}{error.includes('rendez_vous') && ' — le script supabase/rendezvous.sql doit être exécuté dans Supabase.'}
  </div>
)
