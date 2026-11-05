import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export const TYPES_RDV = [
  { key: 'consultation', label: 'Consultation', color: 'bg-brand-50 text-brand-700 border-brand-200' },
  { key: 'cpn', label: 'CPN', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { key: 'echographie', label: 'Échographie', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'postnatal', label: 'Postnatale', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'controle', label: 'Contrôle', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'vaccination', label: 'Vaccination', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'autre', label: 'Autre', color: 'bg-slate-100 text-slate-700 border-slate-200' },
]
export const typeRdv = (k) => TYPES_RDV.find(t => t.key === k) || TYPES_RDV[TYPES_RDV.length - 1]

export const STATUTS_RDV = {
  prevu: { label: 'Prévu', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  confirme: { label: 'Confirmé', color: 'bg-brand-50 text-brand-700 border-brand-200' },
  arrive: { label: 'Arrivé', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  termine: { label: 'Terminé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  absent: { label: 'Absent', color: 'bg-red-50 text-red-700 border-red-200' },
  annule: { label: 'Annulé', color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const pad = (n) => String(n).padStart(2, '0')
export const isoJour = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const aujourdhuiISO = () => isoJour(new Date())
export const decalerJour = (jour, n) => {
  const d = new Date(`${jour}T12:00:00`)
  d.setDate(d.getDate() + n)
  return isoJour(d)
}
export const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const estPasse = (iso) => new Date(iso).getTime() < Date.now()
// Lundi de la semaine d'un jour donné
export const lundi = (jour) => {
  const d = new Date(`${jour}T12:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return isoJour(d)
}

const SELECT = `*,
  patient:patients(id, code_patient, nom, prenom, telephone, genre),
  praticien:profiles!rendez_vous_praticien_id_fkey(id, nom, prenom, role)`

// Rendez-vous entre deux jours (inclus), rechargés en temps réel
export function useRendezVous(debut, fin) {
  const [rdvs, setRdvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRdvs = useCallback(async () => {
    const from = new Date(`${debut}T00:00:00`)
    const to = new Date(`${fin}T00:00:00`)
    to.setDate(to.getDate() + 1)
    const { data, error } = await supabase
      .from('rendez_vous')
      .select(SELECT)
      .gte('date_heure', from.toISOString())
      .lt('date_heure', to.toISOString())
      .order('date_heure')
    if (error) setError(error.message)
    else {
      setError(null)
      setRdvs(data || [])
    }
    setLoading(false)
  }, [debut, fin])

  useEffect(() => {
    fetchRdvs()
    const channel = supabase
      .channel(`rdv-${debut}-${fin}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rendez_vous' }, () => fetchRdvs())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRdvs, debut, fin])

  return { rdvs, loading, error, fetchRdvs }
}

// Prochains rendez-vous d'un patient (dossier patient)
export function useRdvPatient(patientId, enabled = true) {
  const [rdvs, setRdvs] = useState([])

  const fetchRdvs = useCallback(async () => {
    if (!enabled || !patientId) return
    const { data } = await supabase
      .from('rendez_vous')
      .select(SELECT)
      .eq('patient_id', patientId)
      .in('statut', ['prevu', 'confirme'])
      .gte('date_heure', new Date(Date.now() - 86400000).toISOString())
      .order('date_heure')
      .limit(5)
    setRdvs(data || [])
  }, [patientId, enabled])

  useEffect(() => {
    fetchRdvs()
  }, [fetchRdvs])

  return { rdvs, fetchRdvs }
}

// Praticiens qui reçoivent des rendez-vous
export function usePraticiens() {
  const [praticiens, setPraticiens] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('id, nom, prenom, role, specialite')
      .in('role', ['medecin', 'sage_femme']).order('nom')
      .then(({ data }) => setPraticiens(data || []))
  }, [])
  return praticiens
}

export async function enregistrerRdv(values, id) {
  const payload = {
    patient_id: values.patient_id,
    praticien_id: values.praticien_id || null,
    type: values.type,
    date_heure: new Date(`${values.date}T${values.heure}`).toISOString(),
    duree_min: Number(values.duree_min) || 20,
    // Une heure saisie à la main est une heure réelle
    heure_a_confirmer: false,
    motif: values.motif?.trim() || null,
    notes: values.notes?.trim() || null,
  }
  const { error } = id
    ? await supabase.from('rendez_vous').update(payload).eq('id', id)
    : await supabase.from('rendez_vous').insert([payload])
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function changerStatutRdv(id, statut, motif) {
  const patch = { statut }
  if (statut === 'annule') patch.motif_annulation = motif || null
  const { error } = await supabase.from('rendez_vous').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// La patiente est là : elle passe en file d'attente du praticien
export async function arriverRdv(id) {
  const { error } = await supabase.rpc('arriver_rendez_vous', { p_id: id })
  if (error) return { success: false, error: error.message }
  return { success: true }
}
