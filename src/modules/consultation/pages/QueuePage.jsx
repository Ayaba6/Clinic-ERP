import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useQueue } from '../hooks/useQueue'
import StatutBadge from '../../../components/ui/StatutBadge'
import { getAge, formatAttente, formatDateTime, formatPersonne } from '../../../lib/format'
import { Loader2, Clock, AlertTriangle, Stethoscope, ArrowRight, CheckCircle2, Users } from 'lucide-react'

export default function QueuePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { queue, doneToday, loading, error, takeCharge } = useQueue(profile)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const isAdmin = profile?.role === 'admin'
  const waiting = queue.filter(a => a.statut === 'en_attente')
  const inProgress = queue.filter(a => a.statut === 'en_consultation')

  const handleTakeCharge = async (appointmentId) => {
    setBusyId(appointmentId)
    setActionError(null)
    const result = await takeCharge(appointmentId)
    setBusyId(null)
    if (result.success) {
      navigate(`/consultation/${appointmentId}`)
    } else {
      setActionError(result.error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span>Chargement de la file d'attente...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">File d'attente des consultations</h2>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Tous les patients en attente dans la clinique.' : 'Vos patients et ceux envoyés au premier médecin disponible.'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
            <Users className="w-4 h-4" />
            <span>{waiting.length} en attente</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{doneToday.length} vu(s) aujourd'hui</span>
          </div>
        </div>
      </div>

      {(error || actionError) && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{actionError || error}</div>
      )}

      {/* Consultations en cours */}
      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">En consultation</h3>
          {inProgress.map(a => {
            const isMine = a.doctor_id === profile.id
            return (
              <QueueCard key={a.id} appointment={a} showDoctor={isAdmin}>
                {(isMine || isAdmin) && (
                  <button
                    onClick={() => navigate(`/consultation/${a.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition shadow-sm"
                  >
                    <span>Reprendre</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </QueueCard>
            )
          })}
        </section>
      )}

      {/* Patients en attente */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">En attente</h3>
        {waiting.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-12 text-sm text-slate-500">
            Aucun patient en attente pour le moment. La liste se met à jour automatiquement.
          </div>
        ) : (
          waiting.map((a, index) => (
            <QueueCard key={a.id} appointment={a} position={index + 1} showDoctor>
              <button
                onClick={() => handleTakeCharge(a.id)}
                disabled={busyId === a.id}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition shadow-sm disabled:opacity-50"
              >
                {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
                <span>Prendre en charge</span>
              </button>
            </QueueCard>
          ))
        )}
      </section>

      {/* Vus aujourd'hui */}
      {doneToday.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Terminées aujourd'hui</h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
            {doneToday.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/patients/${a.patient?.id}`)}
                className="w-full flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm text-left hover:bg-slate-50 transition"
              >
                <span className="font-medium text-slate-800">
                  {a.patient?.nom} {a.patient?.prenom}
                  <span className="ml-2 font-mono text-xs text-blue-600">{a.patient?.code_patient}</span>
                </span>
                <span className="text-xs text-slate-500">
                  {formatDateTime(a.created_at)}{isAdmin && a.doctor ? ` • ${formatPersonne(a.doctor, 'Dr ')}` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function QueueCard({ appointment: a, position, showDoctor, children }) {
  const patient = a.patient || {}
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        {position && (
          <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center">
            {position}
          </div>
        )}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">{patient.nom} {patient.prenom}</span>
            <span className="font-mono text-xs text-blue-600">{patient.code_patient}</span>
            <span className="text-xs text-slate-500">{patient.genre} • {getAge(patient.date_naissance) ?? '–'} ans</span>
            <StatutBadge statut={a.statut} />
          </div>
          <p className="text-sm text-slate-600">{a.motif || 'Sans motif'}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Attente : {formatAttente(a.created_at)}</span>
            {showDoctor && (
              <span>{a.doctor ? formatPersonne(a.doctor, 'Dr ') : 'Premier médecin disponible'}</span>
            )}
            {patient.allergies && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Allergies
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}
