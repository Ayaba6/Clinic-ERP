import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { formatPersonne } from '../../../lib/format'

export const MODES_PAIEMENT = [
  { key: 'especes', label: 'Espèces' },
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'moov_money', label: 'Moov Money' },
  { key: 'carte', label: 'Carte bancaire' },
  { key: 'assurance', label: 'Assurance / prise en charge' },
  { key: 'autre', label: 'Autre' },
]

export const labelMode = (key) => MODES_PAIEMENT.find(m => m.key === key)?.label || key || '–'

const FACTURE_SELECT = '*, patient:patients(id, code_patient, nom, prenom, telephone)'

// Liste des factures.
// vue « a_encaisser » : en attente et partiellement payées (temps réel)
// vue « toutes » : toutes les factures depuis `depuisJours` jours
export function useFactures(vue, depuisJours = 30) {
  const [factures, setFactures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFactures = useCallback(async () => {
    let query = supabase.from('factures').select(FACTURE_SELECT)
    if (vue === 'a_encaisser') {
      query = query.in('statut', ['en_attente', 'partielle']).order('created_at', { ascending: true })
    } else {
      const depuis = new Date()
      depuis.setHours(0, 0, 0, 0)
      depuis.setDate(depuis.getDate() - depuisJours)
      query = query.gte('created_at', depuis.toISOString()).order('created_at', { ascending: false }).limit(500)
    }
    const { data, error } = await query
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setFactures(data || [])
    }
    setLoading(false)
  }, [vue, depuisJours])

  useEffect(() => {
    fetchFactures()

    const channel = supabase
      .channel(`factures-${vue}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'factures' }, () => fetchFactures())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFactures, vue])

  return { factures, loading, error, fetchFactures }
}

// Détail d'une facture : lignes, paiements et opérations
export function useFacture(factureId) {
  const [facture, setFacture] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFacture = useCallback(async () => {
    const { data, error } = await supabase
      .from('factures')
      .select(`${FACTURE_SELECT}, lignes_facture(*), paiements(*, caissier:profiles(nom, prenom))`)
      .eq('id', factureId)
      .single()
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      data.lignes_facture.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      data.paiements.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      setFacture(data)
    }
    setLoading(false)
  }, [factureId])

  useEffect(() => {
    fetchFacture()
  }, [fetchFacture])

  const run = async (promise) => {
    const { data, error } = await promise
    if (error) return { success: false, error: error.message }
    await fetchFacture()
    return { success: true, data }
  }

  const addLigne = ({ tarif, description, type_acte, quantite, prix_unitaire }) => run(
    supabase.from('lignes_facture').insert([{
      facture_id: factureId,
      tarif_id: tarif?.id || null,
      type_acte: tarif?.type_acte || type_acte || 'autre',
      description: tarif?.libelle || description,
      quantite: Number(quantite),
      prix_unitaire: Number(tarif ? tarif.prix : prix_unitaire),
      // Calculé par la base (trigger) ; requis par la contrainte NOT NULL
      montant_total: Number(quantite) * Number(tarif ? tarif.prix : prix_unitaire),
    }])
  )

  const removeLigne = (ligneId) => run(supabase.from('lignes_facture').delete().eq('id', ligneId))

  const encaisser = ({ montant, mode, reference }) => run(
    supabase.rpc('encaisser', {
      p_facture_id: factureId,
      p_montant: Number(montant),
      p_mode: mode,
      p_reference: reference || null,
    })
  )

  const annuler = (motif) => run(supabase.rpc('annuler_facture', { p_facture_id: factureId, p_motif: motif }))

  return { facture, loading, error, fetchFacture, addLigne, removeLigne, encaisser, annuler }
}

// Création d'une facture vide pour un patient (actes ajoutés ensuite)
export async function creerFacture(patientId) {
  const { data, error } = await supabase
    .from('factures')
    .insert([{ patient_id: patientId, statut: 'en_attente', montant_total: 0 }])
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, id: data.id }
}

// Recherche de patients pour une nouvelle facture
export async function rechercherPatients(term) {
  // Caractères réservés de la syntaxe de filtre retirés
  const t = term.replace(/[,()%*\\]/g, ' ').trim()
  if (t.length < 2) return []
  const { data } = await supabase
    .from('patients')
    .select('id, code_patient, nom, prenom, telephone')
    .or(`nom.ilike.%${t}%,prenom.ilike.%${t}%,code_patient.ilike.%${t}%,telephone.ilike.%${t}%`)
    .order('nom')
    .limit(10)
  return data || []
}

// Grille tarifaire
export function useTarifs() {
  const [tarifs, setTarifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTarifs = useCallback(async () => {
    const { data, error } = await supabase.from('tarifs').select('*').order('libelle')
    if (error) setError(error.message)
    else {
      setError(null)
      setTarifs(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTarifs()
  }, [fetchTarifs])

  const saveTarif = async (values, id) => {
    const payload = {
      code: values.code.trim().toUpperCase() || null,
      libelle: values.libelle.trim(),
      type_acte: values.type_acte,
      prix: Number(values.prix),
      actif: values.actif,
    }
    const { error } = id
      ? await supabase.from('tarifs').update(payload).eq('id', id)
      : await supabase.from('tarifs').insert([payload])
    if (error) {
      const msg = error.message.includes('tarifs_code_key') ? 'Ce code est déjà utilisé.' : error.message
      return { success: false, error: msg }
    }
    await fetchTarifs()
    return { success: true }
  }

  return { tarifs, loading, error, saveTarif }
}

// Journal de caisse : paiements d'une journée (AAAA-MM-JJ, heure locale)
export function useJournal(jour) {
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const debut = new Date(`${jour}T00:00:00`)
    const fin = new Date(debut)
    fin.setDate(fin.getDate() + 1)

    supabase
      .from('paiements')
      .select('*, caissier:profiles(nom, prenom), facture:factures(numero, patient:patients(nom, prenom, code_patient))')
      .gte('created_at', debut.toISOString())
      .lt('created_at', fin.toISOString())
      .order('created_at')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else {
          setError(null)
          setPaiements(data || [])
        }
        setLoading(false)
      })
  }, [jour])

  return { paiements, loading, error }
}

// Totaux par mode et par caissier, partagés avec l'impression
export function totauxJournal(paiements) {
  const parMode = MODES_PAIEMENT
    .map(m => ({ ...m, total: paiements.filter(p => p.mode === m.key).reduce((s, p) => s + Number(p.montant), 0) }))
    .filter(m => m.total > 0)
  const caissiers = {}
  for (const p of paiements) {
    const nom = formatPersonne(p.caissier)
    caissiers[nom] = (caissiers[nom] || 0) + Number(p.montant)
  }
  const total = paiements.reduce((s, p) => s + Number(p.montant), 0)
  return { parMode, parCaissier: Object.entries(caissiers), total }
}
