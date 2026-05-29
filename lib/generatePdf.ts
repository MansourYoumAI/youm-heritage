import jsPDF from 'jspdf'
import type { Person, Relationship } from './types'
import { computeLayout, NODE_W, NODE_H } from './treeLayout'
import { formatDateFR } from './utils'

// A0 paysage en mm
const PAGE_W = 1189
const PAGE_H = 841

// Marges
const TOP_MARGIN = 145
const SIDE_MARGIN = 60
const BOTTOM_MARGIN = 80

// Couleurs (RGB)
const C_PARCHMENT = [249, 246, 239] as const
const C_INK = [26, 15, 0] as const
const C_BROWN = [112, 88, 64] as const
const C_LIGHT_BROWN = [160, 140, 120] as const
const C_GOLD = [196, 146, 42] as const
const C_GOLD_LIGHT = [245, 233, 196] as const
const C_GOLD_DARK = [139, 98, 20] as const
const C_BORDER = [224, 208, 184] as const
const C_LINE_COUPLE = [184, 160, 122] as const
const C_LINE_PARENT = [212, 196, 168] as const
const C_BG_MALE = [232, 240, 230] as const
const C_BG_FEMALE = [250, 228, 214] as const
const C_BG_NEUTRAL = [240, 235, 227] as const

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

function drawInitialsBox(
  doc: jsPDF,
  person: Person,
  x: number,
  y: number,
  size: number,
  scale: number,
) {
  if (person.is_royal) {
    doc.setFillColor(...C_GOLD_LIGHT)
  } else if (person.gender === 'homme') {
    doc.setFillColor(...C_BG_MALE)
  } else if (person.gender === 'femme') {
    doc.setFillColor(...C_BG_FEMALE)
  } else {
    doc.setFillColor(...C_BG_NEUTRAL)
  }
  const r = 2 * scale
  doc.roundedRect(x, y, size, size, r, r, 'F')

  const initials = `${person.first_name.charAt(0)}${person.last_name.charAt(0)}`.toUpperCase()
  doc.setFont('times', 'bold')
  doc.setFontSize(Math.max(8, 7 * scale))
  if (person.is_royal) doc.setTextColor(...C_GOLD_DARK)
  else doc.setTextColor(...C_BROWN)
  doc.text(initials, x + size / 2, y + size / 2 + 2.2 * scale, { align: 'center' })
}

function drawDecorativeBorder(doc: jsPDF) {
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.5)
  const m = 20
  doc.rect(m, m, PAGE_W - 2 * m, PAGE_H - 2 * m)
  doc.setLineWidth(0.2)
  doc.rect(m + 4, m + 4, PAGE_W - 2 * m - 8, PAGE_H - 2 * m - 8)
}

function drawCrown(doc: jsPDF, cx: number, cy: number, size: number) {
  // Petit cercle doré avec un point central
  doc.setFillColor(...C_GOLD)
  doc.circle(cx, cy, size, 'F')
  doc.setFillColor(...C_INK)
  doc.circle(cx, cy, size * 0.35, 'F')
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

  // Pré-charger toutes les photos en parallèle
  const photoCache = new Map<string, string>()
  await Promise.all(
    persons.map(async p => {
      if (p.profile_picture_url) {
        const b64 = await loadImageAsBase64(p.profile_picture_url)
        if (b64) photoCache.set(p.id, b64)
      }
    }),
  )

  const layout = computeLayout(persons, relationships, focalId)

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a0',
    compress: true,
  })

  // ─── Fond parchemin
  doc.setFillColor(...C_PARCHMENT)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // ─── Liseré décoratif doré
  drawDecorativeBorder(doc)

  // ─── Titre
  doc.setFont('times', 'bold')
  doc.setFontSize(90)
  doc.setTextColor(...C_INK)
  const titleText = familyLabel ? `Famille ${familyLabel}` : 'Famille Youm'
  doc.text(titleText, PAGE_W / 2, 70, { align: 'center' })

  // ─── Trait doré sous le titre
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.8)
  doc.line(PAGE_W / 2 - 100, 90, PAGE_W / 2 + 100, 90)
  doc.setFillColor(...C_GOLD)
  doc.circle(PAGE_W / 2, 90, 1.4, 'F')

  // ─── Sous-titre
  doc.setFont('times', 'italic')
  doc.setFontSize(22)
  doc.setTextColor(...C_BROWN)
  doc.text('Arbre généalogique', PAGE_W / 2, 108, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(...C_LIGHT_BROWN)
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.text(`Édition du ${today}`, PAGE_W / 2, 126, { align: 'center' })

  // ─── Calcul de la zone arbre et de l'échelle
  const treeAreaW = PAGE_W - 2 * SIDE_MARGIN
  const treeAreaH = PAGE_H - TOP_MARGIN - BOTTOM_MARGIN
  const scaleX = treeAreaW / layout.width
  const scaleY = treeAreaH / layout.height
  // Plafond : éviter des cartes gigantesques quand l'arbre est petit
  const MAX_SCALE = 0.55
  const scale = Math.min(scaleX, scaleY, MAX_SCALE)

  const scaledW = layout.width * scale
  const scaledH = layout.height * scale
  const offsetX = SIDE_MARGIN + (treeAreaW - scaledW) / 2
  const offsetY = TOP_MARGIN + (treeAreaH - scaledH) / 2

  const tx = (x: number) => offsetX + x * scale
  const ty = (y: number) => offsetY + y * scale

  // ─── Lignes de couples (horizontales)
  doc.setDrawColor(...C_LINE_COUPLE)
  doc.setLineWidth(Math.max(0.4, 0.7 * scale))
  for (const edge of layout.coupleEdges) {
    doc.line(tx(edge.x1), ty(edge.y1), tx(edge.x2), ty(edge.y2))
    // Point médian
    doc.setFillColor(...C_LINE_COUPLE)
    doc.circle(tx(edge.midX), ty(edge.y1), Math.max(0.6, 1 * scale), 'F')
  }

  // ─── Lignes parent-enfant : V (traits diagonaux directs)
  doc.setDrawColor(...C_LINE_PARENT)
  doc.setLineWidth(Math.max(0.3, 0.5 * scale))
  doc.setLineDashPattern([Math.max(0.8, 1.2 * scale), Math.max(0.5, 0.8 * scale)], 0)
  for (const edge of layout.parentEdges) {
    doc.line(tx(edge.x1), ty(edge.y1), tx(edge.x2), ty(edge.y2))
  }
  doc.setLineDashPattern([], 0)

  // ─── Nœuds
  for (const person of persons) {
    const pos = layout.positions.get(person.id)
    if (!pos) continue

    const nx = tx(pos.x)
    const ny = ty(pos.y)
    const nw = NODE_W * scale
    const nh = NODE_H * scale

    // Fond blanc + bordure
    doc.setFillColor(255, 255, 255)
    if (person.is_royal) {
      doc.setDrawColor(...C_GOLD)
      doc.setLineWidth(Math.max(0.5, 0.9 * scale))
    } else {
      doc.setDrawColor(...C_BORDER)
      doc.setLineWidth(Math.max(0.3, 0.5 * scale))
    }
    const radius = nw * 0.06
    doc.roundedRect(nx, ny, nw, nh, radius, radius, 'FD')

    // Photo carrée arrondie — proportionnelle à la carte
    const photoSize = Math.min(nw * 0.30, nh * 0.42)
    const photoX = nx + (nw - photoSize) / 2
    const photoY = ny + nh * 0.08

    const photo = photoCache.get(person.id)
    if (photo) {
      const format = photo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      try {
        doc.addImage(photo, format, photoX, photoY, photoSize, photoSize, undefined, 'FAST')
      } catch {
        drawInitialsBox(doc, person, photoX, photoY, photoSize, scale)
      }
    } else {
      drawInitialsBox(doc, person, photoX, photoY, photoSize, scale)
    }

    // Bordure photo
    const borderColor = person.is_royal ? C_GOLD : C_BORDER
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.setLineWidth(Math.max(0.2, 0.35 * scale))
    doc.roundedRect(photoX, photoY, photoSize, photoSize, photoSize * 0.12, photoSize * 0.12, 'S')

    // Couronne (en haut à droite)
    if (person.is_royal) {
      drawCrown(doc, nx + nw - nw * 0.08, ny + nh * 0.07, Math.max(1, nw * 0.035))
    }

    // Petit séparateur doré sous la photo
    const sepY = photoY + photoSize + nh * 0.05
    doc.setDrawColor(...C_GOLD)
    doc.setLineWidth(Math.max(0.15, 0.25 * scale))
    doc.line(nx + nw * 0.32, sepY, nx + nw * 0.68, sepY)

    // Tailles de police proportionnelles à la hauteur de carte
    const firstNameSize = Math.max(9, nh * 0.115)
    const lastNameSize = Math.max(7, nh * 0.085)
    const dateSize = Math.max(6, nh * 0.065)
    const titleSize = Math.max(5, nh * 0.055)

    // Bulle du titre royal (au-dessus du prénom, comme à l'écran)
    let firstNameY = sepY + nh * 0.10
    if (person.is_royal && person.royal_title) {
      const padX = nw * 0.06
      const padY = nh * 0.02
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(titleSize)
      const labelText = person.royal_title.toUpperCase()
      const textW = Math.min(doc.getTextWidth(labelText), nw - nw * 0.16)
      const pillW = textW + 2 * padX
      const pillH = titleSize * 0.7 + 2 * padY
      const pillX = nx + (nw - pillW) / 2
      const pillY = firstNameY - pillH * 0.6
      // fond doré clair
      doc.setFillColor(...C_GOLD_LIGHT)
      doc.setDrawColor(...C_GOLD)
      doc.setLineWidth(Math.max(0.15, 0.2 * scale))
      const pillR = pillH / 2
      doc.roundedRect(pillX, pillY, pillW, pillH, pillR, pillR, 'FD')
      // texte doré
      doc.setTextColor(...C_GOLD_DARK)
      doc.text(
        labelText,
        nx + nw / 2,
        pillY + pillH / 2 + titleSize * 0.22,
        { align: 'center', maxWidth: nw - nw * 0.16 },
      )
      // décale le prénom sous la bulle
      firstNameY = pillY + pillH + nh * 0.08
    }

    // Prénom
    doc.setFont('times', 'bold')
    doc.setFontSize(firstNameSize)
    doc.setTextColor(...C_INK)
    doc.text(person.first_name, nx + nw / 2, firstNameY, {
      align: 'center', maxWidth: nw - nw * 0.10,
    })

    // Nom
    const lastNameY = firstNameY + firstNameSize * 0.4 + nh * 0.05
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(lastNameSize)
    doc.setTextColor(...C_BROWN)
    doc.text(person.last_name, nx + nw / 2, lastNameY, {
      align: 'center', maxWidth: nw - nw * 0.10,
    })

    // Dates de vie
    let lifeText = ''
    if (person.birth_date && person.death_date) {
      lifeText = `${formatDateFR(person.birth_date)} / ${formatDateFR(person.death_date)}`
    } else if (person.birth_date) {
      lifeText = `né${person.gender === 'femme' ? 'e' : ''} en ${formatDateFR(person.birth_date)}`
    } else if (person.death_date) {
      lifeText = `† ${formatDateFR(person.death_date)}`
    }
    if (lifeText) {
      const dateY = lastNameY + lastNameSize * 0.4 + nh * 0.045
      doc.setFontSize(dateSize)
      doc.setTextColor(...C_LIGHT_BROWN)
      doc.text(lifeText, nx + nw / 2, dateY, {
        align: 'center', maxWidth: nw - nw * 0.10,
      })
    }
  }

  // ─── Pied de page
  doc.setFont('times', 'italic')
  doc.setFontSize(18)
  doc.setTextColor(...C_BROWN)
  doc.text(
    '" La mémoire d\'un peuple est la racine de son avenir. "',
    PAGE_W / 2, PAGE_H - 45,
    { align: 'center' },
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...C_LIGHT_BROWN)
  doc.text(
    `Archive familiale  ·  ${persons.length} membre${persons.length > 1 ? 's' : ''}`,
    PAGE_W / 2, PAGE_H - 28,
    { align: 'center' },
  )

  // ─── Téléchargement
  const familySlug = (familyLabel || 'youm').toLowerCase()
  const filename = `arbre-famille-${familySlug}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
