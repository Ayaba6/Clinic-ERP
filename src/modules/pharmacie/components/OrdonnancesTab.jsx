import { useState } from 'react'
import { useOrdonnances } from '../hooks/usePharmacie'
import StatutBadge from '../../../components/ui/StatutBadge'
import { formatDateTime, formatMontant, formatPersonne } from '../../../lib/format'
import { Loader2, AlertTriangle, PackageCheck, Search } from 'lucide-react'

export default function OrdonnancesTab({ onDelivered }) {
  const [vue, setVue] = useState('prescrit')
  const [searchTerm, setSearchTerm] = useState('')
  const { ordonnances, loading, error, delivrer } = useOrdonnances(vue)

  const term = searchTerm.trim().toLowerCase()
  const filtered = ordonnances.filter(o =>
    [o.patient?.nom, o.patient?.prenom, o.patient?.code_patient].some(v => (v || '').toLowerCase().includes(term))
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-sm">
          {[['prescrit', 'À délivrer'], ['delivre', 'Délivrées (30 j)']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setVue(key)}
              className={`px-4 py-1.5 rounded-lg font-medium transition ${vue === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 sm:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Patient ou code..."
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Chargement des ordonnances...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-sm text-slate-500">
          {vue === 'prescrit'
            ? 'Aucune ordonnance en attente. Les nouvelles apparaissent automatiquement.'
            : 'Aucune ordonnance délivrée ces 30 derniers jours.'}
        </div>
      ) : (
        filtered.map(o => (
          <OrdonnanceCard
            key={o.consultation_id}
            ordonnance={o}
            readOnly={vue !== 'prescrit'}
            onDeliver={async (ids) => {
              const result = await delivrer(ids)
              if (result.success) onDelivered?.()
              return result
            }}
          />
        ))
      )}
    </div>
  )
}

function OrdonnanceCard({ ordonnance: o, readOnly, onDeliver }) {
  const lignesAServir = (o.lignes || []).filter(l => l.statut === 'prescrit')
  // Par défaut : toutes les lignes dont le stock est suffisant
  const [selected, setSelected] = useState(() =>
    new Set(lignesAServir.filter(l => l.medicament.stock_actuel >= l.quantite).map(l => l.id))
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const toggle = (id) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const total = (o.lignes || [])
    .filter(l => readOnly ? l.statut === 'delivre' : selected.has(l.id))
    .reduce((sum, l) => sum + Number(l.medicament.prix_vente || 0) * l.quantite, 0)

  const handleDeliver = async () => {
    setSubmitting(true)
    setError(null)
    const result = await onDeliver([...selected])
    setSubmitting(false)
    if (result.success) {
      // Les lignes restantes (stock insuffisant) restent à cocher manuellement
      setSelected(new Set())
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-800">{o.patient?.nom} {o.patient?.prenom}</span>
            <span className="font-mono text-xs text-blue-600">{o.patient?.code_patient}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {formatDateTime(o.created_at)} • Prescrit par {formatPersonne(o.doctor, 'Dr ')}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 uppercase font-semibold">{readOnly ? 'Montant délivré' : 'Montant sélection'}</div>
          <div className="font-bold text-slate-800">{formatMontant(total)}</div>
        </div>
      </div>

      {o.patient?.allergies && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span><b>Allergies : </b>{o.patient.allergies}</span>
        </div>
      )}

      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
        {(o.lignes || []).map(l => {
          const med = l.medicament
          const enAttente = l.statut === 'prescrit'
          const stockOk = med.stock_actuel >= l.quantite
          return (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              {!readOnly && (
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  disabled={!enAttente || !stockOk}
                  onChange={() => toggle(l.id)}
                  className="w-4 h-4 accent-blue-600"
                />
              )}
              <div className="flex-1">
                <div>
                  <span className="font-semibold text-slate-800">{med.nom} {med.dosage}</span>
                  {med.forme && <span className="text-slate-500"> ({med.forme})</span>}
                  <span className="text-slate-600"> × {l.quantite}</span>
                </div>
                <div className="text-xs text-slate-500">{l.posologie}</div>
              </div>
              <div className="text-right space-y-1">
                <StatutBadge statut={l.statut} />
                {enAttente && (
                  <div className={`text-xs ${stockOk ? 'text-slate-500' : 'text-red-600 font-semibold'}`}>
                    Stock : {med.stock_actuel}{!stockOk && ' — insuffisant'}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

      {!readOnly && lignesAServir.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDeliver}
            disabled={submitting || selected.size === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
            <span>Délivrer {selected.size > 0 ? `(${selected.size})` : ''}</span>
          </button>
        </div>
      )}
    </div>
  )
}
