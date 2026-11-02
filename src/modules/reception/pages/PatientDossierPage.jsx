import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { usePatientDossier, SECTIONS_BY_ROLE } from '../hooks/usePatientDossier'
import PatientFormModal from '../components/PatientFormModal'
import SendToConsultationModal from '../components/SendToConsultationModal'
import InterventionFormModal from '../../bloc/components/InterventionFormModal'
import StatutBadge from '../../../components/ui/StatutBadge'
import { getAge, formatDate, formatDateTime, formatMontant, formatPersonne } from '../../../lib/format'
import {
  ArrowLeft, Loader2, Pencil, Send, Phone, Heart, Calendar, AlertTriangle,
  ClipboardList, Stethoscope, Activity, CreditCard, Pill, X,
} from 'lucide-react'

const TABS = {
  appointments: { label: 'Passages', icon: ClipboardList },
  consultations: { label: 'Consultations', icon: Stethoscope },
  interventions: { label: 'Bloc opératoire', icon: Activity },
  factures: { label: 'Factures', icon: CreditCard },
}

const Empty = ({ children }) => (
  <div className="text-center py-12 text-sm text-slate-500">{children}</div>
)

export default function PatientDossierPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const role = profile?.role
  const { patient, history, loading, error, fetchDossier, updatePatient, sendToConsultation, cancelAppointment } = usePatientDossier(id, role)

  const sections = SECTIONS_BY_ROLE[role] || []
  const [activeTab, setActiveTab] = useState(sections[0])
  const [editOpen, setEditOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [blocOpen, setBlocOpen] = useState(false)
  const [actionError, setActionError] = useState(null)

  const canEdit = ['admin', 'reception', 'medecin'].includes(role)
  const canSend = ['admin', 'reception'].includes(role)
  // Le médecin demande une intervention ; le chirurgien et l'admin la programment directement
  const blocMode = role === 'medecin' ? 'demande' : ['admin', 'chirurgien'].includes(role) ? 'programmer' : null
  const backPath = ['admin', 'reception', 'infirmier'].includes(role) ? '/reception' : -1

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Chargement du dossier...</span>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-slate-700 font-semibold">Dossier introuvable ou accès refusé.</p>
        {error && <p className="text-sm text-slate-500">{error}</p>}
        <Link to="/reception" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </Link>
      </div>
    )
  }

  // Passage en cours : on n'en crée pas un second
  const activeAppointment = history.appointments.find(a => ['en_attente', 'en_consultation'].includes(a.statut))

  const handleCancel = async (appointmentId) => {
    setActionError(null)
    const result = await cancelAppointment(appointmentId)
    if (!result.success) setActionError(result.error)
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(backPath)}
            className="mt-1 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{patient.nom} {patient.prenom}</h2>
              <span className="font-mono text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                {patient.code_patient}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {patient.genre === 'F' ? 'Femme' : 'Homme'} • {getAge(patient.date_naissance) ?? '–'} ans • Dossier créé le {formatDate(patient.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Pencil className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
          {blocMode && (
            <button
              onClick={() => setBlocOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Activity className="w-4 h-4" />
              <span>{blocMode === 'demande' ? 'Demander une intervention' : 'Programmer au bloc'}</span>
            </button>
          )}
          {canSend && (
            <button
              onClick={() => setSendOpen(true)}
              disabled={!!activeAppointment}
              title={activeAppointment ? 'Ce patient est déjà en file d\'attente' : undefined}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer en consultation</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{actionError}</div>
      )}

      {/* Passage en cours */}
      {activeAppointment && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="text-sm text-blue-900">
            <span className="font-semibold">Passage en cours</span> — <StatutBadge statut={activeAppointment.statut} />{' '}
            {activeAppointment.doctor ? formatPersonne(activeAppointment.doctor, 'Dr ') : 'Premier médecin disponible'}
            {activeAppointment.motif && <span className="text-blue-700"> • {activeAppointment.motif}</span>}
          </div>
          {canSend && activeAppointment.statut === 'en_attente' && (
            <button
              onClick={() => handleCancel(activeAppointment.id)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-red-600 transition"
            >
              <X className="w-4 h-4" /> Annuler le passage
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : identité */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Informations</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500"><Calendar className="w-4 h-4" /> Naissance</dt>
                <dd className="font-medium text-slate-800">{formatDate(patient.date_naissance)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500"><Phone className="w-4 h-4" /> Téléphone</dt>
                <dd className="font-medium text-slate-800">{patient.telephone || 'N/C'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-slate-500"><Heart className="w-4 h-4" /> Groupe sanguin</dt>
                <dd>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    {patient.groupe_sanguin || 'N/C'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className={`p-6 rounded-2xl border shadow-sm space-y-2 ${patient.allergies ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <h3 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${patient.allergies ? 'text-amber-700' : 'text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" /> Allergies & antécédents
            </h3>
            <p className={`text-sm whitespace-pre-line ${patient.allergies ? 'text-amber-900 font-medium' : 'text-slate-400 italic'}`}>
              {patient.allergies || 'Aucune allergie ni antécédent signalé.'}
            </p>
          </div>
        </div>

        {/* Colonne droite : historique */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {sections.length === 0 ? (
            <Empty>Votre rôle ne donne pas accès à l'historique médical de ce patient.</Empty>
          ) : (
            <>
              <div className="flex overflow-x-auto border-b border-slate-200">
                {sections.map(key => {
                  const Icon = TABS[key].icon
                  const isActive = activeTab === key
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                        isActive ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{TABS[key].label}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{history[key].length}</span>
                    </button>
                  )
                })}
              </div>

              <div className="p-6">
                {activeTab === 'appointments' && <AppointmentsList items={history.appointments} />}
                {activeTab === 'consultations' && <ConsultationsList items={history.consultations} />}
                {activeTab === 'interventions' && <InterventionsList items={history.interventions} />}
                {activeTab === 'factures' && <FacturesList items={history.factures} />}
              </div>
            </>
          )}
        </div>
      </div>

      {editOpen && (
        <PatientFormModal
          title="Modifier le patient"
          subtitle={`Dossier ${patient.code_patient}`}
          initialValues={patient}
          submitLabel="Enregistrer les modifications"
          onSubmit={updatePatient}
          onClose={() => setEditOpen(false)}
        />
      )}

      {blocOpen && (
        <InterventionFormModal
          mode={blocMode}
          patient={patient}
          profile={profile}
          onSaved={fetchDossier}
          onClose={() => setBlocOpen(false)}
        />
      )}

      {sendOpen && (
        <SendToConsultationModal
          patient={patient}
          onSubmit={sendToConsultation}
          onClose={() => setSendOpen(false)}
        />
      )}
    </div>
  )
}

function AppointmentsList({ items }) {
  if (items.length === 0) return <Empty>Aucun passage enregistré.</Empty>
  return (
    <ul className="divide-y divide-slate-100">
      {items.map(a => (
        <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
          <div>
            <div className="font-medium text-slate-800">{a.motif || 'Sans motif'}</div>
            <div className="text-xs text-slate-500">
              {formatDateTime(a.created_at)} • {a.doctor ? formatPersonne(a.doctor, 'Dr ') : 'Premier médecin disponible'}
            </div>
          </div>
          <StatutBadge statut={a.statut} />
        </li>
      ))}
    </ul>
  )
}

function ConsultationsList({ items }) {
  if (items.length === 0) return <Empty>Aucune consultation pour ce patient.</Empty>
  return (
    <div className="space-y-4">
      {items.map(c => (
        <div key={c.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-800">{formatDateTime(c.created_at)}</div>
            <div className="text-xs text-slate-500">{formatPersonne(c.doctor, 'Dr ')}</div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {c.tension && <span className="px-2 py-1 bg-slate-100 rounded-lg">Tension : <b>{c.tension}</b></span>}
            {c.temperature != null && <span className="px-2 py-1 bg-slate-100 rounded-lg">Temp. : <b>{c.temperature} °C</b></span>}
            {c.poids != null && <span className="px-2 py-1 bg-slate-100 rounded-lg">Poids : <b>{c.poids} kg</b></span>}
          </div>

          {c.symptomes && (
            <p className="text-sm text-slate-700"><span className="font-semibold">Symptômes : </span>{c.symptomes}</p>
          )}
          {c.diagnostic && (
            <p className="text-sm text-slate-700"><span className="font-semibold">Diagnostic : </span>{c.diagnostic}</p>
          )}

          {c.prescriptions?.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase mb-2">
                <Pill className="w-3.5 h-3.5" /> Ordonnance
              </div>
              <ul className="space-y-1.5">
                {c.prescriptions.map(p => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">
                      <b>{p.medicament?.nom}</b> {p.medicament?.dosage} × {p.quantite} — {p.posologie}
                    </span>
                    <StatutBadge statut={p.statut} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function InterventionsList({ items }) {
  if (items.length === 0) return <Empty>Aucune intervention au bloc.</Empty>
  return (
    <ul className="divide-y divide-slate-100">
      {items.map(i => (
        <li key={i.id} className="py-3 space-y-1 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-800">{i.libelle_intervention}</span>
            <StatutBadge statut={i.statut} />
          </div>
          <div className="text-xs text-slate-500">
            {formatDateTime(i.date_programmee)} • {i.salle_operation} • {formatPersonne(i.chirurgien, 'Dr ')}
          </div>
          {i.rapport_operatoire && <p className="text-slate-600 text-xs whitespace-pre-line">{i.rapport_operatoire}</p>}
        </li>
      ))}
    </ul>
  )
}

function FacturesList({ items }) {
  if (items.length === 0) return <Empty>Aucune facture pour ce patient.</Empty>
  return (
    <ul className="divide-y divide-slate-100">
      {items.map(f => (
        <li key={f.id} className="py-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-slate-800">{formatMontant(f.montant_total)}</span>
              <span className="text-xs text-slate-500"> • {formatDate(f.created_at)}{f.mode_paiement ? ` • ${f.mode_paiement}` : ''}</span>
            </div>
            <StatutBadge statut={f.statut} />
          </div>
          {f.lignes_facture?.length > 0 && (
            <ul className="text-xs text-slate-500 space-y-0.5 pl-3 border-l-2 border-slate-100">
              {f.lignes_facture.map(l => (
                <li key={l.id}>{l.description} × {l.quantite} — {formatMontant(l.montant_total)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
