import jsPDF from 'jspdf'
import type { Person, Relationship } from './types'
import { computeLayout, NODE_W, NODE_H } from './treeLayout'
import { formatDateFR } from './utils'

// A0 paysage en mm
const PAGE_W = 1189
const PAGE_H = 841

// Marges
const TOP_MARGIN = 145
const SIDE_MARGIN = 30
const BOTTOM_MARGIN = 110

// Couleurs (RGB) — typées explicitement pour éviter les spreads sur tuples
// qui posent problème selon les versions de jsPDF / TypeScript.
type RGB = readonly [number, number, number]
const C_PARCHMENT: RGB = [249, 246, 239]
const C_INK: RGB = [26, 15, 0]
const C_BROWN: RGB = [112, 88, 64]
const C_LIGHT_BROWN: RGB = [160, 140, 120]
const C_GOLD: RGB = [196, 146, 42]
const C_GOLD_LIGHT: RGB = [245, 233, 196]
const C_GOLD_DARK: RGB = [139, 98, 20]
const C_BORDER: RGB = [224, 208, 184]
const C_LINE_COUPLE: RGB = [184, 160, 122]
const C_LINE_PARENT: RGB = [212, 196, 168]
const C_BG_MALE: RGB = [217, 230, 244]   // bleu pâle (navy clair)
const C_BG_FEMALE: RGB = [250, 228, 214]
const C_BG_NEUTRAL: RGB = [240, 235, 227]
// Couleur du texte initial des hommes — bleu navy lisible sur fond bleu pâle
const C_BG_MALE_TEXT: RGB = [30, 58, 95] // navy-500

// Helpers pour éviter de répéter le spread partout
const setFill = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2])
const setDraw = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
const setText = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2])

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Variante qui retourne aussi le format (PNG/JPEG) pour jsPDF.addImage. */
async function loadImageAsBase64Full(
  url: string,
): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  const data = await loadImageAsBase64(url)
  if (!data) return null
  const format: 'PNG' | 'JPEG' = data.startsWith('data:image/png') ? 'PNG' : 'JPEG'
  return { data, format }
}

function drawInitialsBox(
  doc: jsPDF,
  person: Person,
  x: number,
  y: number,
  size: number,
  scale: number,
) {
  if (person.is_royal) {
    setFill(doc, C_GOLD_LIGHT)
  } else if (person.gender === 'homme') {
    setFill(doc, C_BG_MALE)
  } else if (person.gender === 'femme') {
    setFill(doc, C_BG_FEMALE)
  } else {
    setFill(doc, C_BG_NEUTRAL)
  }
  const r = 2 * scale
  doc.roundedRect(x, y, size, size, r, r, 'F')

  const initials = `${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.toUpperCase()
  doc.setFont('times', 'bold')
  doc.setFontSize(Math.max(8, 7 * scale))
  if (person.is_royal) setText(doc, C_GOLD_DARK)
  else if (person.gender === 'homme') setText(doc, C_BG_MALE_TEXT)
  else setText(doc, C_BROWN)
  doc.text(initials, x + size / 2, y + size / 2 + 2.2 * scale, { align: 'center' })
}

function drawDecorativeBorder(doc: jsPDF) {
  setDraw(doc, C_GOLD)
  doc.setLineWidth(0.5)
  const m = 20
  doc.rect(m, m, PAGE_W - 2 * m, PAGE_H - 2 * m)
  doc.setLineWidth(0.2)
  doc.rect(m + 4, m + 4, PAGE_W - 2 * m - 8, PAGE_H - 2 * m - 8)
}

/**
 * Place une image de baobab en filigrane sur le fond du PDF, avec une
 * opacité très très faible (juste suggéré). Si l'image n'est pas
 * accessible (404, problème CORS), on n'affiche rien.
 */
function drawBackgroundTreeImage(
  doc: jsPDF,
  watermarkB64: { data: string; format: 'PNG' | 'JPEG' } | null,
) {
  if (!watermarkB64) return

  // Active l'opacité ultra-discrète via GState (jsPDF v2+)
  // Cible : ~12% d'opacité, juste perceptible
  const docAny = doc as unknown as {
    GState?: new (opts: { opacity: number }) => unknown
    setGState?: (gs: unknown) => void
  }
  const supportsGState = typeof docAny.setGState === 'function' && !!docAny.GState

  if (supportsGState && docAny.GState && docAny.setGState) {
    try {
      docAny.setGState(new docAny.GState({ opacity: 0.12 }))
    } catch {
      // si ça plante, on continue sans opacité (l'image est déjà très claire)
    }
  }

  // Centre l'image, occupe ~80% de la largeur (grand baobab imposant)
  const imgW = PAGE_W * 0.80
  const aspect = 3 / 2 // ratio image fournie (env. 1518x1011)
  const imgH = imgW / aspect
  const imgX = (PAGE_W - imgW) / 2
  // Verticalement : on centre légèrement vers le bas pour évoquer un sol
  const imgY = (PAGE_H - imgH) / 2 + PAGE_H * 0.04

  try {
    doc.addImage(watermarkB64.data, watermarkB64.format, imgX, imgY, imgW, imgH, undefined, 'FAST')
  } catch {
    // ignore
  }

  // Restaure l'opacité pleine pour le reste du contenu
  if (supportsGState && docAny.GState && docAny.setGState) {
    try {
      docAny.setGState(new docAny.GState({ opacity: 1 }))
    } catch {
      // ignore
    }
  }
}

/**
 * Badge couronne royale : disque jaune vif avec bordure blanche et un mini
 * dessin de couronne dorée à 5 pointes + joyau rouge au centre.
 * Identique visuellement au badge utilisé dans la vue arbre du site.
 */
function drawRoyalCrownBadge(doc: jsPDF, cx: number, cy: number, r: number) {
  // 1) Fond jaune vif
  doc.setFillColor(255, 212, 59)
  doc.circle(cx, cy, r, 'F')
  // 2) Anneau blanc épais
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(r * 0.18)
  doc.circle(cx, cy, r, 'S')
  // 3) Liseré brun fin pour le contraste
  doc.setDrawColor(139, 98, 20)
  doc.setLineWidth(r * 0.05)
  doc.circle(cx, cy, r, 'S')

  // 4) Couronne dorée stylisée (polygone 5 pointes)
  const cw = r * 1.25
  const ch = r * 0.95
  const left = cx - cw / 2
  const right = cx + cw / 2
  const top = cy - ch * 0.55
  const bandTop = cy + ch * 0.15
  const bandBottom = cy + ch * 0.45
  const valleyY = cy - ch * 0.15

  const pts: Array<[number, number]> = [
    [left, bandTop],
    [left + cw * 0.10, top + ch * 0.10],   // pointe 1
    [left + cw * 0.22, valleyY],            // vallée 1
    [left + cw * 0.33, top + ch * 0.04],    // pointe 2
    [left + cw * 0.43, valleyY + ch * 0.03], // vallée 2
    [left + cw * 0.50, top - ch * 0.04],    // pointe centrale (la + haute)
    [left + cw * 0.57, valleyY + ch * 0.03], // vallée 3
    [left + cw * 0.67, top + ch * 0.04],    // pointe 4
    [left + cw * 0.78, valleyY],            // vallée 4
    [left + cw * 0.90, top + ch * 0.10],    // pointe 5
    [right, bandTop],                       // bas-droite
  ]
  const rel: Array<[number, number]> = []
  for (let i = 1; i < pts.length; i++) {
    rel.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]])
  }
  doc.setFillColor(255, 201, 60)
  doc.setDrawColor(139, 98, 20)
  doc.setLineWidth(r * 0.06)
  doc.lines(rel, pts[0][0], pts[0][1], [1, 1], 'FD', true)

  // 5) Bandeau inférieur
  doc.setFillColor(232, 170, 28)
  doc.setDrawColor(139, 98, 20)
  doc.setLineWidth(r * 0.05)
  doc.rect(left, bandTop, cw, bandBottom - bandTop, 'FD')

  // 6) Joyau central rouge (petit losange)
  const rubyW = r * 0.18
  const rubyH = r * 0.22
  doc.setFillColor(214, 47, 78)
  const rubyTop: [number, number] = [cx, cy - ch * 0.08 - rubyH / 2]
  const rubyRel: Array<[number, number]> = [
    [rubyW / 2, rubyH / 2],
    [-rubyW / 2, rubyH / 2],
    [-rubyW / 2, -rubyH / 2],
  ]
  doc.lines(rubyRel, rubyTop[0], rubyTop[1], [1, 1], 'F', true)
}

/**
 * Encadré "Légende" : explique les pictogrammes utilisés dans l'arbre
 * (couronne royale, ligne de couple, filiation pointillée, lien cousin).
 * Position et dimensions configurables (placé au top-right par défaut).
 */
/**
 * Encart de mise en contexte (3 paragraphes), discret, sans fond.
 * Trait doré vertical à gauche pour l'élégance. Italique sépia.
 */
function drawDescription(doc: jsPDF, x: number, y: number, w: number) {
  const paragraphs = [
    "Cet arbre retrace plusieurs siècles de filiations, depuis les royaumes pré-coloniaux du Cayor, du Baol et du Fouta-Toro jusqu'à aujourd'hui.",
    "Les liens présentés s'appuient sur des sources vérifiées : archives historiques et tradition orale avérée.",
    "Cette mémoire est vivante et continue d'être enrichie au fil des découvertes.",
  ]

  doc.setFont('times', 'italic')
  const fontSize = 14
  doc.setFontSize(fontSize)
  setText(doc, C_BROWN)

  const lineHeight = 6
  const paraGap = 3.5
  const padLeft = 6

  // Mesure totale pour le trait latéral
  let totalH = 0
  const wrapped: string[][] = []
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p, w - padLeft) as string[]
    wrapped.push(lines)
    totalH += lines.length * lineHeight + paraGap
  }
  totalH -= paraGap // pas de gap après le dernier paragraphe

  // Trait doré vertical à gauche
  setDraw(doc, C_GOLD)
  doc.setLineWidth(0.4)
  doc.line(x, y, x, y + totalH)

  // Rendu des paragraphes
  let cursorY = y
  for (const lines of wrapped) {
    for (const line of lines) {
      doc.text(line, x + padLeft, cursorY, { baseline: 'top' })
      cursorY += lineHeight
    }
    cursorY += paraGap
  }
}

function drawLegend(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Pas de fond, pas de bordure, pas de titre.
  // Juste un seul item "Ancêtre royal" en italique, fondu sur le parchment.
  const cy = y + h / 2
  const iconCenterX = x + 8
  const textX = x + 20
  drawRoyalCrownBadge(doc, iconCenterX, cy, 6)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(14) // +2pts par rapport à avant
  setText(doc, C_INK)
  doc.text('Ancêtre royal', textX, cy, { baseline: 'middle' })
}

export async function downloadFamilyTreePdf(
  persons: Person[],
  relationships: Relationship[],
  focalId?: string,
  familyLabel?: string,
) {
  if (persons.length === 0) {
    alert("L'arbre est vide. Ajoutez au moins une personne avant de télécharger.")
    return
  }

  // Pré-charger toutes les photos en parallèle + le filigrane baobab
  const photoCache = new Map<string, string>()
  const [watermarkB64] = await Promise.all([
    loadImageAsBase64Full('/baobab-watermark.png'),
    ...persons.map(async p => {
      if (p.profile_picture_url) {
        const b64 = await loadImageAsBase64(p.profile_picture_url)
        if (b64) photoCache.set(p.id, b64)
      }
    }),
  ])

  const layout = computeLayout(persons, relationships, focalId)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a0',
    compress: true,
  })

  // ─── Fond parchemin
  setFill(doc, C_PARCHMENT)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // ─── Arbre sépia en filigrane (image baobab très transparente)
  drawBackgroundTreeImage(doc, watermarkB64)

  // ─── Liseré décoratif doré
  drawDecorativeBorder(doc)

  // ─── Titre
  doc.setFont('times', 'bold')
  doc.setFontSize(90)
  setText(doc, C_INK)
  const titleText = familyLabel ? `Famille ${familyLabel}` : 'Famille Youm'
  doc.text(titleText, PAGE_W / 2, 70, { align: 'center' })

  // ─── Trait doré sous le titre
  setDraw(doc, C_GOLD)
  doc.setLineWidth(0.8)
  doc.line(PAGE_W / 2 - 100, 90, PAGE_W / 2 + 100, 90)
  setFill(doc, C_GOLD)
  doc.circle(PAGE_W / 2, 90, 1.4, 'F')

  // ─── Sous-titre
  doc.setFont('times', 'italic')
  doc.setFontSize(22)
  setText(doc, C_BROWN)
  doc.text('Arbre généalogique', PAGE_W / 2, 108, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  setText(doc, C_LIGHT_BROWN)
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.text(`Édition du ${today}`, PAGE_W / 2, 126, { align: 'center' })

  // ─── Encart de description (top-LEFT, discret, sans fond)
  const descW = 240
  const descX = SIDE_MARGIN
  const descY = 40
  drawDescription(doc, descX, descY, descW)

  // ─── Légende ultra-compacte (bottom-right, juste "Ancêtre royal")
  const legendW = 100
  const legendH = 20
  const legendX = PAGE_W - SIDE_MARGIN - legendW
  const legendY = PAGE_H - 30 - legendH
  drawLegend(doc, legendX, legendY, legendW, legendH)

  // ─── Calcul de la zone arbre et de l'échelle
  // On étire l'arbre HORIZONTALEMENT pour que les cartes prennent plus
  // de largeur et que les noms longs ne wrappent pas. Le facteur est
  // appliqué aux positions X ET à la largeur des cartes (NODE_W).
  const X_STRETCH = 1.45
  const treeAreaW = PAGE_W - 2 * SIDE_MARGIN
  const treeAreaH = PAGE_H - TOP_MARGIN - BOTTOM_MARGIN
  const stretchedLayoutW = layout.width * X_STRETCH
  const scaleX = treeAreaW / stretchedLayoutW
  const scaleY = treeAreaH / layout.height
  // Plafond : éviter des cartes gigantesques quand l'arbre est petit
  const MAX_SCALE = 0.85
  const scale = Math.min(scaleX, scaleY, MAX_SCALE)

  const scaledW = stretchedLayoutW * scale
  const scaledH = layout.height * scale
  const offsetX = SIDE_MARGIN + (treeAreaW - scaledW) / 2
  const offsetY = TOP_MARGIN + (treeAreaH - scaledH) / 2

  // Positions étirées horizontalement
  const tx = (x: number) => offsetX + x * X_STRETCH * scale
  const ty = (y: number) => offsetY + y * scale
  // Largeur de carte dans le PDF (NODE_W étiré)
  const pdfNodeW = NODE_W * X_STRETCH

  // ─── Lignes de couples (horizontales)
  setDraw(doc, C_LINE_COUPLE)
  doc.setLineWidth(Math.max(0.4, 0.7 * scale))
  for (const edge of layout.coupleEdges) {
    doc.line(tx(edge.x1), ty(edge.y1), tx(edge.x2), ty(edge.y2))
    // Point médian
    setFill(doc, C_LINE_COUPLE)
    doc.circle(tx(edge.midX), ty(edge.y1), Math.max(0.6, 1 * scale), 'F')
  }

  // ─── Lignes parent-enfant : V (traits diagonaux directs)
  setDraw(doc, C_LINE_PARENT)
  doc.setLineWidth(Math.max(0.3, 0.5 * scale))
  doc.setLineDashPattern([Math.max(0.8, 1.2 * scale), Math.max(0.5, 0.8 * scale)], 0)
  for (const edge of layout.parentEdges) {
    doc.line(tx(edge.x1), ty(edge.y1), tx(edge.x2), ty(edge.y2))
  }
  doc.setLineDashPattern([], 0)

  // ─── Nœuds : layout horizontal (avatar à gauche, texte à droite),
  //    identique à la vue arbre du site.
  for (const person of persons) {
    const pos = layout.positions.get(person.id)
    if (!pos) continue

    const nx = tx(pos.x)
    const ny = ty(pos.y)
    const nw = pdfNodeW * scale
    const nh = NODE_H * scale

    // ─ Carte : fond blanc + bordure
    doc.setFillColor(255, 255, 255)
    if (person.is_royal) {
      setDraw(doc, C_GOLD)
      doc.setLineWidth(Math.max(0.5, 0.9 * scale))
    } else {
      setDraw(doc, C_BORDER)
      doc.setLineWidth(Math.max(0.3, 0.5 * scale))
    }
    const cardRadius = nh * 0.12
    doc.roundedRect(nx, ny, nw, nh, cardRadius, cardRadius, 'FD')

    // ─ Mesures de mise en page horizontale
    const cardPad = nh * 0.10
    const avatarSize = nh - 2 * cardPad
    const avatarX = nx + cardPad
    const avatarY = ny + cardPad
    const gap = nh * 0.10
    const textX = avatarX + avatarSize + gap
    const textRight = nx + nw - cardPad
    const textW = textRight - textX

    // ─ Avatar (photo ou initiales) — à gauche
    const photo = photoCache.get(person.id)
    if (photo) {
      const format = photo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      try {
        doc.addImage(photo, format, avatarX, avatarY, avatarSize, avatarSize, undefined, 'FAST')
      } catch {
        drawInitialsBox(doc, person, avatarX, avatarY, avatarSize, scale)
      }
    } else {
      drawInitialsBox(doc, person, avatarX, avatarY, avatarSize, scale)
    }
    // Bordure avatar
    const borderColor = person.is_royal ? C_GOLD : C_BORDER
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.setLineWidth(Math.max(0.3, 0.5 * scale))
    doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, avatarSize * 0.12, avatarSize * 0.12, 'S')

    // ─ Tailles de police (+2pts par rapport à avant)
    const titleSize = Math.max(7, nh * 0.10)
    const firstNameSize = Math.max(13, nh * 0.20) + 2
    const lastNameSize = Math.max(10, nh * 0.13) + 2
    const dateSize = Math.max(7, nh * 0.10)

    // ─ Dates de vie (calculé d'abord pour estimer la hauteur du bloc texte)
    let lifeText = ''
    if (person.birth_date && person.death_date) {
      lifeText = `${formatDateFR(person.birth_date)} / ${formatDateFR(person.death_date)}`
    } else if (person.birth_date) {
      lifeText = `né${person.gender === 'femme' ? 'e' : ''} en ${formatDateFR(person.birth_date)}`
    } else if (person.death_date) {
      lifeText = `† ${formatDateFR(person.death_date)}`
    }

    // ─ Pré-calcul de la hauteur totale du bloc texte (pour centrage vertical
    //    quand pas de titre royal, afin que le nom soit bien au milieu)
    doc.setFont('times', 'bold')
    doc.setFontSize(firstNameSize)
    const fnLines = (doc.splitTextToSize(person.first_name, textW) as string[]).slice(0, 2)
    const fnLineH = firstNameSize * 0.42
    const fnBlockH = fnLines.length * fnLineH

    let pillH = 0
    let pillW = 0
    let labelText = ''
    let labelLines: string[] = []
    let pillTextLineH = 0
    if (person.is_royal && person.royal_title) {
      labelText = person.royal_title.toUpperCase()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(titleSize)
      const padX = titleSize * 0.45
      const padY = titleSize * 0.18
      // Pill jusqu'à la largeur entière du bloc texte (pas de wrap intempestif)
      const maxLabelW = textW - 2 * padX
      labelLines = doc.splitTextToSize(labelText, maxLabelW) as string[]
      // Largeur réelle utilisée : prend la plus longue ligne
      const usedW = Math.min(
        Math.max(...labelLines.map(l => doc.getTextWidth(l))),
        maxLabelW,
      )
      pillW = usedW + 2 * padX
      pillTextLineH = titleSize * 0.42
      pillH = labelLines.length * pillTextLineH + 2 * padY
    }

    const lastNameH = lastNameSize * 0.42
    const dateH = lifeText ? dateSize * 0.42 : 0
    const interGap = nh * 0.025
    const blockH =
      (pillH > 0 ? pillH + nh * 0.04 : 0) +
      fnBlockH +
      interGap +
      lastNameH +
      (dateH > 0 ? interGap + dateH : 0)

    // Centrage vertical : si pas de titre royal, on centre le bloc sur l'avatar.
    // Avec titre royal, on aligne en haut (comme avant).
    const blockTop = (person.is_royal && person.royal_title)
      ? avatarY
      : avatarY + (avatarSize - blockH) / 2

    // ─ Rendu : bulle puis prénom, nom, date
    let cursorY = blockTop

    if (person.is_royal && person.royal_title) {
      setFill(doc, C_GOLD_LIGHT)
      setDraw(doc, C_GOLD)
      doc.setLineWidth(Math.max(0.15, 0.2 * scale))
      const pillR = pillH / 2
      doc.roundedRect(textX, cursorY, pillW, pillH, pillR, pillR, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(titleSize)
      setText(doc, C_GOLD_DARK)
      const padX = titleSize * 0.45
      const padY = titleSize * 0.18
      let lineCursorY = cursorY + padY
      for (const line of labelLines) {
        doc.text(line, textX + padX, lineCursorY, { baseline: 'top' })
        lineCursorY += pillTextLineH
      }
      cursorY += pillH + nh * 0.04
    }

    // Prénom
    doc.setFont('times', 'bold')
    doc.setFontSize(firstNameSize)
    setText(doc, C_INK)
    for (const line of fnLines) {
      doc.text(line, textX, cursorY, { baseline: 'top' })
      cursorY += fnLineH
    }
    cursorY += interGap

    // Nom de famille
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(lastNameSize)
    setText(doc, C_BROWN)
    doc.text(person.last_name, textX, cursorY, { baseline: 'top', maxWidth: textW })
    cursorY += lastNameH + interGap

    if (lifeText) {
      doc.setFontSize(dateSize)
      setText(doc, C_LIGHT_BROWN)
      doc.text(lifeText, textX, cursorY, { baseline: 'top', maxWidth: textW })
    }

    // ─ Badge couronne (jaune vif) en haut-droite de la carte, comme à l'écran
    if (person.is_royal) {
      const badgeR = Math.max(2, nh * 0.17)
      drawRoyalCrownBadge(doc, nx + nw - badgeR * 0.55, ny + badgeR * 0.55, badgeR)
    }
  }

  // ─── Pied de page
  doc.setFont('times', 'italic')
  doc.setFontSize(18)
  setText(doc, C_BROWN)
  doc.text(
    '" La mémoire d\'un peuple est la racine de son avenir. "',
    PAGE_W / 2, PAGE_H - 45,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  setText(doc, C_LIGHT_BROWN)
  doc.text(
    `Archive familiale  ·  ${persons.length} membre${persons.length > 1 ? 's' : ''}`,
    PAGE_W / 2, PAGE_H - 28,
    { align: 'center' },
  )

  // ─── Téléchargement
  // Nom de fichier propre, sans date ni slug
  const familyName = (familyLabel || 'Youm').toUpperCase()
  const filename = `FAMILLE ${familyName} - Arbre généalogique.pdf`
  doc.save(filename)
}
