import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

// ---------------------------------------------------------------------
// Calculs obstétricaux
// ---------------------------------------------------------------------

const JOUR = 86400000

// « 2026-03-14 » -> Date locale à midi (évite les décalages de fuseau)
const parseDate = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

// Date des dernières règles retenue : la DDR, sinon déduite du terme (terme - 280 j)
export function ddrEffective(g) {
  if (g.ddr) return parseDate(g.ddr)
  return new Date(parseDate(g.date_terme_prevue).getTime() - 280 * JOUR)
}

// Âge gestationnel en jours à une date donnée (aujourd'hui par défaut)
export function joursDeGrossesse(g, date = new Date()) {
  const ref = new Date(date)
  ref.setHours(12, 0, 0, 0)
  return Math.round((ref - ddrEffective(g)) / JOUR)
}

// 171 -> « 24 SA + 3 j »
export function formatSA(jours) {
  if (jours == null || Number.isNaN(jours)) return '–'
  if (jours < 0) return '–'
  const sa = Math.floor(jours / 7)
  const j = jours % 7
  return j ? `${sa} SA + ${j} j` : `${sa} SA`
}

export function trimestre(jours) {
  if (jours < 98) return '1er trimestre'
  if (jours < 196) return '2e trimestre'
  return '3e trimestre'
}

// Terme prévu calculé depuis la DDR (règle de Naegele : DDR + 280 j)
export function termeDepuisDdr(ddr) {
  if (!ddr) return ''
  const d = new Date(parseDate(ddr).getTime() + 280 * JOUR)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const joursAvant = (date) => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((parseDate(date) - today) / JOUR)
}

export const derniereCpn = (g) =>
  [...(g.cpn || [])].sort((a, b) => new Date(b.date_cpn) - new Date(a.date_cpn))[0] || null

export const tensionElevee = (c) => c && ((c.tension_sys ?? 0) >= 140 || (c.tension_dia ?? 0) >= 90)

// Alertes d'une grossesse en cours : [{ niveau: 'critique' | 'attention', texte }]
export function alertesGrossesse(g) {
  if (g.statut !== 'en_cours') return []
  const alertes = []
  const jours = joursDeGrossesse(g)
  const avantTerme = joursAvant(g.date_terme_prevue)
  const last = derniereCpn(g)

  if (jours >= 41 * 7) alertes.push({ niveau: 'critique', texte: `Terme dépassé (${formatSA(jours)})` })
  else if (avantTerme >= 0 && avantTerme <= 14) alertes.push({ niveau: 'attention', texte: `Terme dans ${avantTerme} j` })

  if (last) {
    if (tensionElevee(last)) alertes.push({ niveau: 'critique', texte: `Tension élevée (${last.tension_sys}/${last.tension_dia})` })
    if (['++', '+++'].includes(last.albuminurie)) alertes.push({ niveau: 'critique', texte: `Albuminurie ${last.albuminurie}` })
    if (last.bcf != null && (last.bcf < 110 || last.bcf > 160)) alertes.push({ niveau: 'critique', texte: `BCF anormaux (${last.bcf}/min)` })
    if (['siege', 'transverse'].includes(last.presentation) && (last.age_gestationnel_jours ?? 0) >= 36 * 7) {
      alertes.push({ niveau: 'attention', texte: `Présentation ${last.presentation === 'siege' ? 'du siège' : 'transverse'}` })
    }
    if (last.prochaine_cpn && joursAvant(last.prochaine_cpn) < 0) {
      alertes.push({ niveau: 'attention', texte: `CPN en retard de ${-joursAvant(last.prochaine_cpn)} j` })
    }
  } else {
    alertes.push({ niveau: 'attention', texte: 'Aucune CPN enregistrée' })
  }

  if (g.grossesse_a_risque) alertes.push({ niveau: 'attention', texte: 'Grossesse à risque' })
  return alertes
}

export const PRESENTATIONS = [
  { key: 'cephalique', label: 'Céphalique' },
  { key: 'siege', label: 'Siège' },
  { key: 'transverse', label: 'Transverse' },
  { key: 'indeterminee', label: 'Indéterminée' },
]
export const labelPresentation = (k) => PRESENTATIONS.find(p => p.key === k)?.label || '–'

// ---------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------

const PATIENT = 'patient:patients(id, code_patient, nom, prenom, date_naissance, telephone, groupe_sanguin, allergies)'
const CPN_RESUME = 'cpn(id, numero, date_cpn, prochaine_cpn, tension_sys, tension_dia, albuminurie, bcf, presentation, age_gestationnel_jours)'

// Liste des grossesses : « en_cours » ou clôturées (12 derniers mois)
export function useGrossesses(vue) {
  const [grossesses, setGrossesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGrossesses = useCallback(async () => {
    let query = supabase.from('grossesses').select(`*, ${PATIENT}, ${CPN_RESUME}`)
    if (vue === 'en_cours') {
      query = query.eq('statut', 'en_cours').order('date_terme_prevue')
    } else {
      const depuis = new Date()
      depuis.setFullYear(depuis.getFullYear() - 1)
      query = query.neq('statut', 'en_cours').gte('created_at', depuis.toISOString())
        .order('date_cloture', { ascending: false }).limit(200)
    }
    const { data, error } = await query
    if (error) setError(error.message)
    else {
      setError(null)
      setGrossesses(data || [])
    }
    setLoading(false)
  }, [vue])

  useEffect(() => {
    fetchGrossesses()
  }, [fetchGrossesses])

  return { grossesses, loading, error, fetchGrossesses }
}

// Une grossesse avec toutes ses CPN
export function useGrossesse(id) {
  const [grossesse, setGrossesse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchGrossesse = useCallback(async () => {
    const { data, error } = await supabase
      .from('grossesses')
      .select(`*, patient:patients(*),
        suivi:profiles!grossesses_suivi_par_fkey(nom, prenom, role),
        cpn(*, auteur:profiles!cpn_realisee_par_fkey(nom, prenom, role))`)
      .eq('id', id)
      .single()
    if (error) setError(error.message)
    else {
      setError(null)
      data.cpn.sort((a, b) => a.numero - b.numero)
      setGrossesse(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchGrossesse()
  }, [fetchGrossesse])

  return { grossesse, loading, error, fetchGrossesse }
}

// Grossesse en cours d'une patiente (null si aucune), pour le dossier et la consultation
export function useGrossesseEnCours(patientId, enabled = true) {
  const [grossesse, setGrossesse] = useState(null)

  useEffect(() => {
    if (!enabled || !patientId) return
    supabase
      .from('grossesses')
      .select('id, ddr, date_terme_prevue, grossesse_a_risque')
      .eq('patient_id', patientId)
      .eq('statut', 'en_cours')
      .maybeSingle()
      .then(({ data }) => setGrossesse(data || null))
  }, [patientId, enabled])

  return grossesse
}

const intOuNull = (v) => (v === '' || v == null ? null : Number(v))
const texteOuNull = (v) => (v && String(v).trim()) || null

export async function enregistrerGrossesse(values, id) {
  const payload = {
    ddr: values.ddr || null,
    date_terme_prevue: values.date_terme_prevue || null,
    gestite: intOuNull(values.gestite),
    parite: intOuNull(values.parite),
    avortements: intOuNull(values.avortements),
    enfants_vivants: intOuNull(values.enfants_vivants),
    antecedents: texteOuNull(values.antecedents),
    grossesse_a_risque: !!values.grossesse_a_risque,
    facteurs_risque: texteOuNull(values.facteurs_risque),
  }
  if (!id) payload.patient_id = values.patient_id
  const query = id
    ? supabase.from('grossesses').update(payload).eq('id', id).select('id').single()
    : supabase.from('grossesses').insert([payload]).select('id').single()
  const { data, error } = await query
  if (error) {
    const msg = error.message.includes('grossesses_une_en_cours')
      ? 'Cette patiente a déjà une grossesse en cours de suivi.'
      : error.message
    return { success: false, error: msg }
  }
  return { success: true, id: data.id }
}

export async function cloturerGrossesse(id, statut, issue) {
  const { error } = await supabase.from('grossesses').update({ statut, issue: texteOuNull(issue) }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function enregistrerCpn(values) {
  const bool = (v) => (v === 'oui' ? true : v === 'non' ? false : null)
  const payload = {
    grossesse_id: values.grossesse_id,
    appointment_id: values.appointment_id || null,
    poids: intOuNull(values.poids),
    tension_sys: intOuNull(values.tension_sys),
    tension_dia: intOuNull(values.tension_dia),
    hauteur_uterine: intOuNull(values.hauteur_uterine),
    bcf: intOuNull(values.bcf),
    presentation: values.presentation || null,
    mouvements_actifs: bool(values.mouvements_actifs),
    oedemes: bool(values.oedemes),
    albuminurie: values.albuminurie || null,
    tpi_dose: intOuNull(values.tpi_dose),
    vat_dose: intOuNull(values.vat_dose),
    fer_acide_folique: !!values.fer_acide_folique,
    moustiquaire: !!values.moustiquaire,
    examens: texteOuNull(values.examens),
    observations: texteOuNull(values.observations),
    conduite: texteOuNull(values.conduite),
    prochaine_cpn: values.prochaine_cpn || null,
  }
  const { error } = await supabase.from('cpn').insert([payload])
  if (error) return { success: false, error: error.message }
  return { success: true }
}
