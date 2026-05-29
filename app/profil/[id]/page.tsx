import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Crown, MapPin, Calendar, Edit2, ArrowLeft, Users, BookOpen, ArrowRight } from 'lucide-react'
import Header from '@/components/layout/Header'
import SouvenirsSection from '@/components/SouvenirsSection'
import ClickablePhoto from '@/components/ClickablePhoto'
import DeleteButton from '@/components/DeleteButton'
import { createClient } from '@/lib/supabase-server'
import {
  getInitials, formatLifespan, getBirthPlaceDisplay, getAvatarColors,
  getKingdomFromTitle, KINGDOM_LABELS, KINGDOM_EMBLEMS,
} from '@/lib/utils'
import type { Person } from '@/lib/types'

interface Props {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props) {
  const supabase = createClient()
  const { data: person } = await supabase
    .from('persons')
    .select('first_name, last_name')
    .eq('id', params.id)
    .single()

  if (!person) return { title: 'Profil introuvable' }
  return { title: `${person.first_name} ${person.last_name}` }
}

export default async function ProfilPage({ params }: Props) {
  const supabase = createClient()

  const [
    { data: person },
    { data: relationships },
  ] = await Promise.all([
    supabase.from('persons').select('*').eq('id', params.id).single(),
    supabase
      .from('relationships')
      .select('*, person1:persons!relationships_person1_id_fkey(*), person2:persons!relationships_person2_id_fkey(*)')
      .or(`person1_id.eq.${params.id},person2_id.eq.${params.id}`),
  ])

  if (!person) notFound()

  const parents: Person[] = []
  const children: Person[] = []
  const spouses: Person[] = []

  for (const rel of relationships || []) {
    if (rel.type === 'parent-enfant') {
      if (rel.person1_id === params.id) {
        if (rel.person2) children.push(rel.person2)
      } else {
        if (rel.person1) parents.push(rel.person1)
      }
    } else if (rel.type === 'mariage' || rel.type === 'union') {
      if (rel.person1_id === params.id && rel.person2) spouses.push(rel.person2)
      else if (rel.person2_id === params.id && rel.person1) spouses.push(rel.person1)
    }
  }

  const initials = getInitials(person)
  const birthPlace = getBirthPlaceDisplay(person)
  const avatarColors = getAvatarColors(person)

  return (
    <div className="min-h-screen bg-parchment-100">
      <Header showAddButton={false} />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <div className="flex items-center justify-between mb-4 gap-2">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-heritage-brown hover:text-heritage-ink transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;arbre
          </Link>

          <div className="flex items-center gap-2">
            <DeleteButton
              personId={params.id}
              personName={`${person.first_name} ${person.last_name}`}
            />
            <Link
              href={`/modifier/${params.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-heritage-green text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </Link>
          </div>
        </div>

        <section className={`p-6 mb-6 ${person.is_royal ? 'card-royal' : 'card'}`}>
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`w-28 h-28 rounded-2xl overflow-hidden border-4 ${person.is_royal ? 'border-royal-gold' : 'border-parchment-400'}`}
              style={person.is_royal ? { boxShadow: '0 0 0 2px rgba(196,146,42,0.3), 0 4px 16px rgba(0,0,0,0.1)' } : undefined}>
              {person.profile_picture_url ? (
                <ClickablePhoto
                  src={person.profile_picture_url}
                  alt={`${person.first_name} ${person.last_name}`}
                  width={112}
                  height={112}
                  className="w-full h-full"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center font-display font-bold text-3xl ${avatarColors.bg} ${avatarColors.text}`}>
                  {initials}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-heritage-ink leading-tight">
                  {person.first_name} {person.last_name}
                </h1>
                {person.is_royal && <Crown className="w-6 h-6 text-royal-gold" />}
              </div>

              {person.maiden_name && (
                <p className="text-sm font-medium text-heritage-brown mt-0.5">
                  née {person.maiden_name}
                </p>
              )}

              {person.nickname && (
                <p className="text-base font-medium italic text-heritage-brown mt-1">
                  &ldquo;{person.nickname}&rdquo;
                </p>
              )}

              {person.is_royal && person.royal_title && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-royal-gold-light text-royal-gold-dark text-xs font-bold uppercase tracking-wide border border-royal-gold/40">
                  <Crown className="w-3.5 h-3.5" />
                  {person.royal_title}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3">
                {(person.birth_date || person.death_date) && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-heritage-brown">
                    <Calendar className="w-4 h-4" />
                    <span>{formatLifespan(person)}</span>
                  </div>
                )}
                {birthPlace && (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-heritage-brown">
                    <MapPin className="w-4 h-4" />
                    <span>{birthPlace}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Invitation à découvrir la fiche du royaume si applicable */}
        {(() => {
          const kingdom = getKingdomFromTitle(person.royal_title)
          if (!kingdom) return null
          return (
            <Link
              href={`/${kingdom}`}
              className="group block card p-5 mb-6 bg-gradient-to-br from-royal-gold-light to-parchment-100 border-2 border-royal-gold/40 hover:shadow-warm-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl flex-shrink-0 leading-none select-none" aria-hidden>
                  {KINGDOM_EMBLEMS[kingdom]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-royal-gold-dark">
                    Souverain·e du
                  </p>
                  <p className="font-display font-bold text-xl text-heritage-ink leading-tight">
                    Royaume du {KINGDOM_LABELS[kingdom]}
                  </p>
                  <p className="text-sm font-medium text-heritage-brown mt-1">
                    Découvrir la fiche historique et les autres souverains de la famille
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-royal-gold-dark flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )
        })()}

        {person.biography && (
          <section className="card p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-5 h-5 text-terracotta-500" />
              <h2 className="text-xl font-display font-bold text-heritage-ink">Biographie</h2>
            </div>
            <p className="text-heritage-ink font-medium leading-relaxed whitespace-pre-wrap">
              {person.biography}
            </p>
          </section>
        )}

        {(parents.length > 0 || spouses.length > 0 || children.length > 0) && (
          <section className="card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-terracotta-500" />
              <h2 className="text-xl font-display font-bold text-heritage-ink">Famille</h2>
            </div>

            <div className="space-y-5">
              {parents.length > 0 && (
                <RelationGroup label="Parents" persons={parents} />
              )}
              {spouses.length > 0 && (
                <RelationGroup label={spouses.length > 1 ? 'Conjoints' : 'Conjoint(e)'} persons={spouses} />
              )}
              {children.length > 0 && (
                <RelationGroup label={children.length > 1 ? 'Enfants' : 'Enfant'} persons={children} />
              )}
            </div>
          </section>
        )}

        <SouvenirsSection personId={params.id} />
      </main>
    </div>
  )
}

function RelationGroup({ label, persons }: { label: string; persons: Person[] }) {
  return (
    <div>
      <p className="text-xs font-bold text-heritage-brown uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-2">
        {persons.map(p => (
          <Link key={p.id} href={`/profil/${p.id}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-parchment-100 hover:bg-parchment-200 transition-colors group">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border-2 border-parchment-400">
              {p.profile_picture_url ? (
                <Image src={p.profile_picture_url} alt={`${p.first_name} ${p.last_name}`}
                  width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-parchment-300 text-heritage-brown">
                  {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-heritage-ink text-sm group-hover:text-terracotta-600 transition-colors truncate">
                {p.first_name} {p.last_name}
              </p>
            </div>
            {p.is_royal && <Crown className="w-4 h-4 text-royal-gold flex-shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
