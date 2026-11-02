'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { Person, Relationship, Souvenir } from '@/lib/types'
import { computeLayout, NODE_W, NODE_H, type GenerationBand } from '@/lib/treeLayout'
import PersonNode from './PersonNode'
import { HelpCircle, X, Crown, ScrollText, UserPlus, ImageDown, Loader2 } from 'lucide-react'
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
}: FamilyTreeProps) {
  const transformRef = useRef<any>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { isAdmin } = useAdminMode()

  const layout = useMemo(
    () => computeLayout(persons, relationships, focalId),
    [persons, relationships, focalId]
  )

  // Bande à gauche réservée aux étiquettes de génération (chiffre + couronne).
  const LEFT_LABEL_W = 160
  // Bande à droite pour la frise historique.
  const RIGHT_TIMELINE_W = 180
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

  // ─── Centrage sur la personne la plus basse (focal)
  //
  // Objectif : afficher par défaut le focal + ~4 générations au-dessus,
  //            avec les cartes assez grandes pour être lisibles sans zoom.
  //            Le canvas peut être plus large que ça (ancêtres plus hauts) ;
  //            l'utilisateur zoome-out pour voir plus.
  const centerOnFocal = useCallback((animate = true) => {
    if (!transformRef.current) return
    const wrapper = transformRef.current?.instance?.wrapperComponent as HTMLDivElement | undefined
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()

    // Hauteur voulue sur l'écran : ~4-5 générations
    const visibleGens = 4.5
    const neededHeight = visibleGens * (NODE_H + 70 /* ~V_GAP */)
    // Largeur voulue : au moins 3 cartes de large
    const neededWidth = 3 * (NODE_W + 36 /* H_GAP */) + LEFT_LABEL_W + RIGHT_TIMELINE_W
    const scaleY = (rect.height * 0.9) / neededHeight
    const scaleX = (rect.width * 0.95) / neededWidth
    const scale = Math.max(0.25, Math.min(scaleX, scaleY, 1.1))

    const targetX = rect.width / 2 - focalCenterX * scale
    const targetY = rect.height - 100 - focalBottomY * scale
    transformRef.current?.setTransform(targetX, targetY, scale, animate ? 300 : 0)
  }, [focalCenterX, focalBottomY, LEFT_LABEL_W, RIGHT_TIMELINE_W])

  // Centrage initial après chaque changement de layout/focal (sans pulse)
  useEffect(() => {
    if (persons.length === 0) return
    const t = setTimeout(() => centerOnFocal(false), 50)
    return () => { clearTimeout(t) }
  }, [layout, focalId, persons.length, centerOnFocal])

  // État légende (panneau dépliable)
  const [legendOpen, setLegendOpen] = useState(false)
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
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
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
            {/* Titre doré au-dessus de l'arbre */}
            <text
              x={canvasWidth / 2}
              y={70}
              textAnchor="middle"
              fontFamily="var(--font-playfair, 'Playfair Display', Georgia, serif)"
              fontSize="38"
              fontStyle="italic"
              fontWeight="700"
              fill="url(#youm-gold-gradient)"
              style={{ letterSpacing: '0.01em' }}
            >
              Arbre généalogique de la famille Youm
            </text>
            {/* Petite ornementation sous le titre : ligne dorée + losange central */}
            <g>
              <line
                x1={canvasWidth / 2 - 180} y1={95}
                x2={canvasWidth / 2 - 14} y2={95}
                stroke="#C4922A" strokeWidth={1.1} opacity={0.6}
              />
              <line
                x1={canvasWidth / 2 + 14} y1={95}
                x2={canvasWidth / 2 + 180} y2={95}
                stroke="#C4922A" strokeWidth={1.1} opacity={0.6}
              />
              <polygon
                points={`${canvasWidth / 2},89 ${canvasWidth / 2 + 7},95 ${canvasWidth / 2},101 ${canvasWidth / 2 - 7},95`}
                fill="#C4922A" opacity={0.75}
              />
            </g>

            {/* Dégradé or réutilisable */}
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
                  top: bandCenterY - 60,
                  width: LEFT_LABEL_W - 28, // marge d'air avec l'arbre
                  height: 120,
                  textAlign: 'center',
                }}
              >
                <div
                  className="font-display italic text-parchment-500/80 leading-tight"
                  style={{ fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                >
                  Génération
                </div>
                <div
                  className="font-display italic text-heritage-brown/70 leading-none"
                  style={{ fontSize: '48px', letterSpacing: '-0.02em', marginTop: 2 }}
                  title={gen.depth === 0 ? "Génération N (vous)" : `${gen.depth}ᵉ génération d'ancêtres`}
                >
                  {gen.label}
                </div>
                {hasRoyals && (
                  <button
                    type="button"
                    onClick={() => onOpenRoyalGeneration?.(gen)}
                    className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-royal-gold text-white hover:bg-royal-gold-dark border border-royal-gold-dark text-[12px] font-display italic font-bold shadow-warm-md transition-all hover:scale-105"
                    title={`Voir les ancêtres royaux de cette génération : ${kingdomsText}`}
                  >
                    <Crown className="w-3.5 h-3.5" fill="currentColor" />
                    <span>{gen.royalCount} royal{gen.royalCount > 1 ? 'aux' : ''}</span>
                  </button>
                )}
              </div>
            )
          })}

          {/* ─── Frise historique à droite ─── */}
          {(() => {
            const HISTORY_EVENTS = [
              { year: '1547', text: 'Naissance du Cayor', personId: '55b8dc54-33d6-4b7f-ae44-1492ed0a3002' /* Dethié Fou */ },
              { year: '1864', text: 'Le Cayor devient musulman', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f' /* Lat Dior */ },
              { year: '1883', text: 'Protectorat français du Baol', personId: null /* fallback Lat Dior gen - 0 */, yOffset: -NODE_H - 60 },
              { year: '1886', text: 'Fin du Cayor', personId: '9d7a6705-0ee4-4e50-a054-eaf90a51048f', yOffset: NODE_H + 60 },
            ] as const

            return HISTORY_EVENTS.map((ev, i) => {
              // Essaie de trouver la position de la personne associée
              let anchorY: number | null = null
              if (ev.personId) {
                const pos = layout.positions.get(ev.personId)
                if (pos) anchorY = pos.y + TOP_PADDING + NODE_H / 2
              }
              // Fallback : distribution verticale régulière
              if (anchorY == null) {
                const span = canvasHeight - TOP_PADDING - 100
                anchorY = TOP_PADDING + 40 + (i / Math.max(1, HISTORY_EVENTS.length - 1)) * span
              }
              const yOffset = ('yOffset' in ev && typeof ev.yOffset === 'number') ? ev.yOffset : 0
              const finalY = anchorY + yOffset
              return (
                <div
                  key={`history-${i}`}
                  className="absolute pointer-events-none select-none"
                  style={{
                    left: canvasWidth - RIGHT_TIMELINE_W + 20,
                    top: finalY - 24,
                    width: RIGHT_TIMELINE_W - 32,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="font-display italic text-royal-gold-dark font-bold"
                      style={{ fontSize: '20px' }}
                    >
                      {ev.year}
                    </span>
                    <span className="flex-1 h-px bg-royal-gold/40" />
                  </div>
                  <p className="font-display italic text-heritage-brown text-[13px] leading-tight mt-0.5">
                    {ev.text}
                  </p>
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

      {/* Signature discrète en bas à droite */}
      <div className="absolute bottom-2 right-3 z-10 pointer-events-none select-none">
        <p className="font-display italic text-[11px] text-heritage-brown/70">
          Réalisé par Mansour Youm, 2026
        </p>
      </div>
    </div>
  )
}
