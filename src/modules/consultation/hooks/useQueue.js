import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'

const SELECT = '*, patient:patients(id, code_patient, nom, prenom, date_naissance, genre, allergies), doctor:profiles(nom, prenom)'

// File d'attente des consultations.
// Médecin : ses patients + ceux envoyés au « premier médecin disponible ».
// Admin : toute la file.
export function useQueue(profile) {
  const [queue, setQueue] = useState([])
  const [doneToday, setDoneToday] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isAdmin = profile?.role === 'admin'
  const userId = profile?.id

  const fetchQueue = useCallback(async () => {
    try {
      setError(null)
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      let queueQuery = supabase
        .from('appointments')
        .select(SELECT)
        .in('statut', ['en_attente', 'en_consultation'])
        .order('created_at', { ascending: true })

      let doneQuery = supabase
        .from('appointments')
        .select(SELECT)
        .eq('statut', 'termine')
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (!isAdmin) {
        queueQuery = queueQuery.or(`doctor_id.eq.${userId},doctor_id.is.null`)
        doneQuery = doneQuery.eq('doctor_id', userId)
      }

      const [q, d] = await Promise.all([queueQuery, doneQuery])
      if (q.error) throw q.error
      if (d.error) throw d.error

      setQueue(q.data || [])
      setDoneToday(d.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAdmin, userId])

  useEffect(() => {
    fetchQueue()

    // Temps réel : toute modification de la file recharge la liste
    const channel = supabase
      .channel('file-attente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchQueue())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchQueue])

  // Le médecin prend le patient. La condition sur le statut évite que
  // deux médecins prennent le même patient au même moment.
  const takeCharge = async (appointmentId) => {
    const { data, error } = await supabase
      .from('appointments')
      .update({ statut: 'en_consultation', doctor_id: userId })
      .eq('id', appointmentId)
      .eq('statut', 'en_attente')
      .select('id')

    if (error) return { success: false, error: error.message }
    if (!data || data.length === 0) {
      fetchQueue()
      return { success: false, error: 'Ce patient vient d\'être pris en charge par un autre médecin.' }
    }
    return { success: true }
  }

  return { queue, doneToday, loading, error, fetchQueue, takeCharge }
}
