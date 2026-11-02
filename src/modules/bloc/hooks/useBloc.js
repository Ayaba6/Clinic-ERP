import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export const ANESTHESIES = [
  { key: 'generale', label: 'Générale' },
  { key: 'locoregionale', label: 'Locorégionale' },
  { key: 'locale', label: 'Locale' },
  { key: 'sedation', label: 'Sédation' },
  { key: 'aucune', label: 'Aucune' },
]

export const labelAnesthesie = (key) => ANESTHESIES.find(a => a.key === key)?.label || '–'

// Deux liens vers profiles (chirurgien, demandeur) : il faut nommer la clé étrangère
export const INTERVENTION_SELECT = `*,
  patient:patients(id, code_patient, nom, prenom, date_naissance, genre, allergies, groupe_sanguin),
  chirurgien:profiles!interventions_bloc_chirurgien_principal_id_fkey(id, nom, prenom, specialite),
  demandeur:profiles!interventions_bloc_demande_par_fkey(nom, prenom)`

// Bornes d'une journée locale (AAAA-MM-JJ) en ISO
export function bornesJour(jour) {
  const debut = new Date(`${jour}T00:00:00`)
  const fin = new Date(debut)
  fin.setDate(fin.getDate() + 1)
  return [debut.toISOString(), fin.toISOString()]
}

// Liste d'interventions, rechargée en temps réel.
// vue « jour » (planning d'une date), « demandes » ou « historique » (90 jours)
export function useInterventions(vue, jour) {
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchInterventions = useCallback(async () => {
    let query = supabase.from('interventions_bloc').select(INTERVENTION_SELECT)
    if (vue === 'jour') {
      const [debut, fin] = bornesJour(jour)
      query = query.gte('date_programmee', debut).lt('date_programmee', fin)
        .neq('statut', 'annule').order('date_programmee')
    } else if (vue === 'demandes') {
      query = query.eq('statut', 'demande').order('created_at')
    } else {
      const depuis = new Date()
      depuis.setDate(depuis.getDate() - 90)
      query = query.in('statut', ['termine', 'annule']).gte('created_at', depuis.toISOString())
        .order('date_programmee', { ascending: false, nullsFirst: false }).limit(300)
    }
    const { data, error } = await query
    if (error) setError(error.message)
    else {
      setError(null)
      setInterventions(data || [])
    }
    setLoading(false)
  }, [vue, jour])

  useEffect(() => {
    fetchInterventions()

    const channel = supabase
      .channel(`bloc-${vue}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interventions_bloc' }, () => fetchInterventions())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchInterventions, vue])

  return { interventions, loading, error, fetchInterventions }
}

// Données de référence des formulaires : salles, chirurgiens, tarifs de bloc
export function useBlocReferentiel() {
  const [ref, setRef] = useState({ salles: [], chirurgiens: [], tarifs: [] })

  useEffect(() => {
    Promise.all([
      supabase.from('salles_bloc').select('id, nom').eq('actif', true).order('nom'),
      supabase.from('profiles').select('id, nom, prenom, specialite').eq('role', 'chirurgien').order('nom'),
      supabase.from('tarifs').select('id, libelle, prix').eq('type_acte', 'bloc').eq('actif', true).order('libelle'),
    ]).then(([s, c, t]) => setRef({ salles: s.data || [], chirurgiens: c.data || [], tarifs: t.data || [] }))
  }, [])

  return ref
}

// Création ou modification d'une intervention
export async function enregistrerIntervention(values, id) {
  const payload = {
    patient_id: values.patient_id,
    libelle_intervention: values.libelle_intervention.trim(),
    chirurgien_principal_id: values.chirurgien_principal_id || null,
    salle_operation: values.salle_operation || null,
    date_programmee: values.date && values.heure ? new Date(`${values.date}T${values.heure}`).toISOString() : null,
    duree_prevue_min: Number(values.duree_prevue_min) || 60,
    type_anesthesie: values.type_anesthesie || null,
    equipe: values.equipe?.trim() || null,
    notes_preop: values.notes_preop?.trim() || null,
    tarif_id: values.tarif_id || null,
    prix: values.prix === '' || values.prix == null ? null : Number(values.prix),
    statut: values.statut,
  }
  const { error } = id
    ? await supabase.from('interventions_bloc').update(payload).eq('id', id)
    : await supabase.from('interventions_bloc').insert([payload])
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Changement de statut (démarrer, terminer, annuler) avec les champs associés
export async function majIntervention(id, patch) {
  const { error } = await supabase.from('interventions_bloc').update(patch).eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
