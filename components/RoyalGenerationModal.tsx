'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { X, Crown, ScrollText, ChevronRight } from 'lucide-react'
import type { Person, Souvenir } from '@/lib/types'
import type { GenerationBand } from '@/lib/treeLayout'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

interface RoyalGenerationModalProps {
  generation: GenerationBand
  persons: Person[]
  onClose: () => void
  onOpenPerson: (personId: string) => void
}

export default function RoyalGenerationModal({
  generation,
  persons,
  onClose,
  onOpenPerson,
}: RoyalGenerationModalProps) {
  const personsMap = useMemo(() => {
    const m = new Map<string, Person>()
    for (const p of persons) m.set(p.id, p)
    return m
  }, [persons])

  // Les royaux de cette génération, dédupliqués
  const royals = useMemo(() => {
    const idSet = new Set<string>()
    for (const ids of Object.values(generation.royalsByKingdom)) {
      for (const id of ids || []) idSet.add(id)
    }
    return Array.from(idSet)
      .map(id => personsMap.get(id))
      .filter((p): p is Person => !!p)
  }, [generation, personsMap])

  const [souvenirs, setSouvenirs] = useState<Map<string, Souvenir[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (royals.length === 0) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    const ids = royals.map(p => p.id)
    let cancelled = false
    supabase
      .from('souvenirs')
      .select('*')
      .in('person_id', ids)
      .then(({ data }) => {
        if (cancelled) return
        const m = new Map<string, Souvenir[]>()
        for (const s of (data as Souvenir[]) || []) {
          if (!s.person_id) continue
          const arr = m.get(s.person_id) || []
          arr.push(s)
          m.set(s.person_id, arr)
        }
        setSouvenirs(m)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [royals])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Breakdown par royaume pour le header
  const kingdomsText = Object.entries(generation.royalsByKingdom)
    .filter(([, ids]) => (ids?.length ?? 0) > 0)
    .map(([k, ids]) => `${ids!.length} du ${k}`)
    .join(' · ')

  const genLabel = generation.depth === 0 ? 'Génération N' : `Génération ${generation.depth}`

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-heritage-ink/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-parchment-50 rounded-2xl shadow-warm-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-royal-gold/40"
      >
        {/* Header gold */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-royal-gold-light via-parchment-100 to-parchment-50 px-6 py-4 border-b-2 border-royal-gold/30">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full text-heritage-brown hover:bg-white/60 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="w-10 h-10 rounded-full bg-royal-gold flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="font-display text-xl text-heritage-ink font-bold leading-tight italic">
                {genLabel}
              </h2>
              <p className="text-xs text-heritage-brown font-semibold">
                {generation.royalCount} ancêtre{generation.royalCount > 1 ? 's' : ''} royal{generation.royalCount > 1 ? 'aux' : ''}
                {kingdomsText && <> — {kingdomsText}</>}
              </p>
            </div>
          </div>
        </div>

        {/* Cartes des royaux */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {royals.map(p => {
            const persSouvenirs = souvenirs.get(p.id) || []
            const bioExcerpt = p.biography
              ? p.biography.slice(0, 180) + (p.biography.length > 180 ? '…' : '')
              : null
            return (
              <button
                key={p.id}
                onClick={() => onOpenPerson(p.id)}
                className="group text-left bg-white rounded-2xl p-4 border-2 border-parchment-400 hover:border-royal-gold hover:shadow-warm-lg transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-royal-gold">
                    {p.profile_picture_url ? (
                      <Image
                        src={p.profile_picture_url}
                        alt={`${p.first_name} ${p.last_name}`}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-base font-bold bg-royal-gold-light text-royal-gold-dark">
                        {getInitials(p)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {p.royal_title && (
                      <span className="inline-block px-1.5 py-0.5 rounded-full bg-royal-gold-light text-royal-gold-dark text-[9px] font-bold uppercase tracking-tight mb-1 truncate max-w-full">
                        {p.royal_title}
                      </span>
                    )}
                    <p className="font-display text-base font-bold text-heritage-ink leading-tight">
                      {p.first_name}
                    </p>
                    <p className="text-xs font-semibold text-heritage-brown">{p.last_name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-parchment-500 group-hover:text-royal-gold flex-shrink-0 mt-1" />
                </div>

                {bioExcerpt && (
                  <p className="text-xs text-heritage-ink/80 leading-relaxed font-display line-clamp-3 mb-2">
                    {bioExcerpt}
                  </p>
                )}

                {persSouvenirs.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-heritage-green font-semibold">
                    <ScrollText className="w-3 h-3" />
                    {persSouvenirs.length} récit{persSouvenirs.length > 1 ? 's' : ''}
                    {persSouvenirs[0] && <span className="font-normal italic text-heritage-brown">— {persSouvenirs[0].title}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {royals.length === 0 && (
          <div className="p-10 text-center italic text-heritage-brown">
            Aucun ancêtre royal dans cette génération.
          </div>
        )}

        {loading && royals.length > 0 && (
          <div className="pb-5 text-center text-xs italic text-heritage-brown">
            Chargement des récits…
          </div>
        )}
      </div>
    </div>
  )
}
