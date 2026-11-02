import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

// Données nécessaires à l'écran de consultation : le passage, le patient,
// ses consultations précédentes et le catalogue des médicaments.
export function useConsultation(appointmentId) {
  const [appointment, setAppointment] = useState(null)
  const [previous, setPrevious] = useState([])
  const [medicaments, setMedicaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const { data: appt, error: errAppt } = await supabase
          .from('appointments')
          .select('*, patient:patients(*), doctor:profiles(nom, prenom)')
          .eq('id', appointmentId)
          .single()
        if (errAppt) throw errAppt

        const [prev, meds] = await Promise.all([
          supabase
            .from('consultations')
            .select('*, doctor:profiles(nom, prenom), prescriptions(id, quantite, posologie, medicament:medicaments(nom, dosage))')
            .eq('patient_id', appt.patient_id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('medicaments')
            .select('id, nom, dosage, forme, stock_actuel')
            .order('nom'),
        ])
        if (prev.error) throw prev.error
        if (meds.error) throw meds.error

        setAppointment(appt)
        setPrevious(prev.data || [])
        setMedicaments(meds.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [appointmentId])

  // Enregistre consultation + ordonnance + clôture du passage (transaction SQL)
  const terminer = async (values, prescriptions) => {
    const toNumber = (v) => (v === '' || v == null ? null : Number(v))
    const { data, error } = await supabase.rpc('terminer_consultation', {
      p_appointment_id: appointmentId,
      p_poids: toNumber(values.poids),
      p_temperature: toNumber(values.temperature),
      p_tension: values.tension,
      p_symptomes: values.symptomes,
      p_diagnostic: values.diagnostic,
      p_prescriptions: prescriptions.map(p => ({
        medicament_id: p.medicament_id,
        quantite: Number(p.quantite),
        posologie: p.posologie,
      })),
    })

    if (error) return { success: false, error: error.message }
    return { success: true, consultationId: data }
  }

  // Le médecin rend le patient à la file (ex. : examen complémentaire avant de conclure)
  const remettreEnAttente = async () => {
    const { error } = await supabase
      .from('appointments')
      .update({ statut: 'en_attente' })
      .eq('id', appointmentId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  return { appointment, previous, medicaments, loading, error, terminer, remettreEnAttente }
}
