'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Crown, Calendar, MapPin, ScrollText, Loader2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, TreeDeciduous } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Person, Souvenir } from '@/lib/types'
import { formatDateFR, getInitials } from '@/lib/utils'

export interface ProfileNeighbors {
  /** Un ascendant direct (père ou mère) */
  up?: { id: string; label: string }
  /** Un descendant direct (enfant) */
  down?: { id: string; label: string }
  /** Un conjoint ou frère/sœur (voisin horizontal) */
  left?: { id: string; label: string }
  right?: { id: string; label: string }
}

interface ProfileModalProps {
  personId: string
  onClose: () => void
  /** Numéro de génération depuis Mansour (0=N, 1, 2, ...) */
  generationLabel?: string | null
  /** Voisins pour la navigation */
  neighbors?: ProfileNeighbors
  /** Jump vers une autre personne (profil) */
  onNavigate?: (id: string) => void
  /** Centrer sur cette personne dans l'arbre (ferme la modale) */
  onCenterOnTree?: (id: string) => void
}

export default function ProfileModal({
  personId,
  onClose,
  generationLabel,
  neighbors = {},
  onNavigate,
  onCenterOnTree,
}: ProfileModalProps) {
  const [person, setPerson] = useState<Person | null>(null)
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from('persons').select('*').eq('id', personId).single(),
      supabase.from('souvenirs').select('*').eq('person_id', personId).order('souvenir_date', { ascending: true }),
    ]).then(([pRes, sRes]) => {
      if (cancelled) return
      setPerson(pRes.data as Person | null)
      setSouvenirs((sRes.data as Souvenir[]) || [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [personId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-heritage-ink/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-parchment-50 rounded-2xl shadow-warm-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-royal-gold/30"
      >
        {/* Barre de navigation en haut : gen à gauche, retour arbre à droite */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2 bg-parchment-100 border-b border-royal-gold/20">
          <div className="flex items-center gap-2">
            {generationLabel !== null && generationLabel !== undefined && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-display italic text-xs font-bold"
                style={{ background: 'rgba(196,146,42,0.15)', color: '#6B4A0F' }}
                title="Génération de cette personne"
              >
                Génération {generationLabel}
              </span>
            )}
            {person && onCenterOnTree && (
              <button
                onClick={() => onCenterOnTree(person.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-display italic text-xs text-heritage-brown hover:bg-white/60 transition-colors"
                title="Centrer cette personne dans l'arbre"
              >
                <TreeDeciduous className="w-3 h-3" />
                <span>Voir dans l&apos;arbre</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full text-heritage-brown hover:bg-white/60 flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Flèches de navigation familiales (haut : parents, bas : enfants, gauche/droite : conjoint·e·s / frères/sœurs) */}
        {onNavigate && (neighbors.up || neighbors.down || neighbors.left || neighbors.right) && (
          <div className="relative px-4 pt-2 pb-1">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <NeighborButton
                icon={<ArrowLeft className="w-3 h-3" />}
                label={neighbors.left?.label}
                onClick={() => neighbors.left && onNavigate(neighbors.left.id)}
                disabled={!neighbors.left}
                hint="Frère/sœur ou conjoint·e"
              />
              <div className="flex flex-col items-center gap-1 flex-1">
                <NeighborButton
                  icon={<ArrowUp className="w-3 h-3" />}
                  label={neighbors.up?.label}
                  onClick={() => neighbors.up && onNavigate(neighbors.up.id)}
                  disabled={!neighbors.up}
                  hint="Parent (ascendant)"
                />
                <NeighborButton
                  icon={<ArrowDown className="w-3 h-3" />}
                  label={neighbors.down?.label}
                  onClick={() => neighbors.down && onNavigate(neighbors.down.id)}
                  disabled={!neighbors.down}
                  hint="Enfant (descendant)"
                />
              </div>
              <NeighborButton
                icon={<ArrowRight className="w-3 h-3" />}
                label={neighbors.right?.label}
                onClick={() => neighbors.right && onNavigate(neighbors.right.id)}
                disabled={!neighbors.right}
                hint="Frère/sœur ou conjoint·e"
              />
            </div>
          </div>
        )}

        {/* Header gold */}
        <div className="relative bg-gradient-to-br from-royal-gold-light via-parchment-100 to-parchment-50 px-6 pt-6 pb-4 border-b-2 border-royal-gold/30">

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-royal-gold" />
            </div>
          )}

          {!loading && person && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-royal-gold shadow-warm-md">
                {person.profile_picture_url ? (
                  <Image
                    src={person.profile_picture_url}
                    alt={`${person.first_name} ${person.last_name}`}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-royal-gold-light text-royal-gold-dark">
                    {getInitials(person)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {person.is_royal && person.royal_title && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-royal-gold text-white text-[11px] font-bold uppercase tracking-wide mb-2">
                    <Crown className="w-3 h-3" fill="currentColor" />
                    {person.royal_title}
                  </span>
                )}
                <h2 className="font-display text-2xl text-heritage-ink font-bold leading-tight">
                  {person.first_name} {person.last_name}
                </h2>
                {person.nickname && (
                  <p className="text-sm italic text-heritage-brown mt-0.5">« {person.nickname} »</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-heritage-brown">
                  {person.birth_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateFR(person.birth_date)}
                      {person.death_date && ` — ${formatDateFR(person.death_date)}`}
                    </span>
                  )}
                  {person.birth_place && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {person.birth_place_other || person.birth_place}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Biography */}
        {!loading && person && person.biography && (
          <div className="px-6 py-5 border-b border-parchment-300">
            <p className="font-display text-heritage-ink leading-relaxed whitespace-pre-wrap">
              {person.biography}
            </p>
          </div>
        )}

        {/* Souvenirs / récits */}
        {!loading && souvenirs.length > 0 && (
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-2 text-heritage-green">
              <ScrollText className="w-4 h-4" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider">
                Récits ({souvenirs.length})
              </h3>
            </div>
            {souvenirs.map(s => (
              <article key={s.id} className="bg-white rounded-xl p-4 border border-parchment-300 shadow-warm-sm">
                <header className="mb-2">
                  <h4 className="font-display text-base font-bold text-heritage-ink">{s.title}</h4>
                  {s.souvenir_date && (
                    <p className="text-xs text-heritage-brown mt-0.5">
                      {formatDateFR(s.souvenir_date)}
                    </p>
                  )}
                </header>
                {s.detail && (
                  <p className="font-display text-sm text-heritage-ink/90 leading-relaxed whitespace-pre-wrap">
                    {s.detail}
                  </p>
                )}
                {s.source && (
                  <p className="text-[11px] italic text-parchment-500 mt-2">Source : {s.source}</p>
                )}
              </article>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

function NeighborButton({
  icon,
  label,
  onClick,
  disabled,
  hint,
}: {
  icon: React.ReactNode
  label?: string
  onClick: () => void
  disabled?: boolean
  hint: string
}) {
  if (disabled) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-parchment-500/50 opacity-40" title={hint}>
        {icon}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 max-w-[180px] px-2 py-1 rounded-full bg-white border border-parchment-300 text-heritage-brown hover:bg-royal-gold-light hover:text-royal-gold-dark hover:border-royal-gold transition-colors font-display italic text-[11px]"
      title={`${hint}${label ? ' : ' + label : ''}`}
    >
      {icon}
      {label && <span className="truncate">{label}</span>}
    </button>
  )
}
