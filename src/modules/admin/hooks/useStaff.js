import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export function useStaff() {
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStaffList(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const updateStaffRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setStaffList(list => list.map(staff =>
        staff.id === userId ? { ...staff, role: newRole } : staff
      ))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Création d'un compte : passe par l'Edge Function « create-staff »
  // (supabase/functions/create-staff), seule à détenir la clé service_role.
  const createStaff = async (values) => {
    const { data, error } = await supabase.functions.invoke('create-staff', { body: values })

    if (error) {
      let message = error.message
      try {
        // Message d'erreur renvoyé par la fonction (ex. « Un compte existe déjà… »)
        const body = await error.context.json()
        if (body?.error) message = body.error
      } catch {
        if (error.name === 'FunctionsFetchError' || error.context?.status === 404) {
          message = 'La fonction « create-staff » n\'est pas déployée sur Supabase.'
        }
      }
      return { success: false, error: message }
    }

    setStaffList(list => [data.profile, ...list])
    return { success: true }
  }

  return { staffList, loading, error, fetchStaff, updateStaffRole, createStaff }
}