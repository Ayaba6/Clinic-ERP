import { useClinique } from '../../lib/clinique'

// Logo de la clinique dans une pastille blanche (le fichier a un fond blanc)
export default function LogoPastille({ className = 'w-12 h-12' }) {
  const { clinique } = useClinique()
  return (
    <div className={`${className} shrink-0 rounded-full bg-white ring-2 ring-white/30 shadow-md overflow-hidden flex items-center justify-center`}>
      <img src="/logo.jpeg" alt={clinique.nom} className="w-full h-full object-contain scale-110" />
    </div>
  )
}
