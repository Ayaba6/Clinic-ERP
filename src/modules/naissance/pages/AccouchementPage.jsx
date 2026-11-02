import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  useAccouchement, ajouterMesure, cloturerAdmission, alertesMesure, labelMode, labelLiquide,
  hemorragie, apgarBas, LIQUIDES,
} from '../hooks/useNaissance'
import { joursDeGrossesse, formatSA, labelPresentation } from '../../maternite/hooks/useMaternite'
import AccouchementFormModal from '../components/AccouchementFormModal'
import InterventionFormModal from '../../bloc/components/InterventionFormModal'
import { CertificatAccouchement } from '../components/Impressions'
import StatutBadge from '../../../components/ui/StatutBadge'
import { titreSoignant } from '../../../lib/roles'
import { getAge, formatAttente, formatDateTime, formatPersonne } from '../../../lib/format'
import {
  ArrowLeft, Loader2, Baby, AlertCircle, AlertTriangle, FolderOpen, Plus, Ambulance, Ban, Scissors, Printer, HeartPulse, ShieldAlert,
} from 'lucide-react'

const inputClass = 'w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 outline-none bg-white'

export default function AccouchementPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canWrite = ['admin', 'medecin', 'sage_femme'].includes(profile?.role)
  const canMesurer = canWrite || profile?.role === 'infirmier'
  const { accouchement: a, loading, error, fetchAccouchement } = useAccouchement(id)

  const [formOpen, setFormOpen] = useState(false)
  const [blocOpen, setBlocOpen] = useState(false)
  const [cloture, setCloture] = useState(null) // { statut, motif }
  const [actionError, setActionError] = useState(null)
  const [toPrint, setToPrint] = useState(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
      </div>
    )
  }
  if (error || !a) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-3">
        <p className="font-semibold text-slate-700">Admission introuvable ou accès refusé.</p>
        {error && <p className="text-sm text-slate-500">{error}</p>}
        <Link to="/naissance" className="text-sm text-pink-600 hover:underline">Retour à la salle de naissance</Link>
      </div>
    )
  }

  const m = a.patient
  const enTravail = a.statut === 'travail'

  const confirmerCloture = async () => {
    setActionError(null)
    const result = await cloturerAdmission(a.id, cloture.statut, cloture.motif)
    if (result.success) {
      setCloture(null)
      fetchAccouchement()
    } else {
      setActionError(result.error)
    }
  }

  const print = (enfant) => {
    setToPrint(enfant)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/naissance')} className="mt-1 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800" title="Retour">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800">{m.nom} {m.prenom}</h2>
                <span className="font-mono text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">{m.code_patient}</span>
                {enTravail
                  ? <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-pink-50 text-pink-700 border-pink-200">En travail</span>
                  : <StatutBadge statut={a.statut} />}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {getAge(m.date_naissance) ?? '–'} ans • Groupe {m.groupe_sanguin || 'N/C'}
                {a.grossesse && <> • {a.grossesse.gestite != null ? `G${a.grossesse.gestite}P${a.grossesse.parite ?? 0} • ` : ''}{formatSA(joursDeGrossesse(a.grossesse, a.accouchement_le || undefined))}</>}
                {' '}• Admise le {formatDateTime(a.admission_le)}{enTravail && ` (${formatAttente(a.admission_le)})`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/patients/${m.id}`} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
              <FolderOpen className="w-4 h-4" /> Dossier
            </Link>
            {a.grossesse && (
              <Link to={`/maternite/grossesses/${a.grossesse.id}`} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                <HeartPulse className="w-4 h-4" /> Suivi de grossesse
              </Link>
            )}
            {canWrite && enTravail && (
              <>
                <button onClick={() => setCloture({ statut: 'transferee', motif: '' })} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Ambulance className="w-4 h-4" /> Transfert
                </button>
                <button onClick={() => setBlocOpen(true)} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <Scissors className="w-4 h-4" /> Césarienne au bloc
                </button>
                <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold shadow-sm">
                  <Baby className="w-4 h-4" /> Enregistrer l'accouchement
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

        {m.allergies && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span><b>Allergies : </b>{m.allergies}</span>
          </div>
        )}
        {a.grossesse?.grossesse_a_risque && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span><b>Grossesse à risque : </b>{a.grossesse.facteurs_risque || 'facteurs non précisés'}</span>
          </div>
        )}

        {cloture && (
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Clôture</label>
              <select value={cloture.statut} onChange={(e) => setCloture({ ...cloture, statut: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white">
                <option value="transferee">Transfert / évacuation</option>
                <option value="annule">Faux travail (retour à domicile)</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Motif / destination</label>
              <input autoFocus value={cloture.motif} onChange={(e) => setCloture({ ...cloture, motif: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                placeholder={cloture.statut === 'transferee' ? 'Ex: Évacuée au CHU Yalgado — dystocie' : 'Ex: Pas de modification du col'} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCloture(null)} className="px-3 py-2 text-sm text-slate-500">Retour</button>
              <button onClick={confirmerCloture} disabled={!cloture.motif.trim()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                <Ban className="w-4 h-4 inline mr-1" /> Clôturer l'admission
              </button>
            </div>
          </div>
        )}

        {a.motif_cloture && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700">
            <b>{a.statut === 'transferee' ? 'Transfert' : 'Clôture'} : </b>{a.motif_cloture}
          </div>
        )}

        {/* Accouchement et nouveau-nés */}
        {a.statut === 'accouchee' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Accouchement</h3>
              <dl className="space-y-2 text-sm">
                <Ligne label="Date et heure" value={formatDateTime(a.accouchement_le)} />
                <Ligne label="Mode" value={labelMode(a.mode)} />
                <Ligne label="Présentation" value={labelPresentation(a.presentation)} />
                <Ligne label="Épisiotomie" value={a.episiotomie == null ? '–' : a.episiotomie ? 'Oui' : 'Non'} />
                <Ligne label="Déchirure" value={!a.dechirure ? '–' : a.dechirure === 'aucune' ? 'Aucune' : `${a.dechirure}e degré`} />
                <Ligne label="Délivrance" value={a.delivrance ? a.delivrance.charAt(0).toUpperCase() + a.delivrance.slice(1) : '–'} />
                <Ligne label="GATPA" value={a.gatpa == null ? '–' : a.gatpa ? 'Oui' : 'Non'} />
                <Ligne label="Pertes sanguines" value={a.pertes_sang_ml != null ? `${a.pertes_sang_ml} ml` : '–'} alerte={hemorragie(a)} />
                {a.responsable && <Ligne label="Responsable" value={formatPersonne(a.responsable, titreSoignant(a.responsable.role))} />}
              </dl>
              {hemorragie(a) && (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700"><AlertCircle className="w-4 h-4" /> Hémorragie du post-partum (≥ 500 ml)</p>
              )}
              {a.complications && <p className="text-sm text-slate-700"><b>Complications : </b>{a.complications}</p>}
              {a.etat_mere && <p className="text-sm text-slate-700"><b>État de la mère : </b>{a.etat_mere}</p>}
              {a.observations && <p className="text-sm text-slate-700 whitespace-pre-line">{a.observations}</p>}
            </div>

            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
              {a.nouveau_nes.map(n => (
                <div key={n.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {n.bebe ? `${n.bebe.nom} ${n.bebe.prenom}` : 'Mort-né'}
                        {a.nouveau_nes.length > 1 && <span className="text-xs text-slate-500 font-normal"> (J{n.rang})</span>}
                      </div>
                      <div className="text-xs text-slate-500">{n.sexe === 'F' ? 'Fille' : 'Garçon'}{n.bebe && <> • <span className="font-mono text-blue-600">{n.bebe.code_patient}</span></>}</div>
                    </div>
                    <Baby className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Mini label="Poids" value={n.poids_g ? `${n.poids_g} g` : '–'} alerte={n.poids_g != null && n.poids_g < 2500} />
                    <Mini label="Taille" value={n.taille_cm ? `${n.taille_cm} cm` : '–'} />
                    <Mini label="PC" value={n.perimetre_cranien_cm ? `${n.perimetre_cranien_cm} cm` : '–'} />
                    <Mini label="Apgar 1 min" value={n.apgar_1 ?? '–'} />
                    <Mini label="Apgar 5 min" value={n.apgar_5 ?? '–'} alerte={apgarBas(n)} />
                    <Mini label="Réanimation" value={n.reanimation ? 'Oui' : 'Non'} alerte={n.reanimation} />
                  </div>
                  {n.poids_g != null && n.poids_g < 2500 && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> Petit poids de naissance (&lt; 2 500 g)</p>
                  )}
                  {apgarBas(n) && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><AlertCircle className="w-3.5 h-3.5" /> Apgar &lt; 7 à 5 minutes</p>
                  )}
                  <p className="text-xs text-slate-500">
                    {[n.vitamine_k && 'Vitamine K', n.collyre && 'Collyre', n.mise_au_sein_precoce && 'Mise au sein précoce'].filter(Boolean).join(' • ') || 'Soins immédiats non renseignés'}
                  </p>
                  {n.malformations && <p className="text-xs text-red-700"><b>Malformations : </b>{n.malformations}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {n.bebe && (
                      <Link to={`/patients/${n.bebe.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <FolderOpen className="w-3.5 h-3.5" /> Dossier du bébé
                      </Link>
                    )}
                    {n.vivant && (
                      <button onClick={() => print(n)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">
                        <Printer className="w-3.5 h-3.5" /> Certificat d'accouchement
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Surveillance du travail */}
        <Surveillance accouchement={a} canMesurer={canMesurer && enTravail} onAdded={fetchAccouchement} />

        {formOpen && <AccouchementFormModal accouchement={a} onSaved={fetchAccouchement} onClose={() => setFormOpen(false)} />}
        {blocOpen && (
          <InterventionFormModal
            mode={['admin', 'chirurgien'].includes(profile?.role) ? 'programmer' : 'demande'}
            // Pré-rempli : césarienne pour cette parturiente
            intervention={{ libelle_intervention: 'Césarienne', patient: m, statut: 'demande', type_anesthesie: 'locoregionale' }}
            profile={profile}
            onClose={() => setBlocOpen(false)}
          />
        )}
      </div>

      <div className="hidden print:block">
        {toPrint && <CertificatAccouchement accouchement={a} enfant={toPrint} />}
      </div>
    </>
  )
}

function Surveillance({ accouchement: a, canMesurer, onAdded }) {
  const vide = { dilatation_cm: '', bcf: '', contractions_10min: '', tension_sys: '', tension_dia: '', temperature: '', liquide: '', remarques: '' }
  const [values, setValues] = useState(vide)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const mesures = a.surveillance_travail

  const handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await ajouterMesure(a.id, values)
    setBusy(false)
    if (result.success) {
      setValues(vide)
      onAdded()
    } else {
      setError(result.error)
    }
  }

  if (mesures.length === 0 && !canMesurer) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Surveillance du travail</h3>
        <p className="text-xs text-slate-500">Dilatation, bruits du cœur fœtal, contractions et constantes maternelles.</p>
      </div>

      {canMesurer && (
        <form onSubmit={submit} className="p-4 bg-pink-50/40 border-b border-slate-100 space-y-3">
          {error && <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 items-end">
            <Champ label="Dilatation (cm)"><input type="number" step="0.5" min="0" max="10" name="dilatation_cm" value={values.dilatation_cm} onChange={handleChange} className={inputClass} /></Champ>
            <Champ label="BCF (/min)"><input type="number" min="0" max="250" name="bcf" value={values.bcf} onChange={handleChange} className={inputClass} /></Champ>
            <Champ label="CU / 10 min"><input type="number" min="0" max="10" name="contractions_10min" value={values.contractions_10min} onChange={handleChange} className={inputClass} /></Champ>
            <Champ label="TA sys."><input type="number" min="40" max="300" name="tension_sys" value={values.tension_sys} onChange={handleChange} className={inputClass} /></Champ>
            <Champ label="TA dia."><input type="number" min="20" max="200" name="tension_dia" value={values.tension_dia} onChange={handleChange} className={inputClass} /></Champ>
            <Champ label="Temp. (°C)"><input type="number" step="0.1" min="30" max="45" name="temperature" value={values.temperature} onChange={handleChange} className={inputClass} /></Champ>
            <Champ label="Liquide">
              <select name="liquide" value={values.liquide} onChange={handleChange} className={inputClass}>
                <option value="">–</option>
                {LIQUIDES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </Champ>
            <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Relevé
            </button>
          </div>
          <input name="remarques" value={values.remarques} onChange={handleChange} className={inputClass} placeholder="Remarques (facultatif)" />
        </form>
      )}

      {mesures.length === 0 ? (
        <p className="text-center py-8 text-sm text-slate-400">Aucun relevé pour l'instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-2.5 px-4">Heure</th>
                <th className="py-2.5 px-4 text-right">Dilatation</th>
                <th className="py-2.5 px-4 text-right">BCF</th>
                <th className="py-2.5 px-4 text-right">CU/10 min</th>
                <th className="py-2.5 px-4 text-right">TA</th>
                <th className="py-2.5 px-4 text-right">Temp.</th>
                <th className="py-2.5 px-4">Liquide</th>
                <th className="py-2.5 px-4">Alertes / remarques</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...mesures].reverse().map(s => {
                const alertes = alertesMesure(s)
                return (
                  <tr key={s.id}>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(s.mesure_le).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {s.auteur && <div className="text-xs text-slate-400">{formatPersonne(s.auteur, titreSoignant(s.auteur.role))}</div>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-800">{s.dilatation_cm != null ? `${s.dilatation_cm} cm` : '–'}</td>
                    <td className={`py-2.5 px-4 text-right ${s.bcf != null && (s.bcf < 110 || s.bcf > 160) ? 'text-red-700 font-bold' : 'text-slate-700'}`}>{s.bcf ?? '–'}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{s.contractions_10min ?? '–'}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700 whitespace-nowrap">{s.tension_sys ? `${s.tension_sys}/${s.tension_dia ?? '–'}` : '–'}</td>
                    <td className="py-2.5 px-4 text-right text-slate-700">{s.temperature ?? '–'}</td>
                    <td className="py-2.5 px-4 text-slate-700">{labelLiquide(s.liquide)}</td>
                    <td className="py-2.5 px-4 text-xs">
                      {alertes.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 mr-1 mb-1 px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3 h-3" /> {t}
                        </span>
                      ))}
                      {s.remarques && <span className="text-slate-600">{s.remarques}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const Champ = ({ label, children }) => (
  <div>
    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">{label}</label>
    {children}
  </div>
)
const Ligne = ({ label, value, alerte }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-slate-500">{label}</dt>
    <dd className={alerte ? 'font-bold text-red-700' : 'font-medium text-slate-800'}>{value}</dd>
  </div>
)
const Mini = ({ label, value, alerte }) => (
  <div className={`rounded-lg py-1.5 ${alerte ? 'bg-red-50' : 'bg-slate-50'}`}>
    <div className="text-[11px] text-slate-500">{label}</div>
    <div className={`text-sm font-semibold ${alerte ? 'text-red-700' : 'text-slate-800'}`}>{value}</div>
  </div>
)
