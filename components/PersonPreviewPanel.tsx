'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, Crown, ArrowRight, ScrollText, Calendar, Mic, Pencil, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Person, Souvenir } from '@/lib/types'
import {
  getFullName, formatLifespan, parseYearFromDate, getAvatarColors,
  getKingdomFromTitle, KINGDOM_LABELS, KINGDOM_EMBLEMS,
} from '@/lib/utils'
import Lightbox from './Lightbox'
import DeleteButton from './DeleteButton'

interface PersonPreviewPanelProps {
  person: Person
  onClose: () => void
  onDeleted?: () => void
}

const PREVIEW_COUNT = 5

export default function PersonPreviewPanel({ person, onClose, onDeleted }: PersonPreviewPanelProps) {
  const router = useRouter()
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('souvenirs')
        .select('*')
        .eq('person_id', person.id)
        .limit(100)
      // Tri chronologique (par souvenir_date si présent, sinon created_at)
      const sorted = [...(data || [])].sort((a, b) => {
        const yA = parseYearFromDate(a.souvenir_date)
        const yB = parseYearFromDate(b.souvenir_date)
        if (yA !== null && yB !== null) return yA - yB
        if (yA !== null) return -1
        if (yB !== null) return 1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      setSouvenirs(sorted)
      setLoading(false)
      setShowAll(false)
    }
    load()
  }, [person.id])

  const lifespan = formatLifespan(person)
  const visibleSouvenirs = showAll ? souvenirs : souvenirs.slice(0, PREVIEW_COUNT)
  const moreCount = souvenirs.length - PREVIEW_COUNT
  const avatarColors = getAvatarColors(person)

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end pointer-events-none">
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />

        <div className="relative pointer-events-auto w-full md:w-[26rem] bg-white rounded-t-3xl md:rounded-3xl md:mr-6 shadow-warm-xl border border-parchment-400 max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-parchment-200 flex items-center justify-center text-heritage-brown hover:bg-parchment-300 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Identité */}
            <div className="flex items-center gap-4 mb-5">
              <button
                onClick={() => person.profile_picture_url && setLightboxSrc(person.profile_picture_url)}
                disabled={!person.profile_picture_url}
                className={`w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-2xl font-bold flex-shrink-0 border-2 ${person.is_royal ? 'border-royal-gold' : 'border-parchment-400'} ${person.profile_picture_url ? 'cursor-zoom-in' : 'cursor-default'}`}
                aria-label={person.profile_picture_url ? 'Voir la photo en grand' : ''}
              >
                {person.profile_picture_url ? (
                  <Image
                    src={person.profile_picture_url}
                    alt={getFullName(person)}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center font-bold text-2xl ${avatarColors.bg} ${avatarColors.text}`}>
                    {person.first_name.charAt(0)}{person.last_name.charAt(0)}
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-bold text-heritage-ink leading-tight truncate">
                    {person.first_name} {person.last_name}
                  </h2>
                  {person.is_royal && (
                    <Crown className="w-5 h-5 text-royal-gold flex-shrink-0" />
                  )}
                </div>
                {person.maiden_name && (
                  <p className="text-sm font-medium text-heritage-brown mt-0.5">
                    née {person.maiden_name}
                  </p>
                )}
                {person.is_royal && person.royal_title && (
                  <RoyalTitlePill royalTitle={person.royal_title} onClose={onClose} router={router} />
                )}
                {lifespan && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-heritage-brown mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{lifespan}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bio */}
            {person.biography && (
              <div className="mb-5">
                <p className="text-sm font-medium text-heritage-ink leading-relaxed line-clamp-4">
                  {person.biography}
                </p>
              </div>
            )}

            {/* Récits familiaux */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <ScrollText className="w-4 h-4 text-heritage-green" />
                <h3 className="text-sm font-bold text-heritage-ink uppercase tracking-wider">
                  Récits familiaux
                </h3>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="skeleton h-16 rounded-lg" />
                  ))}
                </div>
              ) : souvenirs.length === 0 ? (
                <p className="text-sm font-medium text-heritage-brown italic">
                  Aucun récit familial pour l&apos;instant.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {visibleSouvenirs.map(s => (
                      <SouvenirPreview
                        key={s.id}
                        souvenir={s}
                        onImageClick={src => setLightboxSrc(src)}
                      />
                    ))}
                  </div>
                  {moreCount > 0 && !showAll && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-terracotta-600 hover:bg-terracotta-50 transition-colors"
                    >
                      Afficher plus ({moreCount} autre{moreCount > 1 ? 's' : ''})
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* CTA principal */}
            <button
              type="button"
              onClick={() => {
                onClose()
                router.push(`/profil/${person.id}`)
              }}
              className="btn-primary w-full"
            >
              Voir le profil complet
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Actions discrètes */}
            <div className="flex items-center justify-between mt-3 -mx-1">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  router.push(`/modifier/${person.id}`)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-heritage-brown hover:text-heritage-green hover:bg-parchment-100 transition-colors text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
              <DeleteButton
                personId={person.id}
                personName={`${person.first_name} ${person.last_name}`}
                variant="compact"
                onDeleted={onDeleted}
              />
            </div>
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt={getFullName(person)}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  )
}

// Bulle dorée cliquable affichant le titre royal.
// Si le titre correspond à un royaume (Cayor / Baol / Fouta-Toro), un clic
// navigue vers la fiche du royaume. Sinon, la bulle est juste un badge.
function RoyalTitlePill({
  royalTitle, onClose, router,
}: {
  royalTitle: string
  onClose: () => void
  router: ReturnType<typeof useRouter>
}) {
  const kingdom = getKingdomFromTitle(royalTitle)
  const baseClasses = 'inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-royal-gold-light text-royal-gold-dark text-[10px] font-bold uppercase tracking-wide border border-royal-gold/40'
  if (!kingdom) {
    return (
      <span className={baseClasses}>
        <Crown className="w-3 h-3" />
        {royalTitle}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => {
        onClose()
        router.push(`/${kingdom}`)
      }}
      title={`Découvrir le ${KINGDOM_LABELS[kingdom]}`}
      className={`${baseClasses} hover:bg-royal-gold hover:text-white transition-colors cursor-pointer`}
    >
      <Crown className="w-3 h-3" />
      <span className="truncate">{royalTitle}</span>
      <ArrowRight className="w-3 h-3" />
    </button>
  )
}

function SouvenirPreview({ souvenir, onImageClick }: { souvenir: Souvenir; onImageClick: (src: string) => void }) {
  return (
    <div className="bg-parchment-100 rounded-xl p-3 border border-parchment-400">
      {souvenir.souvenir_date && (
        <p className="text-[10px] font-bold text-terracotta-600 uppercase tracking-wider mb-0.5">
          {souvenir.souvenir_date}
        </p>
      )}
      <p className="font-bold text-heritage-ink text-sm mb-1">{souvenir.title}</p>

      {souvenir.detail && (
        <p className="text-xs font-medium text-heritage-brown leading-relaxed line-clamp-2 mb-2">
          {souvenir.detail}
        </p>
      )}

      <div className="flex items-center gap-2">
        {souvenir.image_url && (
          <button
            onClick={() => onImageClick(souvenir.image_url!)}
            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-zoom-in"
          >
            <Image src={souvenir.image_url} alt={souvenir.title}
              width={48} height={48} className="w-full h-full object-cover" />
          </button>
        )}
        {souvenir.audio_url && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-terracotta-50 text-terracotta-700 text-xs font-semibold">
            <Mic className="w-3 h-3" />
            <span>Audio</span>
          </div>
        )}
      </div>
    </div>
  )
}
