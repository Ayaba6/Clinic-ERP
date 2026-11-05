import { createContext, useContext } from 'react'

// Valeurs utilisées tant que les paramètres ne sont pas chargés
// (ou si supabase/parametres.sql n'a pas encore été exécuté)
export const CLINIQUE_DEFAUT = {
  nom: 'Clinique Neematoullah',
  slogan: "Sauvons d'abord les vies, le reste viendra de lui-même",
  sous_titre: 'Clinique d\'accouchement — Médecine générale et gynécologie-obstétrique',
  adresse: 'Dassasgho, Arrondissement 12, Ouagadougou — Burkina Faso',
  telephone: '',
  email: '',
  mention_documents: '',
}

export const CliniqueContext = createContext({ clinique: CLINIQUE_DEFAUT, setClinique: () => {} })

// { clinique, setClinique }
export const useClinique = () => useContext(CliniqueContext)
