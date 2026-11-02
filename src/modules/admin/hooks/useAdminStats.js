import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'

// Indicateurs du tableau de bord, calculés par la fonction SQL tableau_de_bord()
// (voir supabase/tableau_de_bord.sql) pour les `jours` derniers jours.
export function useAdminStats(jours) {
  const [result, setResult] = useState({ jours: null, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    supabase.rpc('tableau_de_bord', { p_jours: jours }).then(({ data, error }) => {
      if (cancelled) return
      setResult(prev => ({
        jours,
        data: error ? prev.data : data,
        error: error ? error.message : null,
      }))
    })
    return () => {
      cancelled = true
    }
  }, [jours])

  const loading = result.jours !== jours
  return {
    data: result.data,
    error: result.error,
    // Premier chargement : rien à afficher encore
    initialLoading: loading && result.data === null,
    // Changement de période : l'ancien affichage reste visible, atténué
    refreshing: loading && result.data !== null,
  }
}
