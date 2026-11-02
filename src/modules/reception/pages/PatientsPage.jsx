import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../hooks/usePatients'
import { useAuth } from '../../../context/AuthContext'
import PatientFormModal from '../components/PatientFormModal'
import { getAge } from '../../../lib/format'
import { Search, UserPlus, Phone, Heart, Loader2 } from 'lucide-react'

export default function PatientsPage() {
  const { patients, loading, addPatient } = usePatients()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canCreate = ['admin', 'reception'].includes(profile?.role)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filtrer les patients par nom, prénom, code ou téléphone (champs vides tolérés)
  const term = searchTerm.trim().toLowerCase()
  const filteredPatients = patients.filter(p =>
    [p.nom, p.prenom, p.code_patient, p.telephone].some(v => (v || '').toLowerCase().includes(term))
  )

  return (
    <div className="space-y-6">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dossiers Patients (DPI)</h2>
          <p className="text-sm text-slate-500">Gérez l'enregistrement et le suivi des patients de la clinique.</p>
        </div>
        {canCreate && <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
          <span>Nouveau Patient</span>
        </button>}
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par code, nom, prénom ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-sm"
        />
      </div>

      {/* Liste des patients (Tableau) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Chargement des patients...</span>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Aucun patient trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-4 px-6">Code</th>
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-6">Genre / Âge</th>
                  <th className="py-4 px-6">Téléphone</th>
                  <th className="py-4 px-6">Groupe Sanguin</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-mono font-medium text-blue-600">{patient.code_patient}</td>
                    <td className="py-4 px-6 font-medium text-slate-800">{patient.nom} {patient.prenom}</td>
                    <td className="py-4 px-6 text-slate-600" title={patient.date_naissance}>
                      {patient.genre} • {getAge(patient.date_naissance) ?? '–'} ans
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{patient.telephone || 'N/C'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <Heart className="w-3 h-3" />
                        {patient.groupe_sanguin || 'N/C'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition"
                      >
                        Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL : Nouveau Patient */}
      {isModalOpen && (
        <PatientFormModal
          title="Enregistrer un patient"
          subtitle="Remplissez les informations administratives du patient."
          onSubmit={addPatient}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
