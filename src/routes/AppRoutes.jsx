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
import CaissePage from '../modules/caisse/pages/CaissePage'
import BlocPage from '../modules/bloc/pages/BlocPage'
import MaternitePage from '../modules/maternite/pages/MaternitePage'
import GrossessePage from '../modules/maternite/pages/GrossessePage'
import SalleNaissancePage from '../modules/naissance/pages/SalleNaissancePage'
import AccouchementPage from '../modules/naissance/pages/AccouchementPage'
import RendezVousPage from '../modules/rendezvous/pages/RendezVousPage'
import DashboardAdmin from '../modules/admin/pages/DashboardAdmin'
import StaffManagementPage from '../modules/admin/pages/StaffManagementPage'
import ParametresPage from '../modules/admin/pages/ParametresPage'

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
              <ProtectedRoute allowedRoles={['admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien', 'pharmacien', 'caisse']}>
                <PatientDossierPage />
              </ProtectedRoute>
            }
          />

          {/* Rendez-vous */}
          <Route
            path="/rendez-vous"
            element={
              <ProtectedRoute allowedRoles={['admin', 'reception', 'medecin', 'sage_femme', 'infirmier', 'chirurgien']}>
                <RendezVousPage />
              </ProtectedRoute>
            }
          />

          {/* Module Maternité */}
          <Route
            path="/maternite"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien']}>
                <MaternitePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maternite/grossesses/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien']}>
                <GrossessePage />
              </ProtectedRoute>
            }
          />

          {/* Salle de naissance */}
          <Route
            path="/naissance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien']}>
                <SalleNaissancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/naissance/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin', 'sage_femme', 'infirmier', 'chirurgien']}>
                <AccouchementPage />
              </ProtectedRoute>
            }
          />

          {/* Module Consultation */}
          <Route
            path="/consultation"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin', 'sage_femme']}>
                <QueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultation/:appointmentId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'medecin', 'sage_femme']}>
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
            path="/bloc"
            element={
              <ProtectedRoute allowedRoles={['admin', 'chirurgien', 'infirmier']}>
                <BlocPage />
              </ProtectedRoute>
            }
          />

          {/* Module Caisse */}
          <Route
            path="/caisse"
            element={
              <ProtectedRoute allowedRoles={['admin', 'caisse']}>
                <CaissePage />
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
          <Route
            path="/admin/parametres"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ParametresPage />
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