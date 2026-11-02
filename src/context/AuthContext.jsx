import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Identifiant de l'utilisateur dont le profil est déjà chargé
  const loadedUserId = useRef(null)

  useEffect(() => {
    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Erreur lors du chargement du profil utilisateur :', error.message)
        setProfile(null)
      } else {
        setProfile(data)
      }
      loadedUserId.current = userId
      setLoading(false)
    }

    // Écoute la session initiale (INITIAL_SESSION) puis les changements d'auth.
    // Pas d'await ici : Supabase déconseille d'appeler son client dans ce callback
    // de façon bloquante, on reporte donc le chargement du profil.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (!sessionUser) {
        loadedUserId.current = null
        setProfile(null)
        setLoading(false)
        return
      }

      // Renouvellement de jeton ou retour sur l'onglet : même utilisateur,
      // on ne recharge rien pour ne pas démonter l'application.
      if (loadedUserId.current === sessionUser.id) return

      setLoading(true)
      setTimeout(() => fetchProfile(sessionUser.id), 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const logout = () => {
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
