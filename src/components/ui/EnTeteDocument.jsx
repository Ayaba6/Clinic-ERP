import { useClinique } from '../../lib/clinique'
import { aujourdhui } from '../../lib/format'

// En-tête des documents imprimés : identité de la clinique à gauche,
// type de document et informations complémentaires à droite.
export default function EnTeteDocument({ titre, children }) {
  const { clinique } = useClinique()
  const contacts = [clinique.telephone && `Tél. ${clinique.telephone}`, clinique.email].filter(Boolean).join(' • ')

  return (
    <div className="flex justify-between items-start gap-6 border-b border-slate-300 pb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{clinique.nom}</h1>
        {clinique.sous_titre && <p className="text-xs text-slate-600">{clinique.sous_titre}</p>}
        {clinique.adresse && <p className="text-xs text-slate-600">{clinique.adresse}</p>}
        {contacts && <p className="text-xs text-slate-600">{contacts}</p>}
      </div>
      <div className="text-right text-xs text-slate-600 shrink-0">
        {titre && <div className="text-sm font-bold text-slate-900">{titre}</div>}
        {children}
        <div>Imprimé le {aujourdhui()}</div>
      </div>
    </div>
  )
}

// Mention libre en bas des documents (ex. horaires, numéro d'agrément)
export function PiedDocument() {
  const { clinique } = useClinique()
  if (!clinique.mention_documents) return null
  return <p className="pt-6 text-center text-[11px] text-slate-500 whitespace-pre-line">{clinique.mention_documents}</p>
}
