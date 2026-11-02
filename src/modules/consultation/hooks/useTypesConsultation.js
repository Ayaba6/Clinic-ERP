import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

// Types de consultation = tarifs de type « consultation » (hors CPN,
// facturée par le module Maternité). Le type choisi est celui facturé.
export function useTypesConsultation() {
  const [types, setTypes] = useState([])
  useEffect(() => {
    supabase
      .from('tarifs')
      .select('id, code, libelle, prix')
      .eq('type_acte', 'consultation')
      .eq('actif', true)
      .neq('code', 'CPN')
      .order('libelle')
      .then(({ data }) => setTypes(data || []))
  }, [])
  return types
}

// Type proposé par défaut selon le rôle du praticien
export function typeParDefaut(types, role) {
  const code = role === 'sage_femme' ? 'CONSULT_SF' : 'CONSULTATION'
  return types.find(t => t.code === code)?.id || types[0]?.id || ''
}

// Ouvre une consultation sans passer par la réception : le patient est pris
// en charge directement (ou son passage en attente est repris).
export async function ouvrirConsultation({ patientId, praticienId, tarifId, motif }) {
  const { data: existant } = await supabase
    .from('appointments')
    .select('id, statut, doctor_id')
    .eq('patient_id', patientId)
    .in('statut', ['en_attente', 'en_consultation'])
    .maybeSingle()

  if (existant) {
    if (existant.statut === 'en_consultation' && existant.doctor_id !== praticienId) {
      return { success: false, error: 'Ce patient est déjà en consultation avec un autre praticien.' }
    }
    const { error } = await supabase
      .from('appointments')
      .update({ statut: 'en_consultation', doctor_id: praticienId, tarif_id: tarifId || null })
      .eq('id', existant.id)
    if (error) return { success: false, error: error.message }
    return { success: true, id: existant.id }
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert([{ patient_id: patientId, doctor_id: praticienId, tarif_id: tarifId || null, motif: motif?.trim() || null, statut: 'en_consultation' }])
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, id: data.id }
}
