'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import type { Person, Relationship, Souvenir } from '@/lib/types'
import { computeLayout, NODE_W, NODE_H } from '@/lib/treeLayout'
import PersonNode from './PersonNode'
import { ZoomIn, ZoomOut, Maximize2, LocateFixed, HelpCircle, X, Crown, ScrollText } from 'lucide-react'
// Note : Crown et ScrollText utilisés dans la légende, LocateFixed sur le bouton Recentrer
import { cn } from '@/lib/utils'

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
}: FamilyTreeProps) {
  const transformRef = useRef<any>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const layout = useMemo(
    () => computeLayout(persons, relationships, focalId),
    [persons, relationships, focalId]
  )

  const canvasWidth = Math.max(layout.width, 800)
  const treeHeight = Math.max(layout.height, 600)
  // Marge fixe au-dessus pour permettre un peu de scroll vers le haut sans
  // gaspiller la moitié du canvas en espace vide.
  const TOP_PADDING = 120
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
        fx = pos.x + NODE_W / 2
        fy = realY + NODE_H
      }
    }
    return { focalCenterX: fx, focalBottomY: fy }
  }, [layout, canvasWidth, canvasHeight, TOP_PADDING])

  // ─── Centrage sur la personne la plus basse (focal)
  const centerOnFocal = useCallback((animate = true) => {
    if (!transformRef.current) return
    const wrapper = transformRef.current?.instance?.wrapperComponent as HTMLDivElement | undefined
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const scaleX = (rect.width * 0.92) / canvasWidth
    const scaleY = (rect.height * 0.92) / focalBottomY
    const scale = Math.max(0.1, Math.min(scaleX, scaleY, 1))
    const targetX = rect.width / 2 - focalCenterX * scale
    const targetY = rect.height - 80 - focalBottomY * scale
    transformRef.current?.setTransform(targetX, targetY, scale, animate ? 300 : 0)
  }, [canvasWidth, focalCenterX, focalBottomY])

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
    const targetX = rect.width / 2 - (pos.x + NODE_W / 2) * scale
    const targetY = rect.height / 2 - (pos.y + TOP_PADDING + NODE_H / 2) * scale
    transformRef.current?.setTransform(targetX, targetY, scale, 600)
    const t = setTimeout(() => onCenterDone?.(), 650)
    return () => clearTimeout(t)
  }, [centerTargetId, layout, onCenterDone, TOP_PADDING])

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
      const nodeX = pos.x * scale + positionX
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
  }, [selectionMode, selStart, selEnd, didDrag, selectedIds, layout, TOP_PADDING, onSelectionChange])

  return (
    <div className="relative w-full h-full bg-parchment-100 overflow-hidden rounded-xl" ref={wrapperRef}>
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => transformRef.current?.zoomIn()}
          className="w-10 h-10 bg-white rounded-lg shadow-warm-md border border-parchment-400 flex items-center justify-center text-heritage-ink hover:bg-parchment-200 transition-colors"
          title="Agrandir"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={() => transformRef.current?.zoomOut()}
          className="w-10 h-10 bg-white rounded-lg shadow-warm-md border border-parchment-400 flex items-center justify-center text-heritage-ink hover:bg-parchment-200 transition-colors"
          title="Réduire"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => centerOnFocal(true)}
          className="group relative w-10 h-10 bg-white rounded-lg shadow-warm-md border-2 border-royal-gold/40 flex items-center justify-center text-royal-gold-dark hover:bg-royal-gold-light transition-colors"
          title="Recentrer sur moi"
        >
          <LocateFixed className="w-5 h-5" />
          {/* Label flottant au survol */}
          <span className="absolute right-full mr-2 px-2 py-1 rounded-md bg-heritage-ink text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-warm-md">
            Recentrer
          </span>
        </button>
        <button
          onClick={() => transformRef.current?.resetTransform()}
          className="w-10 h-10 bg-white rounded-lg shadow-warm-md border border-parchment-400 flex items-center justify-center text-heritage-ink hover:bg-parchment-200 transition-colors"
          title="Réinitialiser le zoom"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setLegendOpen(o => !o)
            setLegendButtonPulse(false)
          }}
          className={cn(
            'relative w-10 h-10 rounded-lg shadow-warm-md border flex items-center justify-center transition-colors',
            legendOpen
              ? 'bg-heritage-ink text-white border-heritage-ink'
              : 'bg-white text-heritage-ink border-parchment-400 hover:bg-parchment-200',
          )}
          title="Légende"
        >
          {/* Pulse doré au chargement pour attirer l'œil */}
          {legendButtonPulse && !legendOpen && (
            <>
              <span
                className="absolute inset-0 rounded-lg pointer-events-none ring-4 ring-royal-gold"
                style={{ animation: 'youm-pulse-ring 1.6s ease-out 2' }}
              />
              <span
                className="absolute -inset-2 rounded-lg pointer-events-none"
                style={{
                  boxShadow: '0 0 24px 4px rgba(196, 146, 42, 0.55)',
                  animation: 'youm-pulse-glow 1.6s ease-out 2',
                }}
              />
            </>
          )}
          <HelpCircle className="w-5 h-5 relative z-10" />
        </button>
      </div>

      {/* Panneau Légende — items cliquables = boutons de filtre */}
      {legendOpen && (
        <div className="absolute top-4 right-16 z-30 w-72 bg-white rounded-2xl shadow-warm-xl border-2 border-parchment-400 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-parchment-200">
            <h3 className="font-display font-bold text-sm text-heritage-ink">
              Légende
            </h3>
            <button
              onClick={() => setLegendOpen(false)}
              className="p-1 rounded-md text-heritage-brown hover:bg-parchment-100"
              aria-label="Fermer la légende"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-heritage-brown italic mb-2.5">
            Cliquez pour filtrer l&apos;arbre.
          </p>
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
                {/* Petit label "cousin" à mi-chemin */}
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
          </svg>

          {persons.map(person => {
            const pos = layout.positions.get(person.id)
            if (!pos) return null
            return (
              <div
                key={person.id}
                className="tree-node"
                style={{
                  left: pos.x,
                  top: pos.y + TOP_PADDING,
                  width: NODE_W,
                  height: NODE_H,
                }}
              >
                <PersonNode
                  person={person}
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
