'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { Person, Relationship, Souvenir } from '@/lib/types'
import { computeLayout, NODE_W, NODE_H, type GenerationBand } from '@/lib/treeLayout'
import PersonNode from './PersonNode'
import { HelpCircle, X, Crown, ScrollText, UserPlus, ImageDown, Loader2, ArrowRight } from 'lucide-react'
import RoyalCrown from '@/components/icons/RoyalCrown'
import { cn } from '@/lib/utils'
import { useAdminMode } from '@/lib/useAdminMode'

interface FamilyTreeProps {
  persons: Person[]
  relationships: Relationship[]
  focalId?: string
  selectionMode?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  onPersonClick?: (person: Person) => void
  searchMatchIds?: Set<string> | null
  royalFilter?: boolean
  centerTargetId?: string | null
  onCenterDone?: () => void
  /** Map person_id → souvenirs[], pour afficher l'indicateur de souvenirs */
  souvenirsByPerson?: Map<string, Souvenir[]>
  /** Callback pour basculer le filtre "ancêtres royaux" depuis la légende */
  onToggleRoyalFilter?: () => void
  /** Filtre "récits familiaux" : assombrit les personnes sans récit */
  souvenirFilter?: boolean
  onToggleSouvenirFilter?: () => void
  /** Actions flottantes à droite (ajouter / télécharger) */
  onAddMember?: () => void
  onDownloadPdf?: () => void
  downloadingPdf?: boolean
  /** Ouvre le panneau des ancêtres royaux d'une génération donnée */
  onOpenRoyalGeneration?: (gen: GenerationBand) => void
  /** Masque la rangée d'actions en haut à droite (quand une sidebar les porte) */
  hideTopActions?: boolean
  /** État Légende contrôlé par le parent (prime sur l'état interne) */
  legendOpenControlled?: boolean
  onLegendClose?: () => void
}

export default function FamilyTree({
  persons,
  relationships,
  focalId,
  selectionMode = false,
  selectedIds = new Set(),
  onSelectionChange,
  onPersonClick,
  searchMatchIds = null,
  royalFilter = false,
  centerTargetId = null,
  onCenterDone,
  souvenirsByPerson,
  onToggleRoyalFilter,
  souvenirFilter = false,
  onToggleSouvenirFilter,
  onAddMember,
  onDownloadPdf,
  downloadingPdf = false,
  onOpenRoyalGeneration,
  hideTopActions = false,
  legendOpenControlled,
  onLegendClose,
}: FamilyTreeProps) {
  const transformRef = useRef<any>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { isAdmin } = useAdminMode()

  const layout = useMemo(
    () => computeLayout(persons, relationships, focalId),
    [persons, relationships, focalId]
  )

  // Bande à gauche : étiquettes de génération (gauche) + repères historiques (droite).
  const LEFT_LABEL_W = 380
  // La partie "Génération X / X royaux" prend la moitié gauche.
  const LEFT_LABELS_PART = 180
  // Marge droite minimale (plus de frise historique à droite).
  const RIGHT_TIMELINE_W = 40
  const treeContentW = Math.max(layout.width, 800)
  const canvasWidth = treeContentW + LEFT_LABEL_W + RIGHT_TIMELINE_W
  const treeHeight = Math.max(layout.height, 600)
  // Marge fixe au-dessus pour permettre un peu de scroll vers le haut sans
  // gaspiller la moitié du canvas en espace vide.
  const TOP_PADDING = 180 // + place pour le titre d'arbre doré
  const canvasHeight = treeHeight + TOP_PADDING

  // Position du focal pour le centrage initial
  const { focalCenterX, focalBottomY } = useMemo(() => {
    let maxRealY = -Infinity
    let fx = canvasWidth / 2
    let fy = canvasHeight
    for (const [, pos] of layout.positions) {
      const realY = pos.y + TOP_PADDING
      if (realY > maxRealY) {
        maxRealY = realY
        fx = pos.x + LEFT_LABEL_W + NODE_W / 2
        fy = realY + NODE_H
      }
    }
    return { focalCenterX: fx, focalBottomY: fy }
  }, [layout, canvasWidth, canvasHeight, TOP_PADDING, LEFT_LABEL_W, RIGHT_TIMELINE_W])

  // ─── Centrage initial : montre le HAUT de l'arbre (ancêtres anciens),
  //     avec le titre doré visible et les premières générations royales.
  const centerOnFocal = useCallback((animate = true) => {
    if (!transformRef.current) return
    const wrapper = transformRef.current?.instance?.wrapperComponent as HTMLDivElement | undefined
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()

    // Hauteur voulue sur l'écran : ~7 générations (dézoom confortable comme la vue d'aperçu)
    const visibleGens = 7
    const neededHeight = visibleGens * (NODE_H + 70) + TOP_PADDING
    // Largeur voulue : centrée sur l'axe focal, au moins 3 cartes
    const neededWidth = Math.max(canvasWidth * 0.65, 3 * (NODE_W + 36) + LEFT_LABEL_W + RIGHT_TIMELINE_W)
    const scaleY = (rect.height * 0.95) / neededHeight
    const scaleX = (rect.width * 0.98) / neededWidth
    const scale = Math.max(0.2, Math.min(scaleX, scaleY, 1))

    // Centrer horizontalement sur le milieu du canvas (axe focal)
    const centerCanvasX = focalCenterX
    const targetX = rect.width / 2 - centerCanvasX * scale
    // Caler le HAUT du canvas en haut de la vue (avec un petit padding)
    const targetY = 20 - 0 * scale
    transformRef.current?.setTransform(targetX, targetY, scale, animate ? 300 : 0)
  }, [focalCenterX, canvasWidth, LEFT_LABEL_W, RIGHT_TIMELINE_W, TOP_PADDING])

  // Centrage initial après chaque changement de layout/focal (sans pulse)
  useEffect(() => {
    if (persons.length === 0) return
    const t = setTimeout(() => centerOnFocal(false), 50)
    return () => { clearTimeout(t) }
  }, [layout, focalId, persons.length, centerOnFocal])

  // État légende (panneau dépliable). Si legendOpenControlled est passé par
  // le parent (ex. sidebar), il prime sur l'état interne.
  const [legendOpenLocal, setLegendOpenLocal] = useState(false)
  const legendOpen = legendOpenControlled !== undefined ? legendOpenControlled : legendOpenLocal
  const setLegendOpen = (v: boolean | ((o: boolean) => boolean)) => {
    if (legendOpenControlled !== undefined) {
      if (v === false || (typeof v === 'function' && !v(legendOpen))) onLegendClose?.()
    } else {
      setLegendOpenLocal(v as any)
    }
  }
  // Pulse doré sur le bouton Légende au chargement (2.5s) pour le découvrir
  const [legendButtonPulse, setLegendButtonPulse] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLegendButtonPulse(false), 2500)
    return () => clearTimeout(t)
  }, [])

  // Centrage sur une personne ciblée (depuis la recherche)
  useEffect(() => {
    if (!centerTargetId) return
    const pos = layout.positions.get(centerTargetId)
    if (!pos) {
      onCenterDone?.()
      return
    }
    const wrapper = transformRef.current?.instance?.wrapperComponent as HTMLDivElement | undefined
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const currentScale = transformRef.current?.instance?.transformState?.scale || 1
    const scale = Math.max(currentScale, 0.6)
    const targetX = rect.width / 2 - (pos.x + LEFT_LABEL_W + NODE_W / 2) * scale
    const targetY = rect.height / 2 - (pos.y + TOP_PADDING + NODE_H / 2) * scale
    transformRef.current?.setTransform(targetX, targetY, scale, 600)
    const t = setTimeout(() => onCenterDone?.(), 650)
    return () => clearTimeout(t)
  }, [centerTargetId, layout, onCenterDone, TOP_PADDING, LEFT_LABEL_W])

  // ─── Sélection rectangulaire
  const [selStart, setSelStart] = useState<{ x: number; y: number } | null>(null)
  const [selEnd, setSelEnd] = useState<{ x: number; y: number } | null>(null)
  const [didDrag, setDidDrag] = useState(false)

  function getWrapperLocal(e: React.MouseEvent | MouseEvent): { x: number; y: number } | null {
    const wrapper = transformRef.current?.instance?.wrapperComponent as HTMLDivElement | undefined
    if (!wrapper) return null
    const rect = wrapper.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startSelection = useCallback((e: React.MouseEvent) => {
    if (!selectionMode) return
    const local = getWrapperLocal(e)
    if (!local) return
    e.stopPropagation()
    setSelStart(local)
    setSelEnd(local)
    setDidDrag(false)
  }, [selectionMode])

  const moveSelection = useCallback((e: React.MouseEvent) => {
    if (!selectionMode || !selStart) return
    e.stopPropagation()
    const local = getWrapperLocal(e)
    if (!local) return
    setSelEnd(local)
    if (Math.abs(local.x - selStart.x) > 5 || Math.abs(local.y - selStart.y) > 5) {
      setDidDrag(true)
    }
  }, [selectionMode, selStart])

  const endSelection = useCallback((e: React.MouseEvent) => {
    if (!selectionMode || !selStart || !selEnd) {
      setSelStart(null); setSelEnd(null); setDidDrag(false)
      return
    }
    e.stopPropagation()

    if (!didDrag) {
      // Click simple : on toggle la personne sous le pointeur (s'il y en a une)
      setSelStart(null); setSelEnd(null); setDidDrag(false)
      return
    }

    const transformState = transformRef.current?.instance?.transformState
    if (!transformState) {
      setSelStart(null); setSelEnd(null); setDidDrag(false)
      return
    }

    const { positionX, positionY, scale } = transformState
    const minSx = Math.min(selStart.x, selEnd.x)
    const minSy = Math.min(selStart.y, selEnd.y)
    const maxSx = Math.max(selStart.x, selEnd.x)
    const maxSy = Math.max(selStart.y, selEnd.y)

    const newSelection = new Set(selectedIds)
    for (const [id, pos] of layout.positions) {
      const nodeX = (pos.x + LEFT_LABEL_W) * scale + positionX
      const nodeY = (pos.y + TOP_PADDING) * scale + positionY
      const nodeW = NODE_W * scale
      const nodeH = NODE_H * scale
      const intersects =
        nodeX + nodeW >= minSx &&
        nodeX <= maxSx &&
        nodeY + nodeH >= minSy &&
        nodeY <= maxSy
      if (intersects) newSelection.add(id)
    }
    onSelectionChange?.(newSelection)
    setSelStart(null); setSelEnd(null); setDidDrag(false)
  }, [selectionMode, selStart, selEnd, didDrag, selectedIds, layout, TOP_PADDING, LEFT_LABEL_W, onSelectionChange])

  return (
    <div className="relative w-full h-full bg-parchment-100 overflow-hidden rounded-xl" ref={wrapperRef}>
      {/* ─── Titre toujours visible : overlay flottant centré en haut, hors du canvas pan/zoom ─── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none pt-5 pb-3 bg-gradient-to-b from-parchment-100 via-parchment-100/95 to-transparent">
        <h1
          className="text-center font-display italic font-bold leading-none"
          style={{
            fontSize: 'clamp(28px, 3.6vw, 56px)',
            background: 'linear-gradient(180deg, #E8B547 0%, #8B6214 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.01em',
          }}
        >
          Arbre généalogique de la famille Youm
        </h1>
        {/* Ornement : trait d'or + losange central */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="w-32 h-px bg-royal-gold/50" />
          <span
            className="w-2 h-2 rotate-45"
            style={{ backgroundColor: '#C4922A', opacity: 0.75 }}
          />
          <span className="w-32 h-px bg-royal-gold/50" />
        </div>
      </div>

      <div className={cn("absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5", hideTopActions && "hidden")}>
        {isAdmin && onAddMember && (
          <button
            onClick={onAddMember}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-display italic text-xs text-heritage-brown hover:bg-parchment-200/60 hover:text-heritage-ink transition-colors"
            title="Ajouter un parent"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Ajouter un parent</span>
          </button>
        )}
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-display italic text-xs text-heritage-brown hover:bg-parchment-200/60 hover:text-heritage-ink transition-colors disabled:opacity-50"
            title="Télécharger l'arbre"
          >
            {downloadingPdf
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <ImageDown className="w-3.5 h-3.5" />}
            <span>Télécharger</span>
          </button>
        )}
        <button
          onClick={() => {
            setLegendOpen(o => !o)
            setLegendButtonPulse(false)
          }}
          className={cn(
            'relative inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-display italic text-xs transition-colors',
            legendOpen
              ? 'bg-heritage-ink text-white'
              : 'text-heritage-brown hover:bg-parchment-200/60 hover:text-heritage-ink',
          )}
          title="Légende"
        >
          {/* Pulse doré au chargement pour attirer l'œil */}
          {legendButtonPulse && !legendOpen && (
            <>
              <span
                className="absolute inset-0 rounded-full pointer-events-none ring-2 ring-royal-gold"
                style={{ animation: 'youm-pulse-ring 1.6s ease-out 2' }}
              />
              <span
                className="absolute -inset-1 rounded-full pointer-events-none"
                style={{
                  boxShadow: '0 0 14px 2px rgba(196, 146, 42, 0.5)',
                  animation: 'youm-pulse-glow 1.6s ease-out 2',
                }}
              />
            </>
          )}
          <HelpCircle className="w-3.5 h-3.5 relative z-10" />
          <span className="relative z-10">Légende</span>
        </button>
      </div>

      {/* Panneau Légende — items cliquables = boutons de filtre */}
      {legendOpen && (
        <div className="absolute top-14 right-4 z-30 w-72 bg-white rounded-2xl shadow-warm-xl border-2 border-parchment-400 p-3 animate-fade-in">
          <div className="flex justify-end mb-1">
            <button
              onClick={() => setLegendOpen(false)}
              className="p-1 rounded-md text-heritage-brown hover:bg-parchment-100"
              aria-label="Fermer la légende"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => onToggleRoyalFilter?.()}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors text-left',
                  royalFilter
                    ? 'bg-royal-gold-light border border-royal-gold/40'
                    : 'hover:bg-parchment-100 border border-transparent',
                )}
              >
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#FFD43B' }}
                >
                  <Crown className="w-3.5 h-3.5 text-heritage-ink" fill="currentColor" fillOpacity={0.2} />
                </span>
                <span className="flex-1 text-xs font-semibold text-heritage-ink">
                  Ancêtre royal
                </span>
                {royalFilter && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-royal-gold-dark">
                    Filtré
                  </span>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onToggleSouvenirFilter?.()}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors text-left',
                  souvenirFilter
                    ? 'bg-heritage-green/10 border border-heritage-green/30'
                    : 'hover:bg-parchment-100 border border-transparent',
                )}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-heritage-green flex items-center justify-center text-white">
                  <ScrollText className="w-3.5 h-3.5" strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-xs font-semibold text-heritage-ink">
                  Récit familial disponible
                </span>
                {souvenirFilter && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-heritage-green">
                    Filtré
                  </span>
                )}
              </button>
            </li>
          </ul>
        </div>
      )}

      <TransformWrapper
        ref={transformRef}
        initialScale={0.5}
        minScale={0.15}
        maxScale={3}
        wheel={{ step: 0.1, disabled: selectionMode }}
        pinch={{ step: 5, disabled: selectionMode }}
        panning={{ disabled: selectionMode }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: canvasWidth, height: canvasHeight }}
        >
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
            style={{ overflow: 'visible' }}
          >
            {/* Dégradé or réutilisable (le titre est désormais HTML en overlay) */}
            <defs>
              <linearGradient id="youm-gold-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8B547" />
                <stop offset="100%" stopColor="#8B6214" />
              </linearGradient>
            </defs>

            {/* Bandes de générations : ligne solide dorée très pâle avec losange central ornemental. */}
            {layout.generations
              .filter(g => g.depth >= 1)
              .map(gen => {
                const sepY = gen.yTop + TOP_PADDING - 36
                const midX = canvasWidth / 2
                return (
                  <g key={`gen-sep-${gen.depth}`}>
                    <line
                      x1={LEFT_LABEL_W - 10} y1={sepY}
                      x2={midX - 10} y2={sepY}
                      stroke="#C4922A" strokeWidth={0.9} opacity={0.35}
                    />
                    <line
                      x1={midX + 10} y1={sepY}
                      x2={canvasWidth - RIGHT_TIMELINE_W + 10} y2={sepY}
                      stroke="#C4922A" strokeWidth={0.9} opacity={0.35}
                    />
                    <polygon
                      points={`${midX},${sepY - 5} ${midX + 5},${sepY} ${midX},${sepY + 5} ${midX - 5},${sepY}`}
                      fill="#C4922A" opacity={0.5}
                    />
                  </g>
                )
              })}

            {/* Tout le reste (arêtes + couples + cousins) est décalé de LEFT_LABEL_W */}
            <g transform={`translate(${LEFT_LABEL_W}, 0)`}>
              {layout.coupleEdges.map((edge, i) => (
                <g key={`couple-${i}`}>
                  <line
                    x1={edge.x1} y1={edge.y1 + TOP_PADDING}
                    x2={edge.x2} y2={edge.y2 + TOP_PADDING}
                    stroke="#B8A07A"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                  <circle cx={edge.midX} cy={edge.y1 + TOP_PADDING} r={3} fill="#B8A07A" />
                </g>
              ))}

              {layout.parentEdges.map((edge, i) => (
                <line
                  key={`parent-${i}`}
                  x1={edge.x1} y1={edge.y1 + TOP_PADDING}
                  x2={edge.x2} y2={edge.y2 + TOP_PADDING}
                  stroke="#C7B59A"
                  strokeWidth={1.6}
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                />
              ))}

              {/* Liens cousin : pointillés terracotta horizontaux */}
              {layout.cousinEdges.map((edge, i) => (
                <g key={`cousin-${i}`}>
                  <line
                    x1={edge.x1} y1={edge.y1 + TOP_PADDING}
                    x2={edge.x2} y2={edge.y2 + TOP_PADDING}
                    stroke="#A0522D"
                    strokeWidth={1.5}
                    strokeDasharray="3 5"
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  <text
                    x={(edge.x1 + edge.x2) / 2}
                    y={(edge.y1 + edge.y2) / 2 + TOP_PADDING - 6}
                    textAnchor="middle"
                    fontFamily="Georgia, serif"
                    fontSize="9"
                    fontStyle="italic"
                    fill="#A0522D"
                    opacity={0.85}
                  >
                    cousin·s
                  </text>
                </g>
              ))}
            </g>
          </svg>

          {/* Étiquettes de génération — à gauche du canvas, chiffre en Playfair
              italique + bouton couronne optionnel. */}
          {layout.generations.map(gen => {
            const bandCenterY = gen.yTop + TOP_PADDING + NODE_H / 2
            const hasRoyals = gen.royalCount > 0
            const kingdomsText = Object.entries(gen.royalsByKingdom)
              .filter(([, ids]) => (ids?.length ?? 0) > 0)
              .map(([k, ids]) => `${ids!.length} du ${k}`)
              .join(', ')
            return (
              <div
                key={`gen-label-${gen.depth}`}
                className="absolute pointer-events-none select-none"
                style={{
                  left: 0,
                  top: bandCenterY - 40,
                  width: LEFT_LABELS_PART,
                  height: 90,
                  textAlign: 'center',
                }}
              >
                <div
                  className="font-display italic text-heritage-brown/70 leading-tight whitespace-nowrap"
                  style={{ fontSize: '28px', letterSpacing: '0.01em' }}
                  title={gen.depth === 0 ? "Génération N (vous)" : `${gen.depth}ᵉ génération d'ancêtres`}
                >
                  Génération {gen.label}
                </div>
                {hasRoyals && (
                  <button
                    type="button"
                    onClick={() => onOpenRoyalGeneration?.(gen)}
                    className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 font-display italic font-bold hover:underline hover:scale-[1.03] transition-transform"
                    style={{ color: '#6B4A0F', fontSize: '20px' }}
                    title={`Voir les ancêtres royaux de cette génération : ${kingdomsText}`}
                  >
                    <RoyalCrown className="w-5 h-5" />
                    <span>{gen.royalCount} roya{gen.royalCount > 1 ? 'ux' : 'l'}</span>
                  </button>
                )}
              </div>
            )
          })}

          {/* ─── Repères historiques carmin à GAUCHE (entre labels Génération et arbre) ─── */}
          {(() => {
            const CARMINE = '#B91C1C'
            const CARMINE_SOFT = '#991B1B'
            const HISTORY_EVENTS = [
              { year: '1547', text: 'Naissance du Cayor', personId: '55b8dc54-33d6-4b7f-ae44-1492ed0a3002', big: true },
              { year: '1864', text: 'Le Cayor devient musulman', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f', big: false, yOffset: -NODE_H / 2 - 20 },
              { year: '1883', text: 'Protectorat français du Baol', personId: null, big: false, yOffset: NODE_H / 2 - 10 },
              { year: '1886', text: 'Fin du Cayor', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f', big: true, yOffset: NODE_H + 30 },
            ] as const

            // Zone horizontale réservée aux repères : entre les labels (LEFT_LABELS_PART) et l'arbre (LEFT_LABEL_W).
            const markerLeft = LEFT_LABELS_PART + 8
            const markerWidth = LEFT_LABEL_W - LEFT_LABELS_PART - 16 // -arrow space

            return HISTORY_EVENTS.map((ev, i) => {
              let anchorY: number | null = null
              if (ev.personId) {
                const pos = layout.positions.get(ev.personId)
                if (pos) anchorY = pos.y + TOP_PADDING + NODE_H / 2
              }
              if (anchorY == null) {
                const span = canvasHeight - TOP_PADDING - 100
                anchorY = TOP_PADDING + 40 + (i / Math.max(1, HISTORY_EVENTS.length - 1)) * span
              }
              const yOffset = ('yOffset' in ev && typeof ev.yOffset === 'number') ? ev.yOffset : 0
              const finalY = anchorY + yOffset
              const yearSize = ev.big ? 22 : 15
              const textSize = ev.big ? 14 : 11
              return (
                <div
                  key={`history-${i}`}
                  className="absolute pointer-events-none select-none flex items-center gap-1.5"
                  style={{
                    left: markerLeft,
                    top: finalY - yearSize / 2 - 2,
                    width: markerWidth,
                    color: CARMINE,
                  }}
                >
                  <div className="flex-1 min-w-0 text-right">
                    <div
                      className="font-display italic font-bold leading-tight"
                      style={{ fontSize: `${yearSize}px`, color: CARMINE_SOFT }}
                    >
                      {ev.year}
                    </div>
                    <div
                      className="font-display italic leading-tight"
                      style={{ fontSize: `${textSize}px`, color: CARMINE, opacity: 0.95 }}
                    >
                      {ev.text}
                    </div>
                  </div>
                  <ArrowRight
                    className="flex-shrink-0"
                    style={{ color: CARMINE, opacity: 0.9 }}
                    strokeWidth={2.2}
                    width={ev.big ? 20 : 15}
                    height={ev.big ? 20 : 15}
                  />
                </div>
              )
            })
          })()}

          {persons.map(person => {
            const pos = layout.positions.get(person.id)
            if (!pos) return null
            return (
              <div
                key={person.id}
                className="tree-node"
                style={{
                  left: pos.x + LEFT_LABEL_W,
                  top: pos.y + TOP_PADDING,
                  width: NODE_W,
                  height: NODE_H,
                }}
              >
                <PersonNode
                  person={person}
                  isAdmin={isAdmin}
                  selected={selectedIds.has(person.id)}
                  dimmed={
                    (royalFilter && !person.is_royal) ||
                    (souvenirFilter && !(souvenirsByPerson?.get(person.id)?.length)) ||
                    (!!searchMatchIds && !searchMatchIds.has(person.id))
                  }
                  highlighted={!!searchMatchIds?.has(person.id)}
                  souvenirs={souvenirsByPerson?.get(person.id) || []}
                  onClick={() => {
                    if (selectionMode) {
                      const next = new Set(selectedIds)
                      if (next.has(person.id)) next.delete(person.id)
                      else next.add(person.id)
                      onSelectionChange?.(next)
                    } else {
                      onPersonClick?.(person)
                    }
                  }}
                />
              </div>
            )
          })}
        </TransformComponent>
      </TransformWrapper>

      {/* Couche de capture pour la sélection rectangulaire */}
      {selectionMode && (
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: 'crosshair' }}
          onMouseDown={startSelection}
          onMouseMove={moveSelection}
          onMouseUp={endSelection}
          onMouseLeave={endSelection}
        />
      )}

      {/* Rectangle de sélection (overlay) */}
      {selectionMode && selStart && selEnd && didDrag && (
        <div
          className="absolute pointer-events-none border-2 border-terracotta-500 bg-terracotta-500/10 rounded-sm z-20"
          style={{
            left: Math.min(selStart.x, selEnd.x),
            top: Math.min(selStart.y, selEnd.y),
            width: Math.abs(selEnd.x - selStart.x),
            height: Math.abs(selEnd.y - selStart.y),
          }}
        />
      )}

    </div>
  )
}
