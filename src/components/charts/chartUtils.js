// Couleurs des graphiques (palette de référence validée, mode clair).
// Une seule série : le vert de la clinique. Le texte n'utilise jamais la couleur des données.
export const CHART = {
  series: '#4f8221',
  seriesHover: '#65a02c',
  // Courbe des mini-tendances (teinte claire de la même gamme)
  sparkline: '#a6cf74',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
}

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })

// 1 200 -> « 1,2 k » ; 1 500 000 -> « 1,5 M »
export const formatCompact = (v) => compact.format(v)

// Graduation « ronde » de l'axe : 0, 5 k, 10 k, 15 k…
export function niceScale(max, ticks = 4) {
  if (!max || max <= 0) return { max: ticks, step: 1 }
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw)
  return { max: step * Math.ceil(max / step), step }
}
