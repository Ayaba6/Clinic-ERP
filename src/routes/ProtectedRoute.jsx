import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getHomePath } from '../lib/roles'

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, logout } = useAuth()

  // Afficher un loader pendant la vérification de la session
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">
          Chargement de l'application...
        </div>
      </div>
    )
  }

  // Si non connecté, redirection vers la page de connexion
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  // Si le rôle de l'utilisateur n'est pas autorisé pour cette route
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center px-4">
        <h1 className="text-3xl font-bold text-red-600 mb-2">Accès Non Autorisé</h1>
        <p className="text-gray-600 mb-4">
          Vous n'avez pas les droits nécessaires ({profile.role}) pour accéder à cette section.
        </p>
        <div className="flex gap-3">
          <Link
            to={getHomePath(profile.role)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow"
          >
            Retour à mon espace
          </Link>
          <button
            onClick={logout}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition"
          >
            Changer de compte
          </button>
        </div>
      </div>
    )
  }

  return children
}