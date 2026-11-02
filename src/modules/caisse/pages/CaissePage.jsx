import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import FacturesTab from '../components/FacturesTab'
import FactureModal from '../components/FactureModal'
import NouvelleFactureModal from '../components/NouvelleFactureModal'
import JournalTab from '../components/JournalTab'
import TarifsTab from '../components/TarifsTab'
import { Recu, ClotureCaisse } from '../components/Impressions'
import { Wallet, FileText, BookOpen, Tags, FilePlus } from 'lucide-react'

const TABS = [
  { key: 'a_encaisser', label: 'À encaisser', icon: Wallet },
  { key: 'toutes', label: 'Factures', icon: FileText },
  { key: 'journal', label: 'Journal de caisse', icon: BookOpen },
  { key: 'tarifs', label: 'Tarifs', icon: Tags },
]

export default function CaissePage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('a_encaisser')
  const [openId, setOpenId] = useState(null)
  const [nouvelleOpen, setNouvelleOpen] = useState(false)
  // Document à imprimer : { type: 'recu', facture } | { type: 'cloture', jour, paiements }
  const [toPrint, setToPrint] = useState(null)

  // Le document est rendu dans la zone d'impression, puis la fenêtre
  // d'impression s'ouvre une fois l'affichage mis à jour.
  const print = (doc) => {
    setToPrint(doc)
    setTimeout(() => window.print(), 100)
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Caisse & Facturation</h2>
            <p className="text-sm text-slate-500">Encaissement des factures, reçus et clôture de caisse.</p>
          </div>
          <button
            onClick={() => setNouvelleOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-sm"
          >
            <FilePlus className="w-5 h-5" />
            <span>Nouvelle facture</span>
          </button>
        </div>

        <div className="flex overflow-x-auto border-b border-slate-200">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {(tab === 'a_encaisser' || tab === 'toutes') && <FacturesTab key={tab} vue={tab} onOpen={setOpenId} />}
        {tab === 'journal' && <JournalTab onPrint={({ jour, paiements }) => print({ type: 'cloture', jour, paiements })} />}
        {tab === 'tarifs' && <TarifsTab canEdit={profile?.role === 'admin'} />}

        {openId && (
          <FactureModal
            factureId={openId}
            onClose={() => setOpenId(null)}
            onPrint={(facture) => print({ type: 'recu', facture })}
          />
        )}

        {nouvelleOpen && (
          <NouvelleFactureModal
            onCreated={(id) => { setNouvelleOpen(false); setOpenId(id) }}
            onClose={() => setNouvelleOpen(false)}
          />
        )}
      </div>

      {/* Zone d'impression : invisible à l'écran */}
      <div className="hidden print:block">
        {toPrint?.type === 'recu' && <Recu facture={toPrint.facture} />}
        {toPrint?.type === 'cloture' && <ClotureCaisse jour={toPrint.jour} paiements={toPrint.paiements} />}
      </div>
    </>
  )
}
