// Âge en années à partir de la date de naissance (AAAA-MM-JJ)
export function getAge(dateNaissance) {
  if (!dateNaissance) return null
  const naissance = new Date(dateNaissance)
  const today = new Date()
  let age = today.getFullYear() - naissance.getFullYear()
  const m = today.getMonth() - naissance.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < naissance.getDate())) age--
  return age
}

// 12/03/2026
export function formatDate(value) {
  if (!value) return '–'
  return new Date(value).toLocaleDateString('fr-FR')
}

// 12/03/2026 à 14:05
export function formatDateTime(value) {
  if (!value) return '–'
  const d = new Date(value)
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

// 15 000 FCFA
export function formatMontant(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`
}

// Dr Ouedraogo Jean
export function formatPersonne(profile, prefix = '') {
  if (!profile) return '–'
  return `${prefix}${profile.nom} ${profile.prenom || ''}`.trim()
}

// Temps écoulé depuis une date : « 5 min », « 1 h 20 »
export function formatAttente(value) {
  if (!value) return '–'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

// Date du jour : 12/03/2026
export function aujourdhui() {
  return new Date().toLocaleDateString('fr-FR')
}
