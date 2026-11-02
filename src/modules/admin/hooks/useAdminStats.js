import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export function useAdminStats() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalStaff: 0,
    lowStockCount: 0,
    totalRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)

        // Calcul côté base par la fonction stats_admin() (voir supabase/securite.sql) :
        // une seule requête, sans télécharger les tables médicaments et factures.
        const { data, error } = await supabase.rpc('stats_admin')
        if (error) throw error

        setStats({
          totalPatients: data?.totalPatients || 0,
          totalStaff: data?.totalStaff || 0,
          lowStockCount: data?.lowStockCount || 0,
          totalRevenue: Number(data?.totalRevenue) || 0,
        })
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques admin :', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading }
}
