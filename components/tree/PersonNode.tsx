'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus, Pencil, ScrollText } from 'lucide-react'
import type { Person, Souvenir } from '@/lib/types'
import { getInitials, cn, formatDateFR } from '@/lib/utils'
import RoyalCrown from '@/components/icons/RoyalCrown'

interface PersonNodeProps {
  person: Person
  onClick: () => void
  selected?: boolean
  dimmed?: boolean
  highlighted?: boolean
  /** Souvenirs de cette personne (pour afficher l'indicateur + le popover) */
  souvenirs?: Souvenir[]
  /** Animation pulse dorée (utilisée pour mettre en évidence le focal au chargement) */
  pulsing?: boolean
  /** Mode administrateur : affiche les boutons + / éditer */
  isAdmin?: boolean
}

export default function PersonNode({
  person,
  onClick,
  selected = false,
  dimmed = false,
  highlighted = false,
  souvenirs = [],
  pulsing = false,
  isAdmin = false,
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
      {/* Serpent doré animé autour des cartes royales */}
      {person.is_royal && <span className="royal-snake-border" aria-hidden="true" />}

      {/* Pulse doré pour mettre en évidence le focal au premier chargement */}
      {pulsing && (
        <>
          <span
            className="absolute inset-0 rounded-2xl pointer-events-none z-10 ring-4 ring-royal-gold"
            style={{ animation: 'youm-pulse-ring 1.6s ease-out 2' }}
          />
          <span
            className="absolute -inset-2 rounded-2xl pointer-events-none z-0"
            style={{
              boxShadow: '0 0 30px 6px rgba(196, 146, 42, 0.5)',
              animation: 'youm-pulse-glow 1.6s ease-out 2',
            }}
          />
        </>
      )}
      <button
        onClick={onClick}
        className={cn(
          'w-full h-full rounded-2xl flex flex-row items-center px-3 py-2.5 gap-3',
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
          boxShadow: '0 2px 14px rgba(196, 146, 42, 0.28)',
        } : undefined}
      >
        {/* Avatar à gauche — plus grand */}
        <div className={cn(
          'flex-shrink-0 w-[82px] h-[82px] rounded-xl overflow-hidden flex items-center justify-center',
          'border-2',
          person.is_royal ? 'border-royal-gold' : 'border-parchment-400'
        )}>
          {person.profile_picture_url ? (
            <Image
              src={person.profile_picture_url}
              alt={`${person.first_name} ${person.last_name}`}
              width={82}
              height={82}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn(
              'w-full h-full flex items-center justify-center font-display italic text-2xl font-bold',
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

        {/* Bloc texte à droite — polices élargies */}
        <div className="flex-1 min-w-0 text-left flex flex-col items-start gap-1">
          {person.is_royal && person.royal_title && (
            <span
              className="inline-block max-w-full px-2 py-0.5 rounded-full bg-royal-gold-light text-royal-gold-dark text-[10px] font-bold uppercase tracking-tight leading-tight border border-royal-gold/40 truncate"
              title={person.royal_title}
            >
              {person.royal_title}
            </span>
          )}
          <p className="font-display text-[17px] font-bold text-heritage-ink leading-[1.15] break-words hyphens-auto w-full">
            {person.first_name}
          </p>
          <p className="font-display text-[17px] font-bold text-heritage-ink leading-[1.15] truncate w-full">
            {person.last_name}
          </p>
          {birthText && (
            <p className="text-[11px] font-medium text-parchment-500 leading-tight truncate w-full italic">
              {birthText}
            </p>
          )}
        </div>
      </button>

      {/* Cadre royal — petits ornements dorés aux 4 coins, discrets mais visibles */}
      {person.is_royal && (
        <>
          <span
            className="absolute top-0 left-0 w-3 h-3 pointer-events-none"
            style={{
              borderTop: '2px solid #C4922A',
              borderLeft: '2px solid #C4922A',
              borderTopLeftRadius: '0.75rem',
            }}
          />
          <span
            className="absolute top-0 right-0 w-3 h-3 pointer-events-none"
            style={{
              borderTop: '2px solid #C4922A',
              borderRight: '2px solid #C4922A',
              borderTopRightRadius: '0.75rem',
            }}
          />
          <span
            className="absolute bottom-0 left-0 w-3 h-3 pointer-events-none"
            style={{
              borderBottom: '2px solid #C4922A',
              borderLeft: '2px solid #C4922A',
              borderBottomLeftRadius: '0.75rem',
            }}
          />
          <span
            className="absolute bottom-0 right-0 w-3 h-3 pointer-events-none"
            style={{
              borderBottom: '2px solid #C4922A',
              borderRight: '2px solid #C4922A',
              borderBottomRightRadius: '0.75rem',
            }}
          />
        </>
      )}

      {/* Couronne (lignée royale) — illustration plate dorée + léger pulse */}
      {person.is_royal && (
        <div
          className="royal-crown-pulse absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center z-10 pointer-events-none border-2 border-white"
          style={{ backgroundColor: '#FFD43B' }}
        >
          <RoyalCrown className="w-6 h-6" />
        </div>
      )}

      {/* Indicateur récits familiaux — pastille verte heritage en bas-gauche */}
      {hasSouvenirs && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onClick()
          }}
          title={`${souvenirs.length} récit familial${souvenirs.length > 1 ? 'aux' : ''} — cliquer pour voir`}
          className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-heritage-green text-white flex items-center justify-center shadow-warm-sm z-20 border-2 border-white hover:scale-110 transition-transform"
        >
          <ScrollText className="w-3.5 h-3.5" strokeWidth={2.2} />
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

      {/* Boutons d'édition — admin uniquement */}
      {isAdmin && (
        <>
          <Link
            href={`/?modifier=${person.id}`}
            onClick={e => e.stopPropagation()}
            title="Modifier"
            className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-white border border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 transition-opacity z-20 hidden md:flex hover:bg-heritage-green hover:border-heritage-green hover:text-white shadow-warm-sm"
          >
            <Pencil className="w-2.5 h-2.5" strokeWidth={2.5} />
          </Link>

          <Link
            href={`/?parents_of=${person.id}`}
            onClick={e => e.stopPropagation()}
            title="Ajouter le père et la mère"
            className="hidden md:flex absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 hover:bg-heritage-green hover:border-heritage-green hover:text-white transition-all shadow-warm-sm z-20"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          </Link>

          <Link
            href={`/?ajouter=1&child_of=${person.id}`}
            onClick={e => e.stopPropagation()}
            title="Ajouter un enfant"
            className="hidden md:flex absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 hover:bg-heritage-green hover:border-heritage-green hover:text-white transition-all shadow-warm-sm z-20"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          </Link>

          <Link
            href={`/?ajouter=1&spouse_of=${person.id}`}
            onClick={e => e.stopPropagation()}
            title="Ajouter un(e) conjoint(e)"
            className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-2 border-parchment-400 items-center justify-center text-heritage-brown opacity-0 group-hover:opacity-100 hover:bg-terracotta-500 hover:border-terracotta-500 hover:text-white transition-all shadow-warm-sm z-20"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          </Link>
        </>
      )}
    </div>
  )
}
