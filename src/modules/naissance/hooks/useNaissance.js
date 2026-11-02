import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export const MODES = [
  { key: 'voie_basse', label: 'Voie basse' },
  { key: 'instrumentale', label: 'Voie basse instrumentale' },
  { key: 'cesarienne', label: 'Césarienne' },
]
export const labelMode = (k) => MODES.find(m => m.key === k)?.label || '–'

export const LIQUIDES = [
  { key: 'intact', label: 'Poche intacte' },
  { key: 'clair', label: 'Clair' },
  { key: 'teinte', label: 'Teinté' },
  { key: 'meconial', label: 'Méconial' },
  { key: 'sanglant', label: 'Sanglant' },
]
export const labelLiquide = (k) => LIQUIDES.find(l => l.key === k)?.label || '–'

// Alertes d'une mesure de surveillance du travail
export function alertesMesure(m) {
  const alertes = []
  if (m.bcf != null && (m.bcf < 110 || m.bcf > 160)) alertes.push(`BCF ${m.bcf}/min`)
  if (['meconial', 'sanglant'].includes(m.liquide)) alertes.push(`Liquide ${m.liquide === 'meconial' ? 'méconial' : 'sanglant'}`)
  if ((m.tension_sys ?? 0) >= 140 || (m.tension_dia ?? 0) >= 90) alertes.push(`TA ${m.tension_sys}/${m.tension_dia}`)
  if ((m.temperature ?? 0) >= 38) alertes.push(`Fièvre ${m.temperature} °C`)
  return alertes
}

// Hémorragie du post-partum : pertes ≥ 500 ml
export const hemorragie = (a) => (a.pertes_sang_ml ?? 0) >= 500

// Apgar inquiétant : < 7 à 5 minutes
export const apgarBas = (n) => n.apgar_5 != null && n.apgar_5 < 7

const MERE = 'patient:patients(id, code_patient, nom, prenom, date_naissance, telephone, groupe_sanguin, allergies)'
const GROSSESSE = 'grossesse:grossesses(id, ddr, date_terme_prevue, grossesse_a_risque, facteurs_risque, gestite, parite)'

// Liste : « travail » (en cours, temps réel) ou « recents » (30 derniers jours)
export function useAccouchements(vue) {
  const [accouchements, setAccouchements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccouchements = useCallback(async () => {
    let query = supabase.from('accouchements')
      .select(`*, ${MERE}, ${GROSSESSE}, surveillance_travail(mesure_le, dilatation_cm, bcf, liquide, tension_sys, tension_dia, temperature), nouveau_nes(id, sexe, vivant, poids_g, apgar_5)`)
    if (vue === 'travail') {
      query = query.eq('statut', 'travail').order('admission_le')
    } else {
      const depuis = new Date()
      depuis.setDate(depuis.getDate() - 30)
      query = query.neq('statut', 'travail').gte('admission_le', depuis.toISOString())
        .order('admission_le', { ascending: false })
    }
    const { data, error } = await query
    if (error) setError(error.message)
    else {
      setError(null)
      setAccouchements(data || [])
    }
    setLoading(false)
  }, [vue])

  useEffect(() => {
    fetchAccouchements()
    const channel = supabase
      .channel(`naissance-${vue}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accouchements' }, () => fetchAccouchements())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveillance_travail' }, () => fetchAccouchements())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAccouchements, vue])

  return { accouchements, loading, error }
}

// Une admission avec sa surveillance et ses nouveau-nés
export function useAccouchement(id) {
  const [accouchement, setAccouchement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccouchement = useCallback(async () => {
    const { data, error } = await supabase
      .from('accouchements')
      .select(`*, ${MERE}, ${GROSSESSE},
        responsable:profiles!accouchements_responsable_id_fkey(nom, prenom, role),
        surveillance_travail(*, auteur:profiles!surveillance_travail_auteur_id_fkey(nom, prenom, role)),
        nouveau_nes(*, bebe:patients(id, code_patient, nom, prenom))`)
      .eq('id', id)
      .single()
    if (error) setError(error.message)
    else {
      setError(null)
      data.surveillance_travail.sort((a, b) => new Date(a.mesure_le) - new Date(b.mesure_le))
      data.nouveau_nes.sort((a, b) => a.rang - b.rang)
      setAccouchement(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchAccouchement()
    const channel = supabase
      .channel(`accouchement-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surveillance_travail', filter: `accouchement_id=eq.${id}` }, () => fetchAccouchement())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchAccouchement, id])

  return { accouchement, loading, error, fetchAccouchement }
}

// Admission en cours d'une patiente (pour la fiche grossesse)
export function useAdmissionEnCours(patientId) {
  const [admission, setAdmission] = useState(null)
  useEffect(() => {
    if (!patientId) return
    supabase.from('accouchements').select('id').eq('patient_id', patientId).eq('statut', 'travail').maybeSingle()
      .then(({ data }) => setAdmission(data || null))
  }, [patientId])
  return admission
}

const num = (v) => (v === '' || v == null ? null : Number(v))
const txt = (v) => (v && String(v).trim()) || null

export async function admettre(values) {
  const { data, error } = await supabase.from('accouchements').insert([{
    patient_id: values.patient_id,
    motif_admission: txt(values.motif_admission),
    poche_eaux: values.poche_eaux || null,
  }]).select('id').single()
  if (error) {
    const msg = error.message.includes('accouchements_un_travail')
      ? 'Cette patiente est déjà admise en salle de naissance.'
      : error.message
    return { success: false, error: msg }
  }
  return { success: true, id: data.id }
}

export async function ajouterMesure(accouchementId, values) {
  const { error } = await supabase.from('surveillance_travail').insert([{
    accouchement_id: accouchementId,
    dilatation_cm: num(values.dilatation_cm),
    bcf: num(values.bcf),
    contractions_10min: num(values.contractions_10min),
    tension_sys: num(values.tension_sys),
    tension_dia: num(values.tension_dia),
    temperature: num(values.temperature),
    liquide: values.liquide || null,
    remarques: txt(values.remarques),
  }])
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function terminerAccouchement(id, data, enfants) {
  const { data: res, error } = await supabase.rpc('terminer_accouchement', {
    p_id: id,
    p_data: { ...data, accouchement_le: data.accouchement_le ? new Date(data.accouchement_le).toISOString() : '' },
    p_enfants: enfants,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, data: res }
}

// Transfert / évacuation ou faux travail
export async function cloturerAdmission(id, statut, motif) {
  const { error } = await supabase.from('accouchements').update({ statut, motif_cloture: txt(motif) }).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Registre des naissances d'un mois (AAAA-MM)
export function useRegistre(mois) {
  const [naissances, setNaissances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const [y, m] = mois.split('-').map(Number)
    const debut = new Date(y, m - 1, 1)
    const fin = new Date(y, m, 1)
    supabase
      .from('accouchements')
      .select(`id, accouchement_le, mode, ${MERE},
        responsable:profiles!accouchements_responsable_id_fkey(nom, prenom, role),
        nouveau_nes(*, bebe:patients(id, code_patient, nom, prenom))`)
      .eq('statut', 'accouchee')
      .gte('accouchement_le', debut.toISOString())
      .lt('accouchement_le', fin.toISOString())
      .order('accouchement_le')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else {
          setError(null)
          // Une ligne par enfant
          setNaissances((data || []).flatMap(a => a.nouveau_nes.sort((x, z) => x.rang - z.rang).map(n => ({ ...n, accouchement: a }))))
        }
        setLoading(false)
      })
  }, [mois])

  return { naissances, loading, error }
}
