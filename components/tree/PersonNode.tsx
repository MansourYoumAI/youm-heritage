'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Crown, Plus, Pencil, Sparkles } from 'lucide-react'
import type { Person, Souvenir } from '@/lib/types'
import { getInitials, cn, formatDateFR } from '@/lib/utils'

interface PersonNodeProps {
  person: Person
  onClick: () => void
  selected?: boolean
  dimmed?: boolean
  highlighted?: boolean
  /** Souvenirs de cette personne (pour afficher l'indicateur + le popover) */
  souvenirs?: Souvenir[]
}

export default function PersonNode({
  person,
  onClick,
  selected = false,
  dimmed = false,
  highlighted = false,
  souvenirs = [],
}: PersonNodeProps) {
  const initials = getInitials(person)
  const hasSouvenirs = souvenirs.length > 0

  const birthText = person.birth_date
    ? `né${person.gender === 'femme' ? 'e' : ''} en ${formatDateFR(person.birth_date)}`
    : ''

  return (
    <div
      className={cn(
        'relative group w-full h-full transition-opacity duration-200',
        dimmed && 'opacity-20',
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full h-full rounded-2xl flex flex-row items-center px-2.5 py-2 gap-2.5',
          'border-2 transition-all duration-200 bg-white',
          'hover:shadow-warm-lg hover:-translate-y-0.5',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-terracotta-500',
          highlighted
            ? 'border-royal-gold shadow-warm-xl ring-4 ring-royal-gold ring-offset-2'
            : selected
              ? 'border-terracotta-500 shadow-warm-lg ring-2 ring-terracotta-500 ring-offset-2'
              : person.is_royal
                ? 'border-royal-gold shadow-warm-md'
                : 'border-parchment-400 shadow-warm-sm'
        )}
        style={person.is_royal && !selected && !highlighted ? {
          boxShadow: '0 2px 12px rgba(196, 146, 42, 0.25)',
        } : undefined}
      >
        {/* Avatar à gauche */}
        <div className={cn(
          'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center',
          'border-2',
          person.is_royal ? 'border-royal-gold' : 'border-parchment-400'
        )}>
          {person.profile_picture_url ? (
            <Image
              src={person.profile_picture_url}
              alt={`${person.first_name} ${person.last_name}`}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              'w-full h-full flex items-center justify-center text-base font-bold',
              person.is_royal
                ? 'bg-royal-gold-light text-royal-gold-dark'
                : person.gender === 'homme'
                ? 'bg-heritage-green/10 text-heritage-green'
                : person.gender === 'femme'
                ? 'bg-terracotta-100 text-terracotta-600'
                : 'bg-parchment-300 text-heritage-brown'
            )}>
              {initials}
            </div>
          )}
        </div>

        {/* Bloc texte à droite, aligné à gauche */}
        <div className="flex-1 min-w-0 text-left flex flex-col items-start gap-0.5">
          {/* Bulle du titre royal — au-dessus du prénom */}
          {person.is_royal && person.royal_title && (
            <span
              className="inline-block max-w-full px-1.5 py-0.5 rounded-full bg-royal-gold-light text-royal-gold-dark text-[9px] font-bold uppercase tracking-tight leading-tight border border-royal-gold/40 truncate"
              title={person.royal_title}
            >
              {person.royal_title}
            </span>
          )}
          {/* Prénom — gros, peut wrapper sur 2 lignes pour les noms longs */}
          <p className="text-[13px] font-bold text-heritage-ink leading-[1.15] break-words hyphens-auto w-full">
            {person.first_name}
          </p>
          <p className="text-[11px] font-semibold text-heritage-brown leading-tight truncate w-full">
            {person.last_name}
          </p>
          {birthText && (
            <p className="text-[10px] font-medium text-parchment-500 leading-tight truncate w-full">
              {birthText}
            </p>
          )}
        </div>
      </button>

      {/* Couronne (lignée royale) — plus visible : décollée + plus grosse */}
      {person.is_royal && (
        <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-royal-gold flex items-center justify-center shadow-warm-md z-10 pointer-events-none border-2 border-white">
          <Crown className="w-4 h-4 text-heritage-ink" strokeWidth={2.4} fill="currentColor" fillOpacity={0.2} />
        </div>
      )}

      {/* Indicateur souvenirs — terracotta pastille en bas-gauche */}
      {hasSouvenirs && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onClick()
          }}
          title={`${souvenirs.length} souvenir${souvenirs.length > 1 ? 's' : ''} — cliquer pour voir`}
          className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-terracotta-500 text-white flex items-center justify-center shadow-warm-sm z-20 border-2 border-white hover:scale-110 transition-transform"
        >
          <Sparkles className="w-3 h-3" strokeWidth={2.5} />
          {souvenirs.length > 1 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-heritage-ink text-white text-[8px] font-bold flex items-center justify-center leading-none">
              {souvenirs.length}
            </span>
          )}
        </button>
      )}

      {/* Identifiant unique court (pour distinguer les doublons) */}
      <span
        className="absolute bottom-0.5 right-1.5 font-mono text-parchment-500 leading-none pointer-events-none select-none"
        style={{ fontSize: '7px', opacity: 0.6 }}
      >
        #{person.id.slice(0, 5)}
      </span>

      {/* Bouton édition rapide — discret, en haut à gauche, ouvre le volet */}
      <Link
        href={`/?modifier=${person.id}`}
        onClick={e => e.stopPropagation()}
        title="Modifier"
        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white border border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden md:flex hover:bg-heritage-green hover:border-heritage-green hover:text-white shadow-warm-sm"
      >
        <Pencil className="w-2.5 h-2.5" strokeWidth={2.5} />
      </Link>

      {/* + parents (haut) — ajoute le père et la mère d'un coup */}
      <Link
        href={`/?parents_of=${person.id}`}
        onClick={e => e.stopPropagation()}
        title="Ajouter le père et la mère"
        className="hidden md:flex absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 hover:bg-heritage-green hover:border-heritage-green hover:text-white transition-all shadow-warm-sm z-20"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
      </Link>

      {/* + enfant (bas) */}
      <Link
        href={`/?ajouter=1&child_of=${person.id}`}
        onClick={e => e.stopPropagation()}
        title="Ajouter un enfant"
        className="hidden md:flex absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 hover:bg-heritage-green hover:border-heritage-green hover:text-white transition-all shadow-warm-sm z-20"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
      </Link>

      {/* + conjoint (droite) */}
      <Link
        href={`/?ajouter=1&spouse_of=${person.id}`}
        onClick={e => e.stopPropagation()}
        title="Ajouter un(e) conjoint(e)"
        className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 hover:bg-terracotta-500 hover:border-terracotta-500 hover:text-white transition-all shadow-warm-sm z-20"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
      </Link>
    </div>
  )
}
