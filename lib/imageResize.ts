'use client'

/**
 * Redimensionne une image côté client avant upload :
 * - réduit la dimension max (≤ maxDim) pour alléger le fichier
 * - exporte en JPEG (qualité paramétrable) sauf si transparence (alors PNG)
 * - normalise le nom de fichier en kebab-case + extension propre
 *
 * Améliore drastiquement la vitesse de chargement des pages (photos < 200 Ko
 * en général, vs ~5 Mo pour une photo brute de téléphone).
 */

export interface ResizeOptions {
  /** Dimension max (côté le plus long) en pixels. Défaut 1024. */
  maxDim?: number
  /** Qualité JPEG entre 0 et 1. Défaut 0.85. */
  quality?: number
  /** Nom de base souhaité (ex. "babacar-youm"). Si absent, dérivé du nom du fichier. */
  baseName?: string
}

/** Slugifie un nom : "Babacar YOUM" → "babacar-youm" */
export function slugifyName(input: string): string {
  return (input || 'photo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'photo'
}

export async function resizeImage(file: File, opts: ResizeOptions = {}): Promise<File> {
  const maxDim = opts.maxDim ?? 1024
  const quality = opts.quality ?? 0.85
  const baseName = opts.baseName
    ? slugifyName(opts.baseName)
    : slugifyName(file.name.replace(/\.[^.]+$/, ''))

  // Si SVG ou GIF, on garde tel quel (pas de redimensionnement)
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  // Charge l'image
  const url = URL.createObjectURL(file)
  let img: HTMLImageElement
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Image illisible'))
      i.src = url
    })
  } finally {
    // Libérer l'objet URL pour ne pas leaker
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // Calcule les dimensions cibles
  let { width, height } = img
  if (width <= maxDim && height <= maxDim) {
    // Déjà assez petite — on ne redimensionne pas, mais on ré-encode quand
    // même en JPEG pour normaliser (sauf PNG transparente).
    // Sauf si la taille brute est déjà raisonnable (< 200 Ko), on garde tel quel.
    if (file.size < 200 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const ext = file.type === 'image/png' ? 'png' : 'jpg'
      return new File([file], `${baseName}.${ext}`, { type: file.type })
    }
  } else if (width > height) {
    height = Math.round((height * maxDim) / width)
    width = maxDim
  } else {
    width = Math.round((width * maxDim) / height)
    height = maxDim
  }

  // Dessine sur un canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  // Export
  const targetType = 'image/jpeg'
  const ext = 'jpg'
  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, targetType, quality),
  )
  if (!blob) throw new Error('Conversion image échouée')

  return new File([blob], `${baseName}.${ext}`, { type: targetType })
}
