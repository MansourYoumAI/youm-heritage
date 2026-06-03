'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ScrollText, Crown, Mic, ChevronRight, Calendar, ArrowRight, ArrowLeft, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Lightbox from '@/components/Lightbox'
import { createClient } from '@/lib/supabase'
import type { Person, Souvenir } from '@/lib/types'
import {
  parseYearFromDate, getInitials, cn,
  getKingdomFromTitle, KINGDOM_LABELS, KINGDOM_EMBLEMS,
  type KingdomSlugLite,
} from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface RoyalSouvenir extends Souvenir {
  person: Person
}

type Filter = 'all' | KingdomSlugLite

export default function SouvenirsPage() {
  const [items, setItems] = useState<RoyalSouvenir[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<RoyalSouvenir | null>(null)

  // Bloque le scroll de la page tant qu'un récit est en lecture pleine
  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(null)
    }
    document.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onEsc)
    }
  }, [expanded])

  useEffect(() => {
    load()
    window.addEventListener('youm-data-updated', load)
    return () => window.removeEventListener('youm-data-updated', load)
  }, [])

  async function load() {
    const supabase = createClient()
    const [{ data: ps }, { data: sv }] = await Promise.all([
      supabase.from('persons').select('*').eq('is_royal', true),
      supabase.from('souvenirs').select('*').not('person_id', 'is', null),
    ])
    const royals = new Map<string, Person>()
    for (const p of (ps || []) as Person[]) royals.set(p.id, p)
    const list: RoyalSouvenir[] = []
    for (const s of (sv || []) as Souvenir[]) {
      if (!s.person_id) continue
      const person = royals.get(s.person_id)
      if (!person) continue
      list.push({ ...s, person })
    }
    setItems(list)
    setLoading(false)
  }

  // Tri chronologique : du plus ancien au plus récent par année du souvenir
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ya = parseYearFromDate(a.souvenir_date)
      const yb = parseYearFromDate(b.souvenir_date)
      if (ya != null && yb != null) return ya - yb
      if (ya != null) return -1
      if (yb != null) return 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [items])

  // Comptes par royaume (pour les puces de filtre)
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: sorted.length, cayor: 0, baol: 0, 'fouta-toro': 0 }
    for (const s of sorted) {
      const k = getKingdomFromTitle(s.person.royal_title)
      if (k) c[k] += 1
    }
    return c
  }, [sorted])

  // Liste filtrée par royaume
  const filtered = useMemo(() => {
    if (filter === 'all') return sorted
    return sorted.filter(s => getKingdomFromTitle(s.person.royal_title) === filter)
  }, [sorted, filter])

  return (
    <div className="min-h-screen bg-parchment-100 bg-grain">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <section className="rounded-3xl border-2 border-royal-gold/30 px-6 sm:px-10 py-7 sm:py-9 bg-gradient-to-br from-royal-gold-light to-parchment-100 shadow-warm-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 text-[10px] font-bold uppercase tracking-wide text-heritage-brown mb-2">
            <Crown className="w-3 h-3" />
            Mémoire dynastique
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-heritage-ink leading-tight">
            Récits familiaux royaux
          </h1>
          <div className="mt-3 max-w-2xl space-y-2 text-sm font-medium text-heritage-brown leading-relaxed">
            <p>
              L&apos;ensemble des récits et anecdotes liés aux ascendants de la famille
              Youm ayant porté un titre royal.
            </p>
            <p>
              De nombreuses lignées de la famille ont régné dans les royaumes
              pré-coloniaux du <strong className="text-heritage-ink">Cayor</strong> (1549-1886),
              du <strong className="text-heritage-ink">Baol</strong> (XIVᵉ siècle-1895)
              et du <strong className="text-heritage-ink">Fouta-Toro</strong> (1776-1881).
            </p>
            <p>
              Ils ont porté les titres de Roi <em className="text-heritage-ink">(Damel, Teigne, Almamy)</em> et
              de Reine/Princesse <em className="text-heritage-ink">(Linguère)</em>.
            </p>
          </div>
        </section>

        <div className="flex items-baseline justify-between border-l-4 border-royal-gold pl-3">
          <h2 className="font-display font-bold text-xl text-heritage-ink">
            Récits
          </h2>
          <span className="text-xs font-semibold text-heritage-brown">
            {loading ? '…' : `${filtered.length} récit${filtered.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Filtres par royaume */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filter === 'all'}
            label="Tous"
            count={counts.all}
            onClick={() => setFilter('all')}
          />
          {(['cayor', 'baol', 'fouta-toro'] as const).map(k => (
            <FilterChip
              key={k}
              active={filter === k}
              label={KINGDOM_LABELS[k]}
              emblem={KINGDOM_EMBLEMS[k]}
              count={counts[k]}
              onClick={() => setFilter(k)}
            />
          ))}
        </div>

        {loading ? (
          <div className="card p-10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-parchment-400 border-t-terracotta-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center text-heritage-brown font-medium">
            {filter === 'all'
              ? "Aucun récit familial n'est encore rattaché à un membre royal de la famille."
              : `Aucun récit familial pour le royaume du ${KINGDOM_LABELS[filter]}.`}
          </div>
        ) : (
          <ol className="space-y-4">
            {filtered.map(s => (
              <SouvenirCard
                key={s.id}
                souvenir={s}
                onImageClick={setLightboxSrc}
                onExpand={() => setExpanded(s)}
              />
            ))}
          </ol>
        )}
      </main>

      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt=""
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {/* Lecture en plein écran du récit — overlay */}
      {expanded && (
        <FullSouvenirOverlay
          souvenir={expanded}
          onClose={() => setExpanded(null)}
          onImageClick={setLightboxSrc}
        />
      )}
    </div>
  )
}

function FilterChip({
  active, label, emblem, count, onClick,
}: {
  active: boolean
  label: string
  emblem?: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border-2 transition-all',
        active
          ? 'bg-royal-gold text-white border-royal-gold shadow-warm-sm'
          : 'bg-white text-heritage-brown border-parchment-400 hover:bg-parchment-100 hover:border-parchment-500',
      )}
    >
      {emblem && <span aria-hidden className="text-sm leading-none">{emblem}</span>}
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px]',
          active ? 'bg-white/30 text-white' : 'bg-parchment-200 text-heritage-brown',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function SouvenirCard({
  souvenir, onImageClick, onExpand,
}: {
  souvenir: RoyalSouvenir
  onImageClick: (src: string) => void
  onExpand: () => void
}) {
  const { person } = souvenir
  const isTruncated = souvenir.detail && souvenir.detail.length > 400

  return (
    <li>
      <div
        className="card p-5 bg-white border-2 border-parchment-300 hover:shadow-warm-lg hover:border-royal-gold/40 transition-all cursor-pointer"
        onClick={onExpand}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand() } }}
      >
        {/* Bandeau personne */}
        <Link
          href={`/profil/${person.id}`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-3 mb-4 group"
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-royal-gold flex items-center justify-center bg-royal-gold-light flex-shrink-0">
            {person.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.profile_picture_url}
                alt={`${person.first_name} ${person.last_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-royal-gold-dark">
                {getInitials(person)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-heritage-ink text-base leading-tight truncate group-hover:underline">
              {person.first_name} {person.last_name}
            </p>
            {person.royal_title && (
              <p className="inline-block px-2 py-0.5 rounded-full bg-royal-gold-light text-royal-gold-dark text-[10px] font-bold uppercase tracking-wide mt-0.5">
                {person.royal_title}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-heritage-brown group-hover:text-heritage-ink" />
        </Link>

        {/* Contenu du récit */}
        <div className="pl-1">
          {souvenir.souvenir_date && (
            <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-0.5 rounded-full bg-navy-50 border border-navy-200">
              <Calendar className="w-3 h-3 text-navy-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-navy-700">
                {souvenir.souvenir_date}
              </span>
            </div>
          )}
          <h3 className="font-display font-bold text-heritage-ink text-lg leading-tight">
            {souvenir.title}
          </h3>

          {souvenir.image_url && (
            <button
              onClick={e => { e.stopPropagation(); onImageClick(souvenir.image_url!) }}
              className="mt-3 rounded-xl overflow-hidden block w-full cursor-zoom-in border border-parchment-300"
            >
              <Image
                src={souvenir.image_url}
                alt={souvenir.title}
                width={600}
                height={400}
                className="w-full max-h-72 object-cover"
              />
            </button>
          )}

          {souvenir.detail && (
            <p
              className={cn(
                'text-sm font-medium text-heritage-ink leading-relaxed whitespace-pre-wrap mt-3',
                isTruncated && 'line-clamp-[8]',
              )}
            >
              {souvenir.detail}
            </p>
          )}

          {/* CTA Lire le récit en entier */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={e => { e.stopPropagation(); onExpand() }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-royal-gold-dark bg-royal-gold-light hover:bg-royal-gold hover:text-white transition-colors"
            >
              Lire le récit en entier
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

/**
 * Overlay plein écran qui affiche un récit dans son intégralité.
 * Fond flouté + carte au centre + bouton retour.
 */
function FullSouvenirOverlay({
  souvenir, onClose, onImageClick,
}: {
  souvenir: RoyalSouvenir
  onClose: () => void
  onImageClick: (src: string) => void
}) {
  const { person } = souvenir
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-6 py-6 sm:py-10 overflow-y-auto bg-parchment-100/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-3xl border-2 border-royal-gold/40 shadow-warm-xl my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Barre du haut : retour + fermer */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur rounded-t-3xl border-b border-parchment-300 px-5 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-heritage-brown hover:text-heritage-ink hover:bg-parchment-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux récits royaux
          </button>
          <button
            onClick={onClose}
            title="Fermer"
            aria-label="Fermer"
            className="p-1.5 rounded-full bg-parchment-100 text-heritage-brown hover:bg-parchment-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu complet */}
        <div className="px-5 sm:px-8 py-6 sm:py-8">
          {/* Personne */}
          <Link
            href={`/profil/${person.id}`}
            onClick={onClose}
            className="flex items-center gap-4 pb-5 mb-5 border-b border-parchment-200 group"
          >
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-royal-gold flex items-center justify-center bg-royal-gold-light flex-shrink-0">
              {person.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.profile_picture_url}
                  alt={`${person.first_name} ${person.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-base font-bold text-royal-gold-dark">
                  {getInitials(person)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-heritage-ink text-xl leading-tight group-hover:underline">
                {person.first_name} {person.last_name}
              </p>
              {person.royal_title && (
                <p className="inline-block px-2 py-0.5 rounded-full bg-royal-gold-light text-royal-gold-dark text-[11px] font-bold uppercase tracking-wide mt-1">
                  {person.royal_title}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-heritage-brown group-hover:text-heritage-ink" />
          </Link>

          {/* Date + titre */}
          {souvenir.souvenir_date && (
            <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full bg-navy-50 border border-navy-200">
              <Calendar className="w-3.5 h-3.5 text-navy-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-700">
                {souvenir.souvenir_date}
              </span>
            </div>
          )}
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-heritage-ink leading-tight">
            {souvenir.title}
          </h2>

          {/* Image */}
          {souvenir.image_url && (
            <button
              onClick={() => onImageClick(souvenir.image_url!)}
              className="mt-5 rounded-2xl overflow-hidden block w-full cursor-zoom-in border border-parchment-300"
            >
              <Image
                src={souvenir.image_url}
                alt={souvenir.title}
                width={1200}
                height={800}
                className="w-full max-h-[60vh] object-cover"
              />
            </button>
          )}

          {/* Texte intégral */}
          {souvenir.detail && (
            <div className="prose prose-sm sm:prose-base mt-5 max-w-none">
              <p className="whitespace-pre-wrap text-heritage-ink leading-relaxed font-medium">
                {souvenir.detail}
              </p>
            </div>
          )}

          {/* Audio */}
          {souvenir.audio_url && (
            <div className="mt-5 flex items-center gap-2">
              <Mic className="w-4 h-4 text-terracotta-500 flex-shrink-0" />
              <audio src={souvenir.audio_url} controls className="w-full" />
            </div>
          )}

          {/* Source */}
          {souvenir.source && (
            <p className="mt-6 pt-4 border-t border-parchment-200 text-xs italic text-heritage-brown">
              Source : {souvenir.source}
            </p>
          )}

          {/* Bouton retour en bas */}
          <div className="mt-8 pt-4 border-t border-parchment-200 flex justify-center">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-heritage-ink bg-parchment-100 hover:bg-parchment-200 transition-colors border border-parchment-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour aux récits royaux
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
