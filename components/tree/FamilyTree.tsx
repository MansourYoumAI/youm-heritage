'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { Person, Relationship, Souvenir } from '@/lib/types'
import { computeLayout, NODE_W, NODE_H, type GenerationBand } from '@/lib/treeLayout'
import PersonNode from './PersonNode'
import { HelpCircle, X, Crown, ScrollText, UserPlus, ImageDown, Loader2, ArrowLeft } from 'lucide-react'
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
  // État du pan/zoom pour positionner les overlays sticky (générations à gauche,
  // marqueurs historiques, barres de scroll)
  const [transformState, setTransformState] = useState({ positionX: 0, positionY: 0, scale: 0.5 })

  // Détection mobile (viewport < 768px) — change le canvas et le zoom initial
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const layout = useMemo(
    () => computeLayout(persons, relationships, focalId),
    [persons, relationships, focalId]
  )

  // Bande à gauche : étiquettes de génération (gauche) + repères historiques (droite).
  // Sur mobile ces colonnes sont masquées → pas de gutter réservée.
  const LEFT_LABEL_W = isMobile ? 0 : 380
  const LEFT_LABELS_PART = 180
  const RIGHT_TIMELINE_W = isMobile ? 0 : 40
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

  // ─── Centrage initial : viser ~5 générations visibles, centré sur le focal.
  const centerOnFocal = useCallback((animate = true) => {
    if (!transformRef.current) return
    const wrapper = transformRef.current?.instance?.wrapperComponent as HTMLDivElement | undefined
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()

    // Objectif : ~5 générations dans la hauteur. La largeur reste bornée par le
    // canvas pour éviter une vue plus large que l'arbre ne le permet.
    const visibleGens = 5
    const neededHeight = visibleGens * (NODE_H + 70) + 40
    const scaleY = (rect.height * 0.92) / neededHeight
    const scaleX = (rect.width * 0.98) / canvasWidth
    const scale = Math.max(0.15, Math.min(scaleX, scaleY, 1.1))

    // Mobile : centre sur le focal (Mansour) horizontalement et verticalement.
    // Desktop : milieu du canvas horizontalement (pour voir les gutters), focal en bas.
    if (isMobile) {
      const targetX = rect.width / 2 - focalCenterX * scale
      const targetY = rect.height / 2 - (focalBottomY - NODE_H / 2) * scale
      transformRef.current?.setTransform(targetX, targetY, scale, animate ? 300 : 0)
    } else {
      const targetX = rect.width / 2 - (canvasWidth / 2) * scale
      const targetY = rect.height - (focalBottomY + 20) * scale
      transformRef.current?.setTransform(targetX, Math.min(20, targetY), scale, animate ? 300 : 0)
    }
  }, [canvasWidth, isMobile, focalCenterX, focalBottomY])

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
      {/* ─── Bouton couronne discret (mobile uniquement) : ouvre la plus ancienne génération royale ─── */}
      {(() => {
        const oldestRoyalGen = [...layout.generations]
          .filter(g => g.royalCount > 0)
          .sort((a, b) => b.depth - a.depth)[0]
        if (!oldestRoyalGen || !onOpenRoyalGeneration) return null
        return (
          <button
            onClick={() => onOpenRoyalGeneration(oldestRoyalGen)}
            className="md:hidden fixed top-3 right-3 z-50 w-10 h-10 rounded-full bg-parchment-50 border border-royal-gold/40 shadow-warm-md flex items-center justify-center text-royal-gold-dark hover:bg-royal-gold-light transition-colors"
            aria-label="Voir les ancêtres royaux"
            title="Ancêtres royaux"
          >
            <Crown className="w-5 h-5" fill="currentColor" fillOpacity={0.2} />
          </button>
        )
      })()}

      {/* ─── Titre toujours visible : overlay flottant centré en haut, hors du canvas pan/zoom ─── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none pt-3 pb-2 bg-gradient-to-b from-parchment-100 via-parchment-100/95 to-transparent">
        <h1
          className="text-center font-display italic font-bold leading-none"
          style={{
            fontSize: 'clamp(14px, 1.4vw, 20px)',
            background: 'linear-gradient(180deg, #E8B547 0%, #8B6214 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.02em',
          }}
        >
          Arbre généalogique de la famille Youm
        </h1>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <span className="w-14 h-px bg-royal-gold/50" />
          <span
            className="w-1.5 h-1.5 rotate-45"
            style={{ backgroundColor: '#C4922A', opacity: 0.75 }}
          />
          <span className="w-14 h-px bg-royal-gold/50" />
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
        minScale={0.12}
        maxScale={3}
        wheel={{ step: 0.1, disabled: selectionMode }}
        pinch={{ step: 5, disabled: selectionMode }}
        panning={{ disabled: selectionMode }}
        doubleClick={{ disabled: true }}
        onTransformed={(_ref, state) => {
          setTransformState({ positionX: state.positionX, positionY: state.positionY, scale: state.scale })
        }}
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
                  stroke="#B8A07A"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              ))}

              {/* Liens cousin : trait continu terracotta horizontaux */}
              {layout.cousinEdges.map((edge, i) => (
                <g key={`cousin-${i}`}>
                  <line
                    x1={edge.x1} y1={edge.y1 + TOP_PADDING}
                    x2={edge.x2} y2={edge.y2 + TOP_PADDING}
                    stroke="#B8A07A"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    opacity={0.75}
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

          {/* Les étiquettes de générations et marqueurs historiques sont désormais
              rendus OUTSIDE TransformComponent (voir ci-dessous) pour rester fixes
              à gauche de la vue, même en pannant horizontalement. */}

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

      {/* ─── Colonne GAUCHE : étiquettes génération compactes (cachée sur mobile) ─── */}
      {(() => {
        const COL_W_LEFT = 90
        return (
          <div
            className="hidden md:block absolute left-0 top-16 bottom-10 pointer-events-none z-10 overflow-hidden"
            style={{ width: COL_W_LEFT }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(248,243,228,0.97) 0%, rgba(248,243,228,0.9) 70%, rgba(248,243,228,0) 100%)',
              }}
            />
            {layout.generations.map(gen => {
              const bandCenterCanvasY = gen.yTop + TOP_PADDING + NODE_H / 2
              const screenY = bandCenterCanvasY * transformState.scale + transformState.positionY - 64
              const hasRoyals = gen.royalCount > 0
              const kingdomsText = Object.entries(gen.royalsByKingdom)
                .filter(([, ids]) => (ids?.length ?? 0) > 0)
                .map(([k, ids]) => `${ids!.length} du ${k}`)
                .join(', ')
              return (
                <div
                  key={`gen-overlay-${gen.depth}`}
                  className="absolute select-none"
                  style={{
                    left: 4,
                    top: screenY - 16,
                    width: 80,
                    textAlign: 'center',
                    opacity: screenY < -20 ? 0 : 1,
                  }}
                >
                  <div
                    className="font-display italic text-heritage-brown/80 leading-none whitespace-nowrap"
                    style={{ fontSize: '11px', letterSpacing: '0.01em' }}
                    title={gen.depth === 0 ? "Génération N (vous)" : `Génération ${gen.depth}`}
                  >
                    Génération {gen.label}
                  </div>
                  {hasRoyals && (
                    <button
                      type="button"
                      onClick={() => onOpenRoyalGeneration?.(gen)}
                      className="pointer-events-auto mt-0.5 inline-flex items-center gap-0.5 font-display italic font-bold hover:underline"
                      style={{ color: '#6B4A0F', fontSize: '9px' }}
                      title={`Voir les ancêtres royaux : ${kingdomsText}`}
                    >
                      <RoyalCrown className="w-2.5 h-2.5" />
                      <span>{gen.royalCount}</span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ─── Colonne DROITE : « Faits historiques » + 4 marqueurs carmin (cachée sur mobile) ─── */}
      {(() => {
        const COL_W_RIGHT = 160
        const CARMINE = '#B91C1C'
        const CARMINE_SOFT = '#991B1B'
        const HISTORY_EVENTS = [
          { year: '1547', text: 'Naissance du Cayor', personId: '55b8dc54-33d6-4b7f-ae44-1492ed0a3002', yOffset: 0 },
          { year: '1864', text: 'Le Cayor devient musulman', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f', yOffset: -NODE_H / 2 - 10 },
          { year: '1883', text: 'Protectorat français du Baol', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f', yOffset: NODE_H / 2 + 15 },
          { year: '1886', text: 'Fin du Cayor', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f', yOffset: NODE_H + 40 },
        ] as const
        return (
          <div
            className="hidden md:block absolute right-0 top-16 bottom-10 pointer-events-none z-10 overflow-hidden"
            style={{ width: COL_W_RIGHT }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to left, rgba(248,243,228,0.97) 0%, rgba(248,243,228,0.9) 70%, rgba(248,243,228,0) 100%)',
              }}
            />
            {/* Titre en haut, discret */}
            <div
              className="absolute top-0 right-3 font-display italic uppercase tracking-wider"
              style={{ color: CARMINE, fontSize: '8px', letterSpacing: '0.14em', opacity: 0.65 }}
            >
              Faits historiques
            </div>
            {HISTORY_EVENTS.map((ev, i) => {
              let anchorCanvasY: number | null = null
              if (ev.personId) {
                const pos = layout.positions.get(ev.personId)
                if (pos) anchorCanvasY = pos.y + TOP_PADDING + NODE_H / 2
              }
              if (anchorCanvasY == null) {
                const span = canvasHeight - TOP_PADDING - 100
                anchorCanvasY = TOP_PADDING + 40 + (i / Math.max(1, HISTORY_EVENTS.length - 1)) * span
              }
              const finalCanvasY = anchorCanvasY + ev.yOffset
              const screenY = finalCanvasY * transformState.scale + transformState.positionY - 64
              return (
                <div
                  key={`history-overlay-${i}`}
                  className="absolute select-none flex items-center gap-1"
                  style={{
                    left: 8,
                    top: screenY - 10,
                    width: COL_W_RIGHT - 12,
                    color: CARMINE,
                    opacity: screenY < -20 ? 0 : 1,
                  }}
                >
                  {/* Flèche carmin pointant vers l'arbre (gauche) */}
                  <ArrowLeft
                    className="flex-shrink-0"
                    style={{ color: CARMINE, opacity: 0.85 }}
                    strokeWidth={2}
                    width={11}
                    height={11}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-display italic font-bold leading-tight"
                      style={{ fontSize: '11px', color: CARMINE_SOFT }}
                    >
                      {ev.year}
                    </div>
                    <div
                      className="font-display italic leading-tight"
                      style={{ fontSize: '9px', color: CARMINE, opacity: 0.9 }}
                    >
                      {ev.text}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ─── Barres de scroll discrètes (vertical droite + horizontal bas) ─── */}
      <ScrollIndicators
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        transformState={transformState}
      />

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

/**
 * Petites barres de scroll discrètes à droite (vertical) et en bas (horizontal).
 * Affichées en overlay, non interactives (indicatives). Masquées quand tout le
 * canvas tient dans la vue.
 */
function ScrollIndicators({
  canvasWidth,
  canvasHeight,
  transformState,
}: {
  canvasWidth: number
  canvasHeight: number
  transformState: { positionX: number; positionY: number; scale: number }
}) {
  const [viewport, setViewport] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current.parentElement
    if (!el) return
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { positionX, positionY, scale } = transformState
  if (viewport.w === 0 || viewport.h === 0) {
    return <div ref={containerRef} className="hidden" />
  }

  const scaledW = canvasWidth * scale
  const scaledH = canvasHeight * scale

  // Fraction visible dans chaque axe (0 à 1)
  const vFrac = Math.min(1, viewport.h / scaledH)
  const hFrac = Math.min(1, viewport.w / scaledW)

  // Position du thumb dans [0,1]
  const vPos = scaledH > viewport.h ? Math.max(0, Math.min(1, -positionY / (scaledH - viewport.h))) : 0
  const hPos = scaledW > viewport.w ? Math.max(0, Math.min(1, -positionX / (scaledW - viewport.w))) : 0

  const trackVStyle: React.CSSProperties = {
    position: 'absolute',
    top: 60,
    bottom: 20,
    right: 6,
    width: 4,
    background: 'rgba(139, 98, 20, 0.08)',
    borderRadius: 2,
    pointerEvents: 'none',
    opacity: vFrac < 1 ? 1 : 0,
    transition: 'opacity 0.3s',
  }
  const trackHStyle: React.CSSProperties = {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 6,
    height: 4,
    background: 'rgba(139, 98, 20, 0.08)',
    borderRadius: 2,
    pointerEvents: 'none',
    opacity: hFrac < 1 ? 1 : 0,
    transition: 'opacity 0.3s',
  }
  const thumbCommon: React.CSSProperties = {
    position: 'absolute',
    background: '#C4922A',
    borderRadius: 2,
    opacity: 0.55,
  }
  const thumbVHeight = Math.max(24, (viewport.h - 80) * vFrac)
  const thumbVTop = vPos * ((viewport.h - 80) - thumbVHeight)
  const thumbHWidth = Math.max(24, (viewport.w - 40) * hFrac)
  const thumbHLeft = hPos * ((viewport.w - 40) - thumbHWidth)

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30">
      <div style={trackVStyle}>
        <div style={{ ...thumbCommon, top: thumbVTop, left: 0, right: 0, height: thumbVHeight }} />
      </div>
      <div style={trackHStyle}>
        <div style={{ ...thumbCommon, left: thumbHLeft, top: 0, bottom: 0, width: thumbHWidth }} />
      </div>
    </div>
  )
}
