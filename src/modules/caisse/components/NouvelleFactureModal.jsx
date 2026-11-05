import { useEffect, useState } from 'react'
import { creerFacture, rechercherPatients } from '../hooks/useCaisse'
import { X, Search, Loader2, ShieldAlert } from 'lucide-react'

// Facture manuelle (acte infirmier, hospitalisation…) : choix du patient,
// puis ouverture de la facture pour y ajouter les actes.
export default function NouvelleFactureModal({ onCreated, onClose }) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      const data = await rechercherPatients(term)
      if (!cancelled) setResults(data)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [term])

  const choisir = async (patient) => {
    setBusyId(patient.id)
    setError(null)
    const result = await creerFacture(patient.id)
    setBusyId(null)
    if (result.success) onCreated(result.id)
    else setError(result.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 relative max-h-[92dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-800 mb-1">Nouvelle facture</h3>
        <p className="text-xs text-slate-500 mb-5">
          Les consultations et médicaments délivrés sont facturés automatiquement. Utilisez ceci pour les autres actes.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-xl">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nom, code patient ou téléphone..."
            className="w-full outline-none text-sm"
          />
        </div>

        <ul className="mt-3 divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {term.trim().length >= 2 && results.length === 0 && (
            <li className="py-6 text-center text-sm text-slate-400">Aucun patient trouvé.</li>
          )}
          {results.map(p => (
            <li key={p.id}>
              <button
                onClick={() => choisir(p)}
                disabled={!!busyId}
                className="w-full flex items-center justify-between gap-2 px-2 py-3 text-left text-sm hover:bg-slate-50 rounded-lg disabled:opacity-50"
              >
                <span>
                  <span className="font-medium text-slate-800">{p.nom} {p.prenom}</span>
                  <span className="ml-2 font-mono text-xs text-brand-600">{p.code_patient}</span>
                </span>
                {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin text-brand-600" /> : <span className="text-xs text-slate-400">{p.telephone}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
