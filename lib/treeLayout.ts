import type { Person, Relationship } from './types'

export const NODE_W = 168
export const NODE_H = 152
export const H_GAP = 40
// Écart minimum entre deux sous-arbres frères au même niveau.
// Il sert de base : chaque génération au-dessus s'élargit automatiquement
// pour absorber la totalité de ses propres ancêtres.
export const COUPLE_GAP = 120
// Écart entre frère et sœur quand ils se marient entre eux (mariage consanguin).
// On les place côte à côte plutôt qu'éloignés comme un couple normal.
export const SIBLING_GAP = 24
// Écart entre le focal et son·sa conjoint·e (placé·e juste à côté du focal,
// comme un couple parental normal). Volontairement très serré : le/la conjoint·e
// du focal n'a pas d'ascendance affichée (cas Mère Youm), donc on les colle
// pour que les enfants apparaissent pile en-dessous, sans dérive horizontale.
export const SPOUSE_GAP = 30
export const V_GAP = 70

export interface Layout {
  positions: Map<string, { x: number; y: number }>
  coupleEdges: Array<{ x1: number; y1: number; x2: number; y2: number; midX: number }>
  parentEdges: Array<{ x1: number; y1: number; x2: number; y2: number }>
  width: number
  height: number
}

export function computeLayout(
  persons: Person[],
  relationships: Relationship[],
  focalId?: string,
): Layout {
  // ─── Maps de lookup
  const personsMap = new Map<string, Person>()
  for (const p of persons) personsMap.set(p.id, p)

  // Filtrer les relations orphelines
  const validRels = relationships.filter(
    rel => personsMap.has(rel.person1_id) && personsMap.has(rel.person2_id)
  )

  const childrenOf = new Map<string, string[]>()
  const parentsOf = new Map<string, string[]>()
  const spousesOf = new Map<string, string[]>()

  for (const rel of validRels) {
    if (rel.type === 'parent-enfant') {
      childrenOf.set(rel.person1_id, [...(childrenOf.get(rel.person1_id) || []), rel.person2_id])
      parentsOf.set(rel.person2_id, [...(parentsOf.get(rel.person2_id) || []), rel.person1_id])
    } else if (rel.type === 'mariage' || rel.type === 'union') {
      spousesOf.set(rel.person1_id, [...(spousesOf.get(rel.person1_id) || []), rel.person2_id])
      spousesOf.set(rel.person2_id, [...(spousesOf.get(rel.person2_id) || []), rel.person1_id])
    }
  }

  // ─── Identifier le père / la mère d'une personne (en respectant le genre)
  function identifyParents(id: string): { father?: string; mother?: string } {
    const ps = parentsOf.get(id) || []
    let father: string | undefined
    let mother: string | undefined
    for (const p of ps) {
      const g = personsMap.get(p)?.gender
      if (g === 'homme' && !father) father = p
      else if (g === 'femme' && !mother) mother = p
    }
    // Fallback si genre inconnu : remplir dans l'ordre
    for (const p of ps) {
      if (p === father || p === mother) continue
      if (!father) father = p
      else if (!mother) mother = p
    }
    return { father, mother }
  }

  // ─── Profondeur d'ascendance (combien de générations remontent au-dessus)
  function depthOf(id: string, seen: Set<string> = new Set()): number {
    if (seen.has(id)) return 0
    const s = new Set(seen); s.add(id)
    const ps = parentsOf.get(id) || []
    if (ps.length === 0) return 0
    return 1 + Math.max(...ps.map(p => depthOf(p, s)))
  }

  // ─── Identifier le "focal" (la personne placée tout en bas de l'arbre).
  // Si focalId est fourni et existe, on le prend. Sinon on auto-détecte :
  // la personne avec la plus grande profondeur d'ancêtres et idéalement
  // sans enfants (vraie "feuille du bas").
  let focal = ''
  if (focalId && personsMap.has(focalId)) {
    focal = focalId
  } else {
    let bestDepth = -1
    let bestHasChildren = true
    for (const p of persons) {
      const d = depthOf(p.id)
      const hasKids = (childrenOf.get(p.id) || []).length > 0
      if (
        d > bestDepth ||
        (d === bestDepth && bestHasChildren && !hasKids)
      ) {
        bestDepth = d
        bestHasChildren = hasKids
        focal = p.id
      }
    }
  }

  const positions = new Map<string, { x: number; y: number }>()

  if (!focal) {
    return { positions, coupleEdges: [], parentEdges: [], width: 800, height: 600 }
  }

  // ─── Détecte un mariage consanguin (deux personnes qui partagent un parent)
  function areSiblings(a: string, b: string): boolean {
    const aParents = parentsOf.get(a) || []
    const bParents = parentsOf.get(b) || []
    if (aParents.length === 0 || bParents.length === 0) return false
    const bSet = new Set(bParents)
    for (const p of aParents) if (bSet.has(p)) return true
    return false
  }

  // ─── Cache de largeur pour éviter les calculs répétés
  const widthCache = new Map<string, number>()

  // ─── Largeur récursive du sous-arbre d'ascendance d'une personne.
  // Gère le cas du mariage consanguin : les ancêtres partagés sont
  // comptés une seule fois (pas de double largeur).
  function pedigreeWidth(id: string, seen: Set<string>): number {
    if (seen.has(id)) return NODE_W
    const cached = widthCache.get(id)
    if (cached !== undefined) return cached
    const s = new Set(seen); s.add(id)
    const { father, mother } = identifyParents(id)

    let result: number
    if (!father && !mother) {
      result = NODE_W
    } else if (father && mother) {
      if (areSiblings(father, mother)) {
        // Mariage consanguin : un seul sous-arbre d'ancêtres partagé
        result = Math.max(2 * NODE_W + SIBLING_GAP, pedigreeWidth(father, s))
      } else {
        result = pedigreeWidth(father, s) + COUPLE_GAP + pedigreeWidth(mother, s)
      }
    } else {
      const onlyParent = father || mother!
      result = Math.max(NODE_W, pedigreeWidth(onlyParent, s))
    }

    widthCache.set(id, result)
    return result
  }

  // ─── Garde globale : empêche une personne d'être placée deux fois
  // (cas typique : ancêtres partagés via plusieurs chemins, mariage consanguin).
  const placedGlobal = new Set<string>()

  // ─── Placement récursif (haut = ancêtres). Père à GAUCHE, mère à DROITE.
  // Si mariage consanguin (frère + sœur), les deux parents sont placés
  // CÔTE À CÔTE et leurs ancêtres communs sont placés AU-DESSUS DU MILIEU.
  function placePedigree(id: string, x: number, y: number, recursionPath: Set<string>) {
    if (recursionPath.has(id)) return
    if (placedGlobal.has(id)) return
    placedGlobal.add(id)
    const newPath = new Set(recursionPath); newPath.add(id)
    positions.set(id, { x: x - NODE_W / 2, y })

    const { father, mother } = identifyParents(id)
    if (!father && !mother) return
    const parentY = y - (NODE_H + V_GAP)

    if (father && mother) {
      if (areSiblings(father, mother)) {
        // Mariage consanguin : placer père et mère côte à côte (siblings)
        const fX = x - (NODE_W + SIBLING_GAP) / 2
        const mX = x + (NODE_W + SIBLING_GAP) / 2
        positions.set(father, { x: fX - NODE_W / 2, y: parentY })
        positions.set(mother, { x: mX - NODE_W / 2, y: parentY })
        placedGlobal.add(father)
        placedGlobal.add(mother)

        // Placer les grands-parents partagés AU-DESSUS DU MILIEU (x)
        // (pas au-dessus du père seulement comme la récursion normale le ferait)
        const sharedGP = identifyParents(father)
        const grandY = parentY - (NODE_H + V_GAP)
        if (sharedGP.father && sharedGP.mother) {
          const lw = pedigreeWidth(sharedGP.father, new Set())
          const rw = pedigreeWidth(sharedGP.mother, new Set())
          placePedigree(sharedGP.father, x - COUPLE_GAP / 2 - lw / 2, grandY, newPath)
          placePedigree(sharedGP.mother, x + COUPLE_GAP / 2 + rw / 2, grandY, newPath)
        } else if (sharedGP.father) {
          placePedigree(sharedGP.father, x, grandY, newPath)
        } else if (sharedGP.mother) {
          placePedigree(sharedGP.mother, x, grandY, newPath)
        }
      } else {
        // Cas spécial : les parents DIRECTS du focal sont placés serrés (comme
        // un couple normal), sans réserver la largeur de leur ascendance.
        // Cela évite la dérive horizontale quand un côté a une généalogie
        // beaucoup plus profonde que l'autre. Les générations supérieures
        // s'étalent librement au-dessus (sur d'autres lignes Y, donc pas de
        // chevauchement avec le couple voisin).
        const isFocalLevel = recursionPath.size === 0
        const lw = isFocalLevel ? NODE_W : pedigreeWidth(father, new Set())
        const rw = isFocalLevel ? NODE_W : pedigreeWidth(mother, new Set())
        placePedigree(father, x - COUPLE_GAP / 2 - lw / 2, parentY, newPath)
        placePedigree(mother, x + COUPLE_GAP / 2 + rw / 2, parentY, newPath)
      }
    } else if (father) {
      placePedigree(father, x, parentY, newPath)
    } else if (mother) {
      placePedigree(mother, x, parentY, newPath)
    }
  }

  // Place le focal à l'origine. Ses ancêtres remontent au-dessus.
  placePedigree(focal, 0, 0, new Set())

  // ─── Conjoint·e·s du focal : positionné·e·s sur le côté (long lien SPOUSE_GAP)
  const focalPos = positions.get(focal)!
  const focalGender = personsMap.get(focal)?.gender
  const focalSpouses = (spousesOf.get(focal) || []).filter(s => personsMap.has(s))
  focalSpouses.forEach((sp, i) => {
    if (positions.has(sp)) return
    // Si focal est homme, conjoint·e à droite ; sinon à gauche
    const baseX = focalPos.x
    const offset = (NODE_W + SPOUSE_GAP) * (i + 1)
    const spouseX = focalGender === 'femme' ? baseX - offset : baseX + offset
    positions.set(sp, { x: spouseX, y: focalPos.y })
  })

  // ─── Enfants du focal : DIRECTEMENT sous le focal (pas au milieu du couple).
  // Cela garantit que l'enfant principal apparait juste en dessous du focal,
  // peu importe où le/la conjoint·e est positionné·e.
  const focalKids = (childrenOf.get(focal) || []).filter(k => personsMap.has(k))
  if (focalKids.length > 0) {
    const centerX = focalPos.x + NODE_W / 2
    const total = focalKids.length * NODE_W + (focalKids.length - 1) * H_GAP
    const kidsY = focalPos.y + NODE_H + V_GAP
    const startX = centerX - total / 2
    focalKids.forEach((kid, i) => {
      if (positions.has(kid)) return
      positions.set(kid, { x: startX + i * (NODE_W + H_GAP), y: kidsY })
    })
  }

  // Les personnes non placées (= hors lignée du focal, hors conjoint·e·s
  // immédiat·e·s, hors enfants directs) ne sont pas rendues dans cette vue.
  // On les retrouvera en switchant sur l'autre arbre (Youm ↔ Gueye).

  // ─── Normalisation : décaler pour que minX/minY soient à 0 (+ padding)
  const PADDING = 80
  const xs = Array.from(positions.values()).map(p => p.x)
  const ys = Array.from(positions.values()).map(p => p.y)
  const minX = (xs.length ? Math.min(...xs) : 0) - PADDING
  const minY = (ys.length ? Math.min(...ys) : 0) - PADDING
  for (const [id, pos] of positions) {
    positions.set(id, { x: pos.x - minX, y: pos.y - minY })
  }

  // ─── Arêtes
  const coupleEdges: Layout['coupleEdges'] = []
  const parentEdges: Layout['parentEdges'] = []
  const drawnCouples = new Set<string>()
  const drawnEdges = new Set<string>()

  function pushCoupleEdge(a: string, b: string) {
    const key = [a, b].sort().join('::')
    if (drawnCouples.has(key)) return
    drawnCouples.add(key)
    const pa = positions.get(a)
    const pb = positions.get(b)
    if (!pa || !pb) return
    const left = pa.x < pb.x ? pa : pb
    const right = pa.x < pb.x ? pb : pa
    const avgY = (left.y + right.y) / 2 + NODE_H / 2
    coupleEdges.push({
      x1: left.x + NODE_W, y1: avgY,
      x2: right.x, y2: avgY,
      midX: (left.x + NODE_W + right.x) / 2,
    })
  }

  // Mariages des parents dans la pédigree (Babacar-Mere, etc.)
  for (const id of personsMap.keys()) {
    const { father, mother } = identifyParents(id)
    if (father && mother) pushCoupleEdge(father, mother)
  }
  // Mariages directs du focal
  for (const sp of focalSpouses) pushCoupleEdge(focal, sp)
  // Au cas où d'autres relations de mariage existent
  for (const rel of validRels) {
    if (rel.type === 'mariage' || rel.type === 'union') {
      pushCoupleEdge(rel.person1_id, rel.person2_id)
    }
  }

  // Arêtes parent-enfant en V (un trait diagonal par parent)
  for (const [childId, parentList] of parentsOf) {
    const childPos = positions.get(childId)
    if (!childPos) continue
    const childCenterX = childPos.x + NODE_W / 2
    const childTopY = childPos.y
    for (const parentId of parentList) {
      const parentPos = positions.get(parentId)
      if (!parentPos) continue
      const key = `${parentId}-${childId}`
      if (drawnEdges.has(key)) continue
      drawnEdges.add(key)
      parentEdges.push({
        x1: parentPos.x + NODE_W / 2,
        y1: parentPos.y + NODE_H,
        x2: childCenterX,
        y2: childTopY,
      })
    }
  }

  // ─── Dimensions totales
  const finalXs = Array.from(positions.values()).map(p => p.x)
  const finalYs = Array.from(positions.values()).map(p => p.y)
  const width = (finalXs.length ? Math.max(...finalXs) : 0) + NODE_W + PADDING
  const height = (finalYs.length ? Math.max(...finalYs) : 0) + NODE_H + PADDING

  return { positions, coupleEdges, parentEdges, width, height }
}
