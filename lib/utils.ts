import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Person, Relationship } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(person: Pick<Person, 'first_name' | 'last_name'>): string {
  const first = person.first_name.trim().charAt(0).toUpperCase()
  const last = person.last_name.trim().charAt(0).toUpperCase()
  return `${first}${last}`
}

export function getFullName(person: Pick<Person, 'first_name' | 'last_name' | 'maiden_name'>): string {
  let name = `${person.first_name} ${person.last_name}`
  if (person.maiden_name) {
    name += ` (née ${person.maiden_name})`
  }
  return name
}

export function getDisplayName(person: Pick<Person, 'first_name' | 'last_name' | 'nickname'>): string {
  if (person.nickname) return person.nickname
  return `${person.first_name} ${person.last_name}`
}

export function formatDateFR(dateStr: string | null | undefined): string {
  if (!dateStr) return ''

  if (dateStr.startsWith('vers') || dateStr.startsWith('années') || dateStr.startsWith('~')) {
    return dateStr
  }

  if (/^\d{4}$/.test(dateStr)) return dateStr

  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split('-')
    const mois = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
    return `${mois[parseInt(month) - 1]} ${year}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return dateStr
}

export function formatLifespan(person: Pick<Person, 'birth_date' | 'death_date'>): string {
  const birth = person.birth_date ? formatDateFR(person.birth_date) : ''
  const death = person.death_date ? formatDateFR(person.death_date) : ''
  if (birth && death) return `${birth} – ${death}`
  if (birth) return `né(e) en ${birth}`
  if (death) return `† ${death}`
  return ''
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getBirthPlaceDisplay(person: Pick<Person, 'birth_place' | 'birth_place_other'>): string {
  if (person.birth_place === 'Autre' && person.birth_place_other) {
    return person.birth_place_other
  }
  return person.birth_place || ''
}

// Couleurs d'avatar uniformes entre la vue arbre, le panneau latéral et le profil
export function getAvatarColors(person: Pick<Person, 'gender' | 'is_royal'>): {
  bg: string
  text: string
} {
  if (person.is_royal) {
    return { bg: 'bg-royal-gold-light', text: 'text-royal-gold-dark' }
  }
  if (person.gender === 'homme') {
    return { bg: 'bg-heritage-green/10', text: 'text-heritage-green' }
  }
  if (person.gender === 'femme') {
    return { bg: 'bg-terracotta-100', text: 'text-terracotta-600' }
  }
  return { bg: 'bg-parchment-300', text: 'text-heritage-brown' }
}

// Détermine le "focal" d'un arbre familial selon le nom de famille.
// - 'youm' : on cherche les personnes de la famille Youm (nom = Youm)
// - 'gueye' : on cherche les personnes de la famille Gueye (nom = Gueye OU
//   nom de jeune fille = Gueye). Fatou Youm née Gueye qualifie pour Gueye.
// On retourne la personne avec la plus grande profondeur d'ancêtres et
// idéalement sans enfants (la "feuille" du bas).
export function findFamilyFocal(
  persons: Person[],
  relationships: Relationship[],
  family: 'youm' | 'gueye',
): string | undefined {
  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  for (const rel of relationships) {
    if (rel.type !== 'parent-enfant') continue
    parentsOf.set(rel.person2_id, [...(parentsOf.get(rel.person2_id) || []), rel.person1_id])
    childrenOf.set(rel.person1_id, [...(childrenOf.get(rel.person1_id) || []), rel.person2_id])
  }

  const depthCache = new Map<string, number>()
  function depthOf(id: string, seen: Set<string> = new Set()): number {
    if (depthCache.has(id)) return depthCache.get(id)!
    if (seen.has(id)) return 0
    const s = new Set(seen); s.add(id)
    const ps = parentsOf.get(id) || []
    if (ps.length === 0) { depthCache.set(id, 0); return 0 }
    const d = 1 + Math.max(...ps.map(p => depthOf(p, s)))
    depthCache.set(id, d)
    return d
  }

  const candidates = persons.filter(p => {
    const ln = (p.last_name || '').trim().toLowerCase()
    const mn = (p.maiden_name || '').trim().toLowerCase()
    if (family === 'youm') return ln === 'youm'
    return mn === 'gueye' || ln === 'gueye'
  })

  let best: string | undefined
  let bestScore = -Infinity
  for (const c of candidates) {
    const d = depthOf(c.id)
    const hasKids = (childrenOf.get(c.id) || []).length > 0
    // Préférer profondeur élevée, puis préférer feuille (sans enfants)
    const score = d * 10 + (hasKids ? 0 : 1)
    if (score > bestScore) {
      bestScore = score
      best = c.id
    }
  }
  return best
}

// Extrait une année (number) d'une chaîne de date flexible :
// "1970" -> 1970, "vers 1950" -> 1950, "années 60" -> 1960, "1970-05-15" -> 1970
export function parseYearFromDate(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const decade = dateStr.match(/années?\s*(\d{2})/i)
  if (decade) {
    const d = parseInt(decade[1])
    return d < 30 ? 2000 + d : 1900 + d
  }
  const year = dateStr.match(/(\d{4})/)
  return year ? parseInt(year[1]) : null
}
