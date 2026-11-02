import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { joursRestants } from '../../../lib/format'

// Seuil d'alerte de péremption (en jours)
export const ALERTE_PEREMPTION_JOURS = 90

// État du stock d'un médicament : rupture, bas, ok
export function etatStock(med) {
  if (med.stock_actuel <= 0) return 'rupture'
  if (med.stock_actuel <= med.seuil_alerte) return 'bas'
  return 'ok'
}

// État de péremption : perime, proche, ok, inconnu
export function etatPeremption(med) {
  const jours = joursRestants(med.date_peremption)
  if (jours === null) return 'inconnu'
  if (jours < 0) return 'perime'
  if (jours <= ALERTE_PEREMPTION_JOURS) return 'proche'
  return 'ok'
}

// Ordonnances à délivrer (statut « prescrit ») ou délivrées (30 derniers jours)
export function useOrdonnances(statut) {
  const [ordonnances, setOrdonnances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrdonnances = useCallback(async () => {
    const { data, error } = await supabase.rpc('ordonnances_pharmacie', { p_statut: statut })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setOrdonnances(data || [])
    }
    setLoading(false)
  }, [statut])

  useEffect(() => {
    fetchOrdonnances()

    // Temps réel : nouvelle ordonnance ou délivrance depuis un autre poste
    const channel = supabase
      .channel(`ordonnances-${statut}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prescriptions' }, () => fetchOrdonnances())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrdonnances, statut])

  const delivrer = async (prescriptionIds) => {
    const { error } = await supabase.rpc('delivrer_prescriptions', { p_ids: prescriptionIds })
    if (error) return { success: false, error: error.message }
    await fetchOrdonnances()
    return { success: true }
  }

  return { ordonnances, loading, error, fetchOrdonnances, delivrer }
}

// Catalogue des médicaments et opérations de stock
export function useMedicaments() {
  const [medicaments, setMedicaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMedicaments = useCallback(async () => {
    const { data, error } = await supabase
      .from('medicaments')
      .select('*')
      .order('nom')
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setMedicaments(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMedicaments()
  }, [fetchMedicaments])

  // Création / modification de la fiche (le stock ne se modifie que par
  // une entrée ou un ajustement, pour garder l'historique)
  const saveMedicament = async (values, id) => {
    const payload = {
      nom: values.nom.trim(),
      dosage: values.dosage.trim() || null,
      forme: values.forme.trim() || null,
      code_codebarre: values.code_codebarre.trim() || null,
      prix_vente: Number(values.prix_vente),
      seuil_alerte: Number(values.seuil_alerte),
      date_peremption: values.date_peremption || null,
    }
    const query = id
      ? supabase.from('medicaments').update(payload).eq('id', id)
      : supabase.from('medicaments').insert([payload])
    const { error } = await query
    if (error) {
      const msg = error.message.includes('medicaments_code_codebarre_key')
        ? 'Ce code-barres est déjà utilisé par un autre médicament.'
        : error.message
      return { success: false, error: msg }
    }
    await fetchMedicaments()
    return { success: true }
  }

  const entreeStock = async (medicamentId, values) => {
    const { error } = await supabase.rpc('entree_stock', {
      p_medicament_id: medicamentId,
      p_quantite: Number(values.quantite),
      p_fournisseur: values.fournisseur,
      p_numero_lot: values.numero_lot,
      p_date_peremption: values.date_peremption || null,
      p_motif: values.motif,
    })
    if (error) return { success: false, error: error.message }
    await fetchMedicaments()
    return { success: true }
  }

  const ajusterStock = async (medicamentId, values) => {
    const { error } = await supabase.rpc('ajuster_stock', {
      p_medicament_id: medicamentId,
      p_nouveau_stock: Number(values.nouveau_stock),
      p_motif: values.motif,
    })
    if (error) return { success: false, error: error.message }
    await fetchMedicaments()
    return { success: true }
  }

  return { medicaments, loading, error, fetchMedicaments, saveMedicament, entreeStock, ajusterStock }
}

// Historique des mouvements de stock (200 derniers)
export function useMouvements() {
  const [mouvements, setMouvements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('mouvements_stock')
      .select('*, medicament:medicaments(nom, dosage), auteur:profiles(nom, prenom)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setMouvements(data || [])
        setLoading(false)
      })
  }, [])

  return { mouvements, loading, error }
}
