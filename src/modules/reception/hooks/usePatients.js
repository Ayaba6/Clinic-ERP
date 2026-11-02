import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export function usePatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPatients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const addPatient = async (patientData) => {
    try {
      // Le code patient unique (PAT-2026-00001) est généré par la base
      // (trigger trg_code_patient, voir supabase/securite.sql)
      const { data, error } = await supabase
        .from('patients')
        .insert([patientData])
        .select()

      if (error) throw error
      setPatients(list => [data[0], ...list])
      return { success: true, data: data[0] }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  return { patients, loading, error, fetchPatients, addPatient }
}