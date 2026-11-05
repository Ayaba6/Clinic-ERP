import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useStaff } from '../hooks/useStaff'
import CreateStaffModal from '../components/CreateStaffModal'
import { ROLES, getRole } from '../../../lib/roles'
import { Users, Shield, Stethoscope, Pill, Activity, CreditCard, UserCog, Loader2, Search, UserPlus, HeartPulse, Baby } from 'lucide-react'

const ROLE_ICONS = {
  admin: Shield,
  reception: Users,
  medecin: Stethoscope,
  sage_femme: Baby,
  infirmier: HeartPulse,
  pharmacien: Pill,
  chirurgien: Activity,
  caisse: CreditCard,
}

export default function StaffManagementPage() {
  const { profile } = useAuth()
  const { staffList, loading, updateStaffRole, createStaff } = useStaff()
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [roleError, setRoleError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId)
    setRoleError(null)
    const result = await updateStaffRole(userId, newRole)
    if (!result.success) setRoleError(result.error)
    setUpdatingId(null)
  }

  const term = searchTerm.trim().toLowerCase()
  const filteredStaff = staffList.filter(staff =>
    [staff.nom, staff.prenom, staff.role, getRole(staff.role).label, staff.specialite].some(v => (v || '').toLowerCase().includes(term))
  )

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion du Personnel & Rôles (RBAC)</h2>
          <p className="text-sm text-slate-500">Créez les comptes des collaborateurs et attribuez leurs permissions d'accès.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full text-xs font-semibold">
            <UserCog className="w-4 h-4" />
            <span>{staffList.length} Membre(s) enregistrés</span>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nouveau membre</span>
          </button>
        </div>
      </div>

      {roleError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          Impossible de modifier le rôle : {roleError}
        </div>
      )}

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, prénom, rôle ou spécialité..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-sm"
        />
      </div>

      {/* Tableau du personnel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <span>Chargement des collaborateurs...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Aucun membre du personnel trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-4 px-6">Collaborateur</th>
                  <th className="py-4 px-6">Spécialité</th>
                  <th className="py-4 px-6">Téléphone</th>
                  <th className="py-4 px-6">Rôle Actuel (RBAC)</th>
                  <th className="py-4 px-6 text-right">Modifier le Rôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStaff.map((staff) => {
                  const role = getRole(staff.role)
                  const RoleIcon = ROLE_ICONS[staff.role] || Shield
                  const isMe = staff.id === profile?.id

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-800">
                          {staff.nom} {staff.prenom}
                          {isMe && <span className="ml-2 text-xs font-medium text-brand-600">(vous)</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">ID: {staff.id.slice(0, 8)}...</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {staff.specialite || <span className="text-slate-400 italic">Non spécifiée</span>}
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {staff.telephone || <span className="text-slate-400 italic">N/C</span>}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${role.color}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {role.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          {updatingId === staff.id && <Loader2 className="w-4 h-4 animate-spin text-brand-600" />}
                          <select
                            value={staff.role}
                            // Un admin ne peut pas retirer ses propres droits par erreur
                            disabled={updatingId === staff.id || isMe}
                            title={isMe ? 'Vous ne pouvez pas modifier votre propre rôle' : undefined}
                            onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {ROLES.map(r => (
                              <option key={r.key} value={r.key}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateStaffModal
          onSubmit={createStaff}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  )
}
