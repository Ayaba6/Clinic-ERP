import { useState } from 'react'
import { ShieldAlert, X, Loader2, Send } from 'lucide-react'
import { useDoctors } from '../hooks/usePatientDossier'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white'

export default function SendToConsultationModal({ patient, onSubmit, onClose }) {
  const doctors = useDoctors()
  const [doctorId, setDoctorId] = useState('')
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    const result = await onSubmit({ doctorId, motif })
    setSubmitting(false)

    if (result.success) {
      onClose()
    } else {
      setFormError(result.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">Envoyer en consultation</h3>
        <p className="text-xs text-slate-500 mb-6">
          {patient.nom} {patient.prenom} sera ajouté(e) à la file d'attente du médecin.
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Médecin</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputClass}>
              <option value="">Premier médecin disponible</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr {d.nom} {d.prenom}{d.specialite ? ` — ${d.specialite}` : ''}
                </option>
              ))}
            </select>
            {doctors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Aucun compte avec le rôle « Médecin » pour l'instant.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Motif de la visite</label>
            <textarea
              rows="3"
              required
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className={inputClass}
              placeholder="Ex: Fièvre depuis 3 jours, maux de tête..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Envoyer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
