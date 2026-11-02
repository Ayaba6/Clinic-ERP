import { useClinique } from '../../../lib/clinique'
import { titreSoignant } from '../../../lib/roles'
import { labelMode } from '../hooks/useNaissance'
import EnTeteDocument, { PiedDocument } from '../../../components/ui/EnTeteDocument'
import { aujourdhui, formatDate, formatDateTime, formatPersonne } from '../../../lib/format'

const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// Certificat d'accouchement (à présenter à l'état civil pour la déclaration de naissance)
export function CertificatAccouchement({ accouchement: a, enfant: n }) {
  const { clinique } = useClinique()
  const m = a.patient
  return (
    <div className="max-w-2xl mx-auto text-slate-900 text-sm space-y-8">
      <EnTeteDocument titre="Maternité" />

      <h2 className="text-xl font-bold tracking-wide text-center">CERTIFICAT D'ACCOUCHEMENT</h2>

      <p className="leading-relaxed">
        Je soussigné(e), <b>{a.responsable ? formatPersonne(a.responsable, titreSoignant(a.responsable.role)) : '………………………………'}</b>,
        certifie que <b>Madame {m.nom} {m.prenom}</b>
        {m.date_naissance && <>, née le <b>{formatDate(m.date_naissance)}</b></>},
        a accouché à <b>{clinique.nom}</b>{clinique.adresse && <> ({clinique.adresse})</>},
        le <b>{formatDate(a.accouchement_le)}</b> à <b>{heure(a.accouchement_le)}</b>,
        d'un enfant <b>{n.vivant ? 'vivant' : 'mort-né'}</b> de sexe <b>{n.sexe === 'F' ? 'féminin' : 'masculin'}</b>.
      </p>

      <table className="w-full border border-slate-300">
        <tbody>
          <Ligne label="Nom et prénom de l'enfant" value={n.bebe ? `${n.bebe.nom} ${n.bebe.prenom}` : '–'} />
          <Ligne label="Date et heure de naissance" value={formatDateTime(a.accouchement_le)} />
          <Ligne label="Sexe" value={n.sexe === 'F' ? 'Féminin' : 'Masculin'} />
          <Ligne label="Poids" value={n.poids_g ? `${n.poids_g} g` : '–'} />
          <Ligne label="Taille" value={n.taille_cm ? `${n.taille_cm} cm` : '–'} />
          <Ligne label="Mode d'accouchement" value={labelMode(a.mode)} />
          {a.nouveau_nes.length > 1 && <Ligne label="Naissance multiple" value={`Enfant n° ${n.rang} sur ${a.nouveau_nes.length}`} />}
          <Ligne label="Mère" value={`${m.nom} ${m.prenom} (${m.code_patient})`} />
        </tbody>
      </table>

      <p className="text-xs text-slate-600">
        Certificat délivré pour servir et valoir ce que de droit, notamment pour la déclaration de la naissance à l'état civil.
      </p>

      <div className="pt-6 flex justify-between text-xs text-slate-600">
        <span>Fait à Ouagadougou, le {aujourdhui()}</span>
        <span>Signature et cachet</span>
      </div>
      <PiedDocument />
    </div>
  )
}

const Ligne = ({ label, value }) => (
  <tr className="border-b border-slate-200">
    <td className="py-1.5 px-3 font-semibold w-1/2 bg-slate-50">{label}</td>
    <td className="py-1.5 px-3">{value}</td>
  </tr>
)

// Registre mensuel des naissances
export function RegistreNaissances({ mois, naissances }) {
  const [y, m] = mois.split('-').map(Number)
  const libelleMois = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const vivants = naissances.filter(n => n.vivant).length

  return (
    <div className="text-slate-900 text-xs space-y-5">
      <EnTeteDocument titre="Registre des naissances">
        <div className="font-bold text-slate-900 capitalize">{libelleMois}</div>
      </EnTeteDocument>

      <p className="text-sm">
        <b>{naissances.length}</b> naissance(s), dont <b>{vivants}</b> né(s) vivant(s) •{' '}
        {naissances.filter(n => n.sexe === 'F').length} fille(s), {naissances.filter(n => n.sexe === 'M').length} garçon(s)
      </p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-400 text-left uppercase">
            <th className="py-1 pr-2">N°</th>
            <th className="py-1 pr-2">Date / heure</th>
            <th className="py-1 pr-2">Enfant</th>
            <th className="py-1 pr-2">Sexe</th>
            <th className="py-1 pr-2">Poids</th>
            <th className="py-1 pr-2">Apgar</th>
            <th className="py-1 pr-2">Mère</th>
            <th className="py-1 pr-2">Mode</th>
            <th className="py-1">Accoucheur</th>
          </tr>
        </thead>
        <tbody>
          {naissances.map((n, i) => (
            <tr key={n.id} className="border-b border-slate-200">
              <td className="py-1 pr-2">{i + 1}</td>
              <td className="py-1 pr-2 whitespace-nowrap">{formatDateTime(n.accouchement.accouchement_le)}</td>
              <td className="py-1 pr-2">{n.bebe ? `${n.bebe.nom} ${n.bebe.prenom}` : 'Mort-né'}</td>
              <td className="py-1 pr-2">{n.sexe}</td>
              <td className="py-1 pr-2">{n.poids_g ? `${n.poids_g} g` : '–'}</td>
              <td className="py-1 pr-2">{n.apgar_1 ?? '–'}/{n.apgar_5 ?? '–'}</td>
              <td className="py-1 pr-2">{n.accouchement.patient?.nom} {n.accouchement.patient?.prenom}</td>
              <td className="py-1 pr-2">{labelMode(n.accouchement.mode)}</td>
              <td className="py-1">{formatPersonne(n.accouchement.responsable, titreSoignant(n.accouchement.responsable?.role))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-10 text-right text-slate-600">Visa du responsable</div>
      <PiedDocument />
    </div>
  )
}
