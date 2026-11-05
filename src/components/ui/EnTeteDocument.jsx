import { useClinique } from '../../lib/clinique'
import { aujourdhui } from '../../lib/format'

// En-tête des documents imprimés : logo et identité de la clinique à gauche,
// type de document et informations complémentaires à droite.
export default function EnTeteDocument({ titre, children }) {
  const { clinique } = useClinique()
  const contacts = [clinique.telephone && `Tél. ${clinique.telephone}`, clinique.email].filter(Boolean).join(' • ')

  return (
    <div className="flex justify-between items-start gap-6 border-b-2 border-brand-600 pb-4 [print-color-adjust:exact]">
      <div className="flex items-start gap-4">
        <img src="/logo.jpeg" alt="" className="w-20 h-20 object-contain shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-brand-800">{clinique.nom}</h1>
          {clinique.sous_titre && <p className="text-xs text-slate-600">{clinique.sous_titre}</p>}
          {clinique.adresse && <p className="text-xs text-slate-600">{clinique.adresse}</p>}
          {contacts && <p className="text-xs text-slate-600">{contacts}</p>}
        </div>
      </div>
      <div className="text-right text-xs text-slate-600 shrink-0">
        {titre && <div className="text-sm font-bold text-brand-800 uppercase tracking-wide">{titre}</div>}
        {children}
        <div>Imprimé le {aujourdhui()}</div>
      </div>
    </div>
  )
}

// Bas des documents : slogan de la clinique et mention libre (horaires, agrément…)
export function PiedDocument() {
  const { clinique } = useClinique()
  if (!clinique.slogan && !clinique.mention_documents) return null
  return (
    <div className="pt-6 mt-6 border-t border-slate-200 text-center space-y-1 [print-color-adjust:exact]">
      {clinique.slogan && <p className="text-xs italic font-medium text-brand-700">« {clinique.slogan} »</p>}
      {clinique.mention_documents && <p className="text-[11px] text-slate-500 whitespace-pre-line">{clinique.mention_documents}</p>}
    </div>
  )
}
