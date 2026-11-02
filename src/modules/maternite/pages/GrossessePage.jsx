import { Fragment, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  useGrossesse, alertesGrossesse, joursDeGrossesse, joursAvant, formatSA, trimestre,
  tensionElevee, labelPresentation, cloturerGrossesse,
} from '../hooks/useMaternite'
import GrossesseFormModal from '../components/GrossesseFormModal'
import CpnFormModal from '../components/CpnFormModal'
import Alertes from '../components/Alertes'
import AdmissionModal from '../../naissance/components/AdmissionModal'
import { useAdmissionEnCours } from '../../naissance/hooks/useNaissance'
import StatutBadge from '../../../components/ui/StatutBadge'
import { titreSoignant } from '../../../lib/roles'
import { getAge, formatDate, formatPersonne } from '../../../lib/format'
import { ArrowLeft, Loader2, Plus, Pencil, FolderOpen, Archive, ChevronDown, ShieldAlert, BedDouble } from 'lucide-react'

export default function GrossessePage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canWrite = ['admin', 'medecin', 'sage_femme'].includes(profile?.role)
  const { grossesse: g, loading, error, fetchGrossesse } = useGrossesse(id)
  const admission = useAdmissionEnCours(g?.statut === 'en_cours' ? g.patient_id : null)
  const [admissionOpen, setAdmissionOpen] = useState(false)

  // ?passage=<id> : la patiente vient de la file d'attente, la CPN s'ouvre directement
  const passage = searchParams.get('passage')
  const [cpnOpen, setCpnOpen] = useState(!!passage)
  const [editOpen, setEditOpen] = useState(false)
  const [cloture, setCloture] = useState(null) // { statut, issue }
  const [ouverte, setOuverte] = useState(null) // CPN dépliée
  const [actionError, setActionError] = useState(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
        <span>Chargement du suivi...</span>
      </div>
    )
  }
  if (error || !g) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-3">
        <p className="font-semibold text-slate-700">Suivi de grossesse introuvable ou accès refusé.</p>
        {error && <p className="text-sm text-slate-500">{error}</p>}
        <Link to="/maternite" className="text-sm text-pink-600 hover:underline">Retour à la maternité</Link>
      </div>
    )
  }

  const p = g.patient
  const enCours = g.statut === 'en_cours'
  const jours = enCours ? joursDeGrossesse(g) : null
  const avantTerme = joursAvant(g.date_terme_prevue)
  const alertes = alertesGrossesse(g)

  const fermerCpn = () => {
    setCpnOpen(false)
    if (passage) setSearchParams({}, { replace: true })
  }

  const confirmerCloture = async () => {
    setActionError(null)
    const result = await cloturerGrossesse(g.id, cloture.statut, cloture.issue)
    if (result.success) {
      setCloture(null)
      fetchGrossesse()
    } else {
      setActionError(result.error)
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/maternite')} className="mt-1 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800" title="Retour">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{p.nom} {p.prenom}</h2>
              <span className="font-mono text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">{p.code_patient}</span>
              <StatutBadge statut={g.statut} />
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {getAge(p.date_naissance) ?? '–'} ans • Groupe {p.groupe_sanguin || 'N/C'}
              {g.gestite != null && <> • G{g.gestite}P{g.parite ?? 0}{g.avortements ? `A${g.avortements}` : ''}{g.enfants_vivants != null ? ` (${g.enfants_vivants} enfant(s) vivant(s))` : ''}</>}
              {g.suivi && <> • Suivie par {formatPersonne(g.suivi, titreSoignant(g.suivi.role))}</>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/patients/${p.id}`} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FolderOpen className="w-4 h-4" /> Dossier
          </Link>
          {canWrite && enCours && (
            <>
              <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Pencil className="w-4 h-4" /> Modifier
              </button>
              <button onClick={() => setCloture({ statut: 'accouchee', issue: '' })} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Archive className="w-4 h-4" /> Clôturer
              </button>
              {admission ? (
                <Link to={`/naissance/${admission.id}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-50 border border-pink-200 rounded-xl text-sm font-semibold text-pink-700 hover:bg-pink-100">
                  <BedDouble className="w-4 h-4" /> En salle de naissance
                </Link>
              ) : (
                <button onClick={() => setAdmissionOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-pink-300 bg-white rounded-xl text-sm font-medium text-pink-700 hover:bg-pink-50">
                  <BedDouble className="w-4 h-4" /> Admettre en salle de naissance
                </button>
              )}
              <button onClick={() => setCpnOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold shadow-sm">
                <Plus className="w-4 h-4" /> Nouvelle CPN
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> {actionError}
        </div>
      )}

      {cloture && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Issue</label>
            <select value={cloture.statut} onChange={(e) => setCloture({ ...cloture, statut: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white">
              <option value="accouchee">Accouchement</option>
              <option value="interrompue">Grossesse interrompue</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Précisions</label>
            <input value={cloture.issue} onChange={(e) => setCloture({ ...cloture, issue: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
              placeholder={cloture.statut === 'accouchee' ? 'Ex: Voie basse, garçon 3,2 kg' : 'Ex: Fausse couche à 10 SA'} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCloture(null)} className="px-3 py-2 text-sm text-slate-500">Annuler</button>
            <button onClick={confirmerCloture} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium">Clôturer le suivi</button>
          </div>
        </div>
      )}

      {alertes.length > 0 && <Alertes alertes={alertes} />}

      {/* Repères */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Repere label="Âge gestationnel" value={enCours ? formatSA(jours) : '–'} sub={enCours ? trimestre(jours) : null} accent />
        <Repere label="Terme prévu" value={formatDate(g.date_terme_prevue)}
          sub={enCours ? (avantTerme >= 0 ? `dans ${avantTerme} j` : `dépassé de ${-avantTerme} j`) : null} />
        <Repere label="Dernières règles" value={g.ddr ? formatDate(g.ddr) : 'Non connue'} />
        <Repere label="CPN réalisées" value={g.cpn.length} sub={g.cpn.length < 8 && enCours ? 'objectif : 8 contacts' : null} />
      </div>

      {(g.antecedents || g.grossesse_a_risque || g.issue) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {g.antecedents && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Antécédents</h3>
              <p className="text-sm text-slate-700 whitespace-pre-line">{g.antecedents}</p>
            </div>
          )}
          {g.grossesse_a_risque && (
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
              <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Grossesse à risque</h3>
              <p className="text-sm text-amber-900 whitespace-pre-line">{g.facteurs_risque || 'Facteurs non précisés'}</p>
            </div>
          )}
          {g.issue && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Issue ({formatDate(g.date_cloture)})</h3>
              <p className="text-sm text-slate-700">{g.issue}</p>
            </div>
          )}
        </div>
      )}

      {/* Consultations prénatales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Consultations prénatales</h3>
        </div>
        {g.cpn.length === 0 ? (
          <p className="text-center py-12 text-sm text-slate-500">Aucune CPN enregistrée pour cette grossesse.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-4">CPN</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Terme</th>
                  <th className="py-3 px-4 text-right">Poids</th>
                  <th className="py-3 px-4 text-right">TA</th>
                  <th className="py-3 px-4 text-right">HU</th>
                  <th className="py-3 px-4 text-right">BCF</th>
                  <th className="py-3 px-4">Présentation</th>
                  <th className="py-3 px-4">Prochaine</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {g.cpn.map(c => {
                  const open = ouverte === c.id
                  return (
                    <Fragment key={c.id}>
                      <tr onClick={() => setOuverte(open ? null : c.id)} className="hover:bg-pink-50/40 cursor-pointer" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <td className="py-3 px-4 font-semibold text-slate-800">CPN{c.numero}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(c.date_cpn)}</td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{formatSA(c.age_gestationnel_jours)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{c.poids != null ? `${c.poids} kg` : '–'}</td>
                        <td className={`py-3 px-4 text-right whitespace-nowrap ${tensionElevee(c) ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                          {c.tension_sys ? `${c.tension_sys}/${c.tension_dia ?? '–'}` : '–'}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">{c.hauteur_uterine != null ? `${c.hauteur_uterine} cm` : '–'}</td>
                        <td className={`py-3 px-4 text-right ${c.bcf != null && (c.bcf < 110 || c.bcf > 160) ? 'text-red-700 font-bold' : 'text-slate-700'}`}>{c.bcf ?? '–'}</td>
                        <td className="py-3 px-4 text-slate-700">{labelPresentation(c.presentation)}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{formatDate(c.prochaine_cpn)}</td>
                        <td className="pr-3"><ChevronDown className={`w-4 h-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} /></td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={10} className="px-6 py-4">
                            <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                              <Detail label="Albuminurie" value={c.albuminurie} />
                              <Detail label="Œdèmes" value={c.oedemes == null ? null : c.oedemes ? 'Oui' : 'Non'} />
                              <Detail label="Mouvements actifs" value={c.mouvements_actifs == null ? null : c.mouvements_actifs ? 'Oui' : 'Non'} />
                              <Detail label="Prévention" value={[
                                c.tpi_dose && `TPI ${c.tpi_dose}`, c.vat_dose && `VAT ${c.vat_dose}`,
                                c.fer_acide_folique && 'Fer + acide folique', c.moustiquaire && 'Moustiquaire',
                              ].filter(Boolean).join(' • ')} />
                              <Detail label="Examens" value={c.examens} />
                              <Detail label="Réalisée par" value={c.auteur ? formatPersonne(c.auteur, titreSoignant(c.auteur.role)) : null} />
                              <Detail label="Observations" value={c.observations} wide />
                              <Detail label="Conduite à tenir" value={c.conduite} wide />
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {admissionOpen && (
        <AdmissionModal patient={p} onSaved={(aid) => navigate(`/naissance/${aid}`)} onClose={() => setAdmissionOpen(false)} />
      )}
      {editOpen && <GrossesseFormModal grossesse={g} onSaved={fetchGrossesse} onClose={() => setEditOpen(false)} />}
      {cpnOpen && enCours && canWrite && (
        <CpnFormModal grossesse={g} appointmentId={passage} onSaved={fetchGrossesse} onClose={fermerCpn} />
      )}
    </div>
  )
}

function Repere({ label, value, sub, accent }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent ? 'text-pink-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function Detail({ label, value, wide }) {
  return (
    <div className={wide ? 'md:col-span-3' : ''}>
      <dt className="text-xs font-semibold text-slate-400 uppercase">{label}</dt>
      <dd className="text-slate-700 whitespace-pre-line">{value || '–'}</dd>
    </div>
  )
}
