import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useConsultation } from '../hooks/useConsultation'
import StatutBadge from '../../../components/ui/StatutBadge'
import { getAge, formatDateTime, formatMontant, formatPersonne } from '../../../lib/format'
import EnTeteDocument, { PiedDocument } from '../../../components/ui/EnTeteDocument'
import { titreSoignant } from '../../../lib/roles'
import { useGrossesseEnCours, joursDeGrossesse, formatSA } from '../../maternite/hooks/useMaternite'
import { useTypesConsultation, typeParDefaut } from '../hooks/useTypesConsultation'
import {
  ArrowLeft, Loader2, AlertTriangle, FolderOpen, Undo2, Pill, Plus, Trash2,
  CheckCircle2, Printer, ShieldAlert, History,
} from 'lucide-react'

const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white'
const labelClass = 'block text-xs font-semibold text-slate-600 uppercase mb-1'

const EMPTY_LINE = { medicament_id: '', quantite: 1, posologie: '' }

export default function ConsultationPage() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { appointment, previous, medicaments, loading, error, terminer, remettreEnAttente } = useConsultation(appointmentId)
  const grossesse = useGrossesseEnCours(appointment?.patient_id, appointment?.patient?.genre === 'F')

  const [values, setValues] = useState({ poids: '', temperature: '', tension: '', symptomes: '', diagnostic: '', tarif_id: '' })
  const typesConsultation = useTypesConsultation()
  // Type choisi, sinon celui du passage (réception), sinon celui du rôle
  const typeConsultation = values.tarif_id || appointment?.tarif_id || typeParDefaut(typesConsultation, profile?.role)
  const tarifConsultation = typesConsultation.find(t => t.id === typeConsultation)
  const [lines, setLines] = useState([])
  const [draft, setDraft] = useState(EMPTY_LINE)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [saved, setSaved] = useState(false)

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const medById = (id) => medicaments.find(m => m.id === id)

  const addLine = () => {
    if (!draft.medicament_id || !draft.posologie.trim() || Number(draft.quantite) < 1) {
      setFormError('Pour ajouter un médicament : choisissez-le, indiquez une quantité et la posologie.')
      return
    }
    setFormError(null)
    setLines([...lines, { ...draft, quantite: Number(draft.quantite), posologie: draft.posologie.trim() }])
    setDraft(EMPTY_LINE)
  }

  const removeLine = (index) => setLines(lines.filter((_, i) => i !== index))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const result = await terminer({ ...values, tarif_id: typeConsultation }, lines)
    setSubmitting(false)
    if (result.success) {
      setSaved(true)
    } else {
      setFormError(result.error)
    }
  }

  const handleRelease = async () => {
    const result = await remettreEnAttente()
    if (result.success) {
      navigate('/consultation')
    } else {
      setFormError(result.error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        <span>Ouverture de la consultation...</span>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <p className="text-slate-700 font-semibold">Consultation introuvable ou accès refusé.</p>
        {error && <p className="text-sm text-slate-500">{error}</p>}
        <Link to="/consultation" className="inline-flex items-center gap-2 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour à la file d'attente
        </Link>
      </div>
    )
  }

  const patient = appointment.patient

  // Consultation enregistrée : récapitulatif + ordonnance imprimable
  if (saved) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-semibold">Consultation enregistrée pour {patient.nom} {patient.prenom}.</span>
          </div>
          <div className="flex gap-3">
            {lines.length > 0 && (
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Printer className="w-4 h-4" /> Imprimer l'ordonnance
              </button>
            )}
            <button
              onClick={() => navigate('/consultation')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition"
            >
              Patient suivant
            </button>
          </div>
        </div>

        {lines.length > 0 && (
          <Ordonnance patient={patient} doctor={profile} lines={lines} medById={medById} />
        )}
      </div>
    )
  }

  const isClosed = ['termine', 'annule'].includes(appointment.statut)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/consultation')}
            className="mt-1 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 transition"
            title="Retour à la file d'attente"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{patient.nom} {patient.prenom}</h2>
              <span className="font-mono text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-lg">
                {patient.code_patient}
              </span>
              <StatutBadge statut={appointment.statut} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {patient.genre === 'F' ? 'Femme' : 'Homme'} • {getAge(patient.date_naissance) ?? '–'} ans • Groupe {patient.groupe_sanguin || 'N/C'}
              {appointment.motif && <> • Motif : <span className="text-slate-700">{appointment.motif}</span></>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/patients/${patient.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <FolderOpen className="w-4 h-4" /> Dossier complet
          </Link>
          {appointment.statut === 'en_consultation' && (
            <button
              onClick={handleRelease}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Undo2 className="w-4 h-4" /> Remettre en attente
            </button>
          )}
        </div>
      </div>

      {/* Grossesse en cours : la visite peut être enregistrée comme CPN */}
      {grossesse && !['termine', 'annule'].includes(appointment.statut) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-pink-50 border border-pink-200 rounded-2xl">
          <div className="text-sm text-pink-900">
            <span className="font-bold">Grossesse en cours — {formatSA(joursDeGrossesse(grossesse))}.</span>{' '}
            S'il s'agit d'une consultation prénatale, enregistrez-la comme CPN.
          </div>
          <Link
            to={`/maternite/grossesses/${grossesse.id}?passage=${appointment.id}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold whitespace-nowrap"
          >
            Faire la CPN
          </Link>
        </div>
      )}

      {/* Allergies : toujours visibles avant de prescrire */}
      {patient.allergies && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
          <div className="text-sm">
            <span className="font-bold">Allergies / antécédents : </span>
            <span className="whitespace-pre-line">{patient.allergies}</span>
          </div>
        </div>
      )}

      {isClosed ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-12 text-sm text-slate-500">
          Ce passage est déjà clôturé. Consultez le dossier complet pour voir la consultation.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Formulaire de consultation */}
          <form onSubmit={handleSubmit} className="xl:col-span-2 space-y-6">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Constantes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Poids (kg)</label>
                  <input type="number" step="0.1" min="0" name="poids" value={values.poids} onChange={handleChange} className={inputClass} placeholder="Ex: 68" />
                </div>
                <div>
                  <label className={labelClass}>Température (°C)</label>
                  <input type="number" step="0.1" min="30" max="45" name="temperature" value={values.temperature} onChange={handleChange} className={inputClass} placeholder="Ex: 37.5" />
                </div>
                <div>
                  <label className={labelClass}>Tension</label>
                  <input type="text" name="tension" value={values.tension} onChange={handleChange} className={inputClass} placeholder="Ex: 12/8" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Type de consultation</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select name="tarif_id" value={typeConsultation} onChange={handleChange} className={`${inputClass} sm:max-w-sm`}>
                  {typesConsultation.map(t => <option key={t.id} value={t.id}>{t.libelle}</option>)}
                </select>
                {tarifConsultation && (
                  <span className={`text-sm ${Number(tarifConsultation.prix) > 0 ? 'text-slate-600' : 'text-amber-700 font-medium'}`}>
                    {Number(tarifConsultation.prix) > 0 ? `Facturé ${formatMontant(tarifConsultation.prix)}` : 'Prix à compléter dans Caisse > Tarifs'}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Examen</h3>
              <div>
                <label className={labelClass}>Symptômes / examen clinique</label>
                <textarea rows="3" name="symptomes" value={values.symptomes} onChange={handleChange} className={inputClass} placeholder="Ex: Fièvre depuis 3 jours, céphalées, pas de toux..." />
              </div>
              <div>
                <label className={labelClass}>Diagnostic</label>
                <textarea rows="2" name="diagnostic" required value={values.diagnostic} onChange={handleChange} className={inputClass} placeholder="Ex: Paludisme simple" />
              </div>
            </div>

            {/* Ordonnance */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                <Pill className="w-4 h-4" /> Ordonnance
              </h3>

              {lines.length > 0 && (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {lines.map((l, i) => {
                    const med = medById(l.medicament_id)
                    const lowStock = med && l.quantite > med.stock_actuel
                    return (
                      <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-semibold text-slate-800">{med?.nom} {med?.dosage}</span>
                          <span className="text-slate-500"> × {l.quantite} — {l.posologie}</span>
                          {lowStock && (
                            <span className="ml-2 text-xs text-amber-700 font-medium">Stock insuffisant ({med.stock_actuel})</span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeLine(i)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Retirer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {medicaments.length === 0 ? (
                <p className="text-sm text-slate-500 italic">
                  Aucun médicament dans le catalogue. Le pharmacien doit d'abord les enregistrer.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className={labelClass}>Médicament</label>
                    <select
                      value={draft.medicament_id}
                      onChange={(e) => setDraft({ ...draft, medicament_id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Choisir...</option>
                      {medicaments.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nom} {m.dosage || ''} {m.forme ? `(${m.forme})` : ''} — stock {m.stock_actuel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Qté</label>
                    <input
                      type="number"
                      min="1"
                      value={draft.quantite}
                      onChange={(e) => setDraft({ ...draft, quantite: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className={labelClass}>Posologie</label>
                    <input
                      type="text"
                      value={draft.posologie}
                      onChange={(e) => setDraft({ ...draft, posologie: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine() } }}
                      className={inputClass}
                      placeholder="Ex: 1 cp matin et soir, 5 jours"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={addLine}
                      className="w-full inline-flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
                      title="Ajouter à l'ordonnance"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Terminer la consultation</span>
              </button>
            </div>
          </form>

          {/* Consultations précédentes */}
          <aside className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
              <History className="w-4 h-4" /> Consultations précédentes
            </h3>
            {previous.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Première consultation pour ce patient.</p>
            ) : (
              <ul className="space-y-4">
                {previous.map(c => (
                  <li key={c.id} className="text-sm space-y-1 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="text-xs text-slate-500">{formatDateTime(c.created_at)} • {formatPersonne(c.doctor, 'Dr ')}</div>
                    <div className="font-medium text-slate-800">{c.diagnostic || 'Sans diagnostic'}</div>
                    {c.prescriptions?.length > 0 && (
                      <div className="text-xs text-slate-500">
                        {c.prescriptions.map(p => `${p.medicament?.nom} ${p.medicament?.dosage || ''}`.trim()).join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

// Ordonnance au format imprimable
function Ordonnance({ patient, doctor, lines, medById }) {
  return (
    <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-0 print:p-0 space-y-8">
      <EnTeteDocument>
        <div className="text-sm font-semibold text-slate-900">{formatPersonne(doctor, titreSoignant(doctor?.role))}</div>
        {doctor?.specialite && <div>{doctor.specialite}</div>}
      </EnTeteDocument>

      <div className="text-sm text-slate-700">
        <span className="font-semibold">Patient : </span>
        {patient.nom} {patient.prenom} — {getAge(patient.date_naissance) ?? '–'} ans ({patient.code_patient})
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-wide">ORDONNANCE</h3>
        <ol className="space-y-4 list-decimal list-inside">
          {lines.map((l, i) => {
            const med = medById(l.medicament_id)
            return (
              <li key={i} className="text-slate-800">
                <span className="font-semibold">{med?.nom} {med?.dosage} {med?.forme ? `(${med.forme})` : ''}</span>
                <span className="text-slate-600"> — Qté : {l.quantite}</span>
                <div className="ml-5 text-sm text-slate-600">{l.posologie}</div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="pt-16 text-right text-sm text-slate-500">Signature et cachet</div>
      <PiedDocument />
    </div>
  )
}
