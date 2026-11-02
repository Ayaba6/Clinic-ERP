import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

// Sections du dossier visibles par rôle (aligné sur les règles RLS de supabase/securite.sql).
// On n'interroge que ce que le rôle a le droit de voir, pour ne pas afficher
// « Aucune consultation » à quelqu'un qui n'a simplement pas l'accès.
export const SECTIONS_BY_ROLE = {
  admin: ['appointments', 'consultations', 'interventions', 'factures'],
  reception: ['appointments'],
  medecin: ['appointments', 'consultations', 'interventions'],
  infirmier: ['appointments', 'consultations', 'interventions'],
  chirurgien: ['appointments', 'consultations', 'interventions'],
  pharmacien: [],
  caisse: ['appointments', 'interventions', 'factures'],
}

const EMPTY = { appointments: [], consultations: [], interventions: [], factures: [] }

export function usePatientDossier(patientId, role) {
  const [patient, setPatient] = useState(null)
  const [history, setHistory] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDossier = useCallback(async () => {
    const sections = SECTIONS_BY_ROLE[role] || []
    try {
      setLoading(true)
      setError(null)

      const { data: patientData, error: errPatient } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()
      if (errPatient) throw errPatient

      const queries = {
        appointments: () => supabase
          .from('appointments')
          .select('*, doctor:profiles(nom, prenom)')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false }),
        consultations: () => supabase
          .from('consultations')
          .select('*, doctor:profiles(nom, prenom), prescriptions(id, quantite, posologie, statut, medicament:medicaments(nom, dosage, forme))')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false }),
        interventions: () => supabase
          .from('interventions_bloc')
          .select('*, chirurgien:profiles!interventions_bloc_chirurgien_principal_id_fkey(nom, prenom)')
          .eq('patient_id', patientId)
          .order('date_programmee', { ascending: false }),
        factures: () => supabase
          .from('factures')
          .select('*, lignes_facture(*)')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false }),
      }

      const results = await Promise.all(sections.map(s => queries[s]()))
      const next = { ...EMPTY }
      sections.forEach((s, i) => {
        if (results[i].error) throw results[i].error
        next[s] = results[i].data || []
      })

      setPatient(patientData)
      setHistory(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [patientId, role])

  useEffect(() => {
    fetchDossier()
  }, [fetchDossier])

  const updatePatient = async (values) => {
    const { data, error } = await supabase
      .from('patients')
      .update(values)
      .eq('id', patientId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    setPatient(data)
    return { success: true }
  }

  // Envoie le patient dans la file d'attente d'un médecin
  const sendToConsultation = async ({ doctorId, motif }) => {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{ patient_id: patientId, doctor_id: doctorId || null, motif, statut: 'en_attente' }])
      .select('*, doctor:profiles(nom, prenom)')
      .single()

    if (error) return { success: false, error: error.message }
    setHistory(h => ({ ...h, appointments: [data, ...h.appointments] }))
    return { success: true }
  }

  const cancelAppointment = async (appointmentId) => {
    const { error } = await supabase
      .from('appointments')
      .update({ statut: 'annule' })
      .eq('id', appointmentId)

    if (error) return { success: false, error: error.message }
    setHistory(h => ({
      ...h,
      appointments: h.appointments.map(a => a.id === appointmentId ? { ...a, statut: 'annule' } : a),
    }))
    return { success: true }
  }

  return { patient, history, loading, error, fetchDossier, updatePatient, sendToConsultation, cancelAppointment }
}

// Liste des médecins pour le choix lors de l'envoi en consultation
export function useDoctors() {
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nom, prenom, specialite')
      .eq('role', 'medecin')
      .order('nom')
      .then(({ data }) => setDoctors(data || []))
  }, [])

  return doctors
}
