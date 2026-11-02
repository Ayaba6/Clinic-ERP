import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { CliniqueContext, CLINIQUE_DEFAUT } from '../lib/clinique'

// Charge les paramètres de la clinique (nom, adresse…) une fois au démarrage
export const CliniqueProvider = ({ children }) => {
  const [clinique, setClinique] = useState(CLINIQUE_DEFAUT)

  useEffect(() => {
    supabase
      .from('parametres_clinique')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setClinique({ ...CLINIQUE_DEFAUT, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)) })
      })
  }, [])

  // Titre de l'onglet du navigateur
  useEffect(() => {
    document.title = clinique.nom
  }, [clinique.nom])

  return (
    <CliniqueContext.Provider value={{ clinique, setClinique }}>
      {children}
    </CliniqueContext.Provider>
  )
}
