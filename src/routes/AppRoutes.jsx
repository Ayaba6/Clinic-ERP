import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'
import { getHomePath } from '../lib/roles'
import LoginPage from '../modules/auth/pages/Login'
import Layout from '../components/layout/Layout'
import PatientsPage from '../modules/reception/pages/PatientsPage'
import PatientDossierPage from '../modules/reception/pages/PatientDossierPage'
import QueuePage from '../modules/consultation/pages/QueuePage'
import ConsultationPage from '../modules/consultation/pages/ConsultationPage'
import PharmaciePage from '../modules/pharmacie/pages/PharmaciePage'
import DashboardAdmin from '../modules/admin/pages/DashboardAdmin'
import StaffManagementPage from '../modules/admin/pages/StaffManagementPage'

// Adresse inconnue : espace du rôle si connecté, sinon page de connexion
const RedirectHome = () => {
  const { profile } = useAuth()
  return <Navigate to={profile ? getHomePath(profile.role) : '/login'} replace />
}

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route publique */}
        <Route path="/login" element={<LoginPage />} />

        {/* Routes protégées avec le Layout principal */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Module Réception */}
          <Route
            path="/reception"
            element={
              <ProtectedRoute allowedRoles={['admin', 'reception', 'infirmier']}>
                <PatientsPage />
              </ProtectedRoute>
            }
          />

          {/* Dossier patient : contenu filtré par rôle dans la page et par RLS */}
          <Route
            path="/patients/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'reception', 'medecin', 'infirmier', 'chirurgien', 'pharmacien', 'caisse']}>
                <PatientDossierPage />
              </ProtectedRoute>
            }
          />

          {/* Module Consultation */}
          <Route
            path="/consultation"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin']}>
                <QueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultation/:appointmentId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin']}>
                <ConsultationPage />
              </ProtectedRoute>
            }
          />

          {/* Module Pharmacie */}
          <Route
            path="/pharmacie"
            element={
              <ProtectedRoute allowedRoles={['admin', 'pharmacien']}>
                <PharmaciePage />
              </ProtectedRoute>
            }
          />

          {/* Module Bloc Opératoire */}
          <Route
            path="/bloc/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'chirurgien']}>
                <div className="text-2xl font-bold text-slate-800">Espace Bloc Opératoire</div>
              </ProtectedRoute>
            }
          />

          {/* Module Caisse */}
          <Route
            path="/caisse/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'caisse']}>
                <div className="text-2xl font-bold text-slate-800">Espace Caisse & Facturation</div>
              </ProtectedRoute>
            }
          />

          {/* Module Administration & Sous-modules */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <StaffManagementPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Redirection par défaut */}
        <Route path="*" element={<RedirectHome />} />
      </Routes>
    </BrowserRouter>
  )
}