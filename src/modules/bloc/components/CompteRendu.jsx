import { labelAnesthesie } from '../hooks/useBloc'
import { aujourdhui, getAge, formatDateTime, formatPersonne } from '../../../lib/format'

// Compte rendu opératoire imprimable
export default function CompteRendu({ intervention: i }) {
  const p = i.patient || {}
  return (
    <div className="max-w-2xl mx-auto text-slate-900 text-sm space-y-6">
      <div className="flex justify-between items-start border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-xl font-bold">Clinic ERP</h1>
          <p className="text-xs text-slate-600">Bloc opératoire</p>
        </div>
        <div className="text-right text-xs text-slate-600">Imprimé le {aujourdhui()}</div>
      </div>

      <h2 className="text-lg font-bold tracking-wide text-center">COMPTE RENDU OPÉRATOIRE</h2>

      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
        <div><b>Patient : </b>{p.nom} {p.prenom} ({p.code_patient})</div>
        <div><b>Âge / sexe : </b>{getAge(p.date_naissance) ?? '–'} ans / {p.genre}</div>
        <div><b>Intervention : </b>{i.libelle_intervention}</div>
        <div><b>Salle : </b>{i.salle_operation}</div>
        <div><b>Début : </b>{formatDateTime(i.debut_reel)}</div>
        <div><b>Fin : </b>{formatDateTime(i.fin_reel)}</div>
        <div><b>Chirurgien : </b>{formatPersonne(i.chirurgien, 'Dr ')}</div>
        <div><b>Anesthésie : </b>{labelAnesthesie(i.type_anesthesie)}</div>
        {i.equipe && <div className="col-span-2"><b>Équipe : </b>{i.equipe}</div>}
      </div>

      {i.notes_preop && (
        <div>
          <h3 className="font-bold mb-1">Notes préopératoires</h3>
          <p className="whitespace-pre-line">{i.notes_preop}</p>
        </div>
      )}

      <div>
        <h3 className="font-bold mb-1">Compte rendu</h3>
        <p className="whitespace-pre-line leading-relaxed">{i.rapport_operatoire}</p>
      </div>

      <div>
        <h3 className="font-bold mb-1">Complications</h3>
        <p>{i.complications || 'Aucune'}</p>
      </div>

      <div className="pt-12 text-right text-xs text-slate-600">Signature du chirurgien</div>
    </div>
  )
}
