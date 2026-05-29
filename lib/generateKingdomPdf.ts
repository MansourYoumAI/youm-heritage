import jsPDF from 'jspdf'
import type { Kingdom, Person } from './types'
import { parseYearFromDate } from './utils'

// A4 portrait en mm
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_X = 18
const MARGIN_Y = 18
const CONTENT_W = PAGE_W - 2 * MARGIN_X

// Couleurs
const C_PARCHMENT = [249, 246, 239] as const
const C_INK = [26, 15, 0] as const
const C_BROWN = [112, 88, 64] as const
const C_LIGHT_BROWN = [160, 140, 120] as const
const C_GOLD = [196, 146, 42] as const
const C_GOLD_LIGHT = [245, 233, 196] as const
const C_GOLD_DARK = [139, 98, 20] as const
const C_BORDER = [224, 208, 184] as const
const C_WHITE = [255, 255, 255] as const

async function loadImageAsBase64(url: string): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    const blob = await res.blob()
    const data = await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
    if (!data) return null
    const format = data.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    return { data, format }
  } catch {
    return null
  }
}

/** Rasterise le SVG de la carte (présent dans le DOM via SenegalMap)
 *  en PNG base64 pour pouvoir l'embarquer dans le PDF. */
async function rasterizeSvgFromDom(svgId: string, width = 1200): Promise<string | null> {
  if (typeof document === 'undefined') return null
  const svg = document.getElementById(svgId) as SVGSVGElement | null
  if (!svg) return null
  const clone = svg.cloneNode(true) as SVGSVGElement
  // Assure une taille intrinsèque pour le rendu
  clone.setAttribute('width', String(width))
  const vb = clone.getAttribute('viewBox')
  let height = width
  if (vb) {
    const parts = vb.split(/\s+/).map(Number)
    if (parts.length === 4 && parts[2] > 0) {
      height = Math.round((parts[3] / parts[2]) * width)
    }
  }
  clone.setAttribute('height', String(height))

  const xml = new XMLSerializer().serializeToString(clone)
  const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)))

  return new Promise<string | null>(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.fillStyle = '#fdfcf8'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = svg64
  })
}

function drawDecorativeBorder(doc: jsPDF) {
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.4)
  const m = 7
  doc.rect(m, m, PAGE_W - 2 * m, PAGE_H - 2 * m)
  doc.setLineWidth(0.15)
  doc.rect(m + 2, m + 2, PAGE_W - 2 * m - 4, PAGE_H - 2 * m - 4)
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number, kingdomName: string) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C_LIGHT_BROWN)
  doc.text(`${kingdomName}`, MARGIN_X, PAGE_H - 10)
  doc.text(`Page ${pageNum} / ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - 10, { align: 'right' })
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.text(`Édition du ${today}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' })
}

/** Ajoute une nouvelle page avec fond et bordure, retourne le Y de départ. */
function startPage(doc: jsPDF): number {
  doc.setFillColor(...C_PARCHMENT)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
  drawDecorativeBorder(doc)
  return MARGIN_Y
}

/** Vérifie qu'il reste assez de place verticale, sinon saute de page. */
function ensureSpace(
  doc: jsPDF,
  currentY: number,
  needed: number,
  onNewPage: () => number,
): number {
  if (currentY + needed > PAGE_H - MARGIN_Y - 8) {
    doc.addPage()
    return onNewPage()
  }
  return currentY
}

export async function downloadKingdomPdf(
  kingdom: Kingdom,
  rulers: Person[],
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  // ─── Chargement des images en parallèle (carte custom + photos souverains)
  const [mapImage, ...rulerPhotos] = await Promise.all([
    kingdom.map_image_url
      ? loadImageAsBase64(kingdom.map_image_url)
      : rasterizeSvgFromDom('kingdom-map-svg').then(d => d ? { data: d, format: 'PNG' as const } : null),
    ...rulers.map(r => r.profile_picture_url ? loadImageAsBase64(r.profile_picture_url) : Promise.resolve(null)),
  ])

  // ─── Page 1 : Hero + Essentiel + Carte + Repères clés
  let y = startPage(doc)

  // Bande dorée en haut (decorative)
  doc.setFillColor(...C_GOLD_LIGHT)
  doc.rect(MARGIN_X, y, CONTENT_W, 2, 'F')
  y += 6

  // En-tête : emblème + nom
  doc.setFont('times', 'bold')
  doc.setFontSize(34)
  doc.setTextColor(...C_INK)
  doc.text(kingdom.emblem || '👑', MARGIN_X + 2, y + 8)

  doc.setFontSize(24)
  doc.text(kingdom.name, MARGIN_X + 20, y + 7, { maxWidth: CONTENT_W - 22 })
  y += 13

  // Période + localisation
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C_BROWN)
  doc.text(`${kingdom.period}  ·  ${kingdom.location}`, MARGIN_X + 20, y, { maxWidth: CONTENT_W - 22 })
  y += 8

  // Trait doré séparateur
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.4)
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
  y += 6

  // ─── L'essentiel (encadré doré)
  const tldrLines = doc.splitTextToSize(kingdom.tldr, CONTENT_W - 12) as string[]
  const tldrH = 12 + tldrLines.length * 5.2
  doc.setFillColor(...C_GOLD_LIGHT)
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.3)
  doc.roundedRect(MARGIN_X, y, CONTENT_W, tldrH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C_GOLD_DARK)
  doc.text("L'ESSENTIEL", MARGIN_X + 6, y + 6)

  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(...C_INK)
  doc.text(tldrLines, MARGIN_X + 6, y + 11)
  y += tldrH + 8

  // ─── Carte (~75mm de haut)
  if (mapImage) {
    // Calcul de la hauteur en fonction du ratio
    const mapH = 75
    const mapW = CONTENT_W
    try {
      doc.addImage(mapImage.data, mapImage.format, MARGIN_X, y, mapW, mapH, undefined, 'FAST')
      doc.setDrawColor(...C_BORDER)
      doc.setLineWidth(0.2)
      doc.rect(MARGIN_X, y, mapW, mapH)
    } catch {
      // Ignore en cas d'échec
    }
    y += mapH + 6
  }

  // ─── Repères clés (grille 2×2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C_INK)
  doc.text('Repères clés', MARGIN_X, y)
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.6)
  doc.line(MARGIN_X, y + 1.5, MARGIN_X + 30, y + 1.5)
  y += 6

  const chipsPerRow = 2
  const chipGap = 4
  const chipW = (CONTENT_W - chipGap) / chipsPerRow
  const chipH = 14
  kingdom.key_facts.forEach((f, i) => {
    const col = i % chipsPerRow
    const row = Math.floor(i / chipsPerRow)
    const cx = MARGIN_X + col * (chipW + chipGap)
    const cy = y + row * (chipH + chipGap)
    doc.setFillColor(...C_WHITE)
    doc.setDrawColor(...C_BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(cx, cy, chipW, chipH, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...C_BROWN)
    doc.text(f.label.toUpperCase(), cx + 3, cy + 4.5, { maxWidth: chipW - 6 })

    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C_INK)
    doc.text(f.value, cx + 3, cy + 10.5, { maxWidth: chipW - 6 })
  })
  const rows = Math.ceil(kingdom.key_facts.length / chipsPerRow)
  y += rows * (chipH + chipGap) + 6

  // ─── Histoire détaillée
  y = ensureSpace(doc, y, 30, () => startPage(doc))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C_INK)
  doc.text('Histoire détaillée', MARGIN_X, y)
  doc.setDrawColor(...C_GOLD)
  doc.setLineWidth(0.8)
  doc.line(MARGIN_X, y + 2, MARGIN_X + 45, y + 2)
  y += 8

  kingdom.details.forEach((d, i) => {
    const titleSize = 11
    const bodyLines = doc.splitTextToSize(d.body, CONTENT_W - 4) as string[]
    const blockH = 6 + 5 + bodyLines.length * 4.5 + 6
    y = ensureSpace(doc, y, blockH, () => startPage(doc))

    // Numéro
    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C_GOLD_DARK)
    doc.text(String(i + 1).padStart(2, '0'), MARGIN_X, y)

    // Titre de section
    doc.setFont('times', 'bold')
    doc.setFontSize(titleSize)
    doc.setTextColor(...C_INK)
    doc.text(d.title, MARGIN_X + 8, y, { maxWidth: CONTENT_W - 8 })
    y += 5.5

    // Corps
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...C_BROWN)
    doc.text(bodyLines, MARGIN_X + 8, y, { maxWidth: CONTENT_W - 8 })
    y += bodyLines.length * 4.5 + 6
  })

  // ─── Souverains de la famille
  if (rulers.length > 0) {
    y = ensureSpace(doc, y, 30, () => startPage(doc))
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...C_INK)
    doc.text('Souverains de la famille Youm', MARGIN_X, y)
    doc.setDrawColor(...C_GOLD)
    doc.setLineWidth(0.8)
    doc.line(MARGIN_X, y + 2, MARGIN_X + 70, y + 2)
    y += 8

    rulers.forEach((p, i) => {
      const itemH = 16
      y = ensureSpace(doc, y, itemH + 2, () => startPage(doc))

      // Fond
      doc.setFillColor(...C_WHITE)
      doc.setDrawColor(...C_BORDER)
      doc.setLineWidth(0.2)
      doc.roundedRect(MARGIN_X, y, CONTENT_W, itemH, 1.5, 1.5, 'FD')

      // Numéro chronologique
      doc.setFillColor(...C_GOLD_LIGHT)
      doc.circle(MARGIN_X + 6, y + itemH / 2, 3.5, 'F')
      doc.setFont('times', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C_GOLD_DARK)
      doc.text(String(i + 1), MARGIN_X + 6, y + itemH / 2 + 1.1, { align: 'center' })

      // Avatar (photo ou initiales)
      const ax = MARGIN_X + 12
      const ay = y + 2.5
      const as = 11
      const photo = rulerPhotos[i] as { data: string; format: 'PNG' | 'JPEG' } | null
      if (photo) {
        try {
          doc.addImage(photo.data, photo.format, ax, ay, as, as, undefined, 'FAST')
        } catch {
          // fallback initiales
          doc.setFillColor(...C_GOLD_LIGHT)
          doc.roundedRect(ax, ay, as, as, 1.5, 1.5, 'F')
          doc.setFont('times', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...C_GOLD_DARK)
          doc.text(
            `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase(),
            ax + as / 2, ay + as / 2 + 1.5,
            { align: 'center' },
          )
        }
      } else {
        doc.setFillColor(...C_GOLD_LIGHT)
        doc.roundedRect(ax, ay, as, as, 1.5, 1.5, 'F')
        doc.setFont('times', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...C_GOLD_DARK)
        doc.text(
          `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase(),
          ax + as / 2, ay + as / 2 + 1.5,
          { align: 'center' },
        )
      }
      doc.setDrawColor(...C_GOLD)
      doc.setLineWidth(0.3)
      doc.roundedRect(ax, ay, as, as, 1.5, 1.5, 'S')

      // Nom
      const tx = ax + as + 4
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...C_INK)
      doc.text(`${p.first_name} ${p.last_name}`, tx, y + 6, { maxWidth: CONTENT_W - (tx - MARGIN_X) - 30 })

      // Bulle titre royal
      if (p.royal_title) {
        const titleStr = p.royal_title.toUpperCase()
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        const w = Math.min(doc.getTextWidth(titleStr), CONTENT_W - (tx - MARGIN_X) - 30)
        const padX = 1.8
        const pillH = 3.8
        doc.setFillColor(...C_GOLD_LIGHT)
        doc.setDrawColor(...C_GOLD)
        doc.setLineWidth(0.15)
        doc.roundedRect(tx, y + 8, w + 2 * padX, pillH, pillH / 2, pillH / 2, 'FD')
        doc.setTextColor(...C_GOLD_DARK)
        doc.text(titleStr, tx + padX, y + 10.6, { maxWidth: w })
      }

      // Année
      const year = parseYearFromDate(p.birth_date) ?? parseYearFromDate(p.death_date)
      if (year != null) {
        doc.setFont('courier', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...C_BROWN)
        doc.text(String(year), MARGIN_X + CONTENT_W - 3, y + itemH / 2 + 1.5, { align: 'right' })
      }

      y += itemH + 2
    })
  }

  // ─── Footer sur toutes les pages
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    drawFooter(doc, i, total, kingdom.name)
  }

  const slug = kingdom.slug
  const filename = `${slug}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
