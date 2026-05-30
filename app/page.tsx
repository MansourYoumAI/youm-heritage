'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MousePointerSquareDashed, Trash2, X, Search, Crown } from 'lucide-react'
import Header from '@/components/layout/Header'
import FamilyTree from '@/components/tree/FamilyTree'
import PersonPreviewPanel from '@/components/PersonPreviewPanel'
import BulkDeleteModal from '@/components/BulkDeleteModal'
import type { Person, Relationship, Souvenir } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { findFamilyFocal } from '@/lib/utils'

export default function HomePage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)

  // Recherche + filtre royal
  const [searchQuery, setSearchQuery] = useState('')
  const [royalFilter, setRoyalFilter] = useState(false)
  const [centerTargetId, setCenterTargetId] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const [{ data: ps }, { data: rels }, { data: sv }] = await Promise.all([
        supabase
          .from('persons')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('relationships')
          .select('*'),
        supabase
          .from('souvenirs')
          .select('*')
          .not('person_id', 'is', null),
      ])
      setPersons(ps || [])
      setRelationships(rels || [])
      setSouvenirs(sv || [])
      setLoading(false)
    }
    loadData()
    window.addEventListener('youm-data-updated', loadData)
    return () => window.removeEventListener('youm-data-updated', loadData)
  }, [])

  const focalId = useMemo(
    () => findFamilyFocal(persons, relationships, 'youm'),
    [persons, relationships],
  )

  function toggleSelectionMode() {
    if (selectionMode) {
      setSelectedIds(new Set())
      setSelectionMode(false)
    } else {
      setSelectedPerson(null)
      setSelectionMode(true)
    }
  }

  // Touche Suppr → ouvre la modale de suppression en masse
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && !showBulkDelete) {
          // Ignore si l'utilisateur est en train de saisir dans un champ
          const target = e.target as HTMLElement
          const tag = target.tagName
          if (tag === 'INPUT' || tag === 'TEXTAREA') return
          e.preventDefault()
          setShowBulkDelete(true)
        }
      } else if (e.key === 'Escape' && selectionMode) {
        setSelectedIds(new Set())
        setSelectionMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, selectionMode, showBulkDelete])

  // Souvenirs indexés par person_id
  const souvenirsByPerson = useMemo(() => {
    const m = new Map<string, Souvenir[]>()
    for (const s of souvenirs) {
      if (!s.person_id) continue
      const arr = m.get(s.person_id) || []
      arr.push(s)
      m.set(s.person_id, arr)
    }
    return m
  }, [souvenirs])

  // Recherche : alphabétique + dédupliquée (par prénom+nom+année si présente)
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null
    const matches: Person[] = []
    for (const p of persons) {
      const text = `${p.first_name || ''} ${p.last_name || ''} ${p.maiden_name || ''} ${p.nickname || ''}`.toLowerCase()
      if (text.includes(q)) matches.push(p)
    }
    // Dédup : si deux personnes ont exactement les mêmes prénom + nom + année
    // de naissance, on garde la première (probable doublon créé par erreur)
    const seen = new Set<string>()
    const deduped: Person[] = []
    for (const p of matches) {
      const key = `${(p.first_name || '').trim().toLowerCase()}|${(p.last_name || '').trim().toLowerCase()}|${(p.birth_date || '').trim()}`
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(p)
    }
    // Tri alphabétique (prénom puis nom)
    deduped.sort((a, b) => {
      const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim()
      const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim()
      return aName.localeCompare(bName, 'fr', { sensitivity: 'base' })
    })
    return deduped
  }, [searchQuery, persons])

  const searchMatchIds = useMemo(() => {
    if (!searchMatches) return null
    return new Set(searchMatches.map(p => p.id))
  }, [searchMatches])

  return (
    <div className="flex flex-col h-screen bg-parchment-100">
      <Header />

      {/* Barre de navigation : recherche, filtres */}
      <div className="bg-white border-b border-parchment-400 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
        {/* Recherche par prénom / nom — discrète : transparente au repos,
            mise en relief uniquement au focus / quand il y a du texte */}
        <div className="relative w-44 sm:w-56">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-heritage-brown opacity-40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className={cn(
              'w-full pl-7 pr-6 py-1 text-xs rounded-full border outline-none transition-all',
              'placeholder:text-heritage-brown placeholder:opacity-40',
              searchQuery
                ? 'bg-white border-parchment-400 text-heritage-ink'
                : 'bg-transparent border-transparent text-heritage-ink hover:bg-parchment-100 focus:bg-white focus:border-parchment-400',
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-heritage-brown hover:bg-parchment-300"
              aria-label="Effacer la recherche"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {searchMatches && searchMatches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-parchment-400 rounded-xl shadow-warm-xl max-h-72 overflow-y-auto z-50">
              {searchMatches.slice(0, 12).map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCenterTargetId(p.id)
                    setSearchQuery('')
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-parchment-100 transition-colors flex items-center gap-2 text-xs border-b border-parchment-200 last:border-b-0"
                >
                  {p.is_royal && <Crown className="w-3 h-3 text-royal-gold flex-shrink-0" />}
                  <span className="font-semibold text-heritage-ink truncate">
                    {p.first_name} {p.last_name}
                  </span>
                  {p.maiden_name && (
                    <span className="text-heritage-brown opacity-70 text-[10px]">
                      née {p.maiden_name}
                    </span>
                  )}
                </button>
              ))}
              {searchMatches.length > 12 && (
                <div className="px-3 py-2 text-[10px] text-heritage-brown italic">
                  +{searchMatches.length - 12} autre{searchMatches.length - 12 > 1 ? 's' : ''}…
                </div>
              )}
            </div>
          )}
          {searchMatches && searchMatches.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-parchment-400 rounded-xl shadow-warm-xl px-3 py-2 text-xs text-heritage-brown italic z-50">
              Aucun résultat
            </div>
          )}
        </div>

        {/* Filtre royal */}
        <button
          onClick={() => setRoyalFilter(!royalFilter)}
          title={royalFilter ? 'Désactiver le filtre royal' : 'Afficher seulement les profils royaux'}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            royalFilter
              ? 'bg-royal-gold text-heritage-ink'
              : 'text-heritage-brown hover:bg-parchment-200'
          }`}
        >
          <Crown className="w-4 h-4" />
        </button>

        {/* Mode sélection */}
        <button
          onClick={toggleSelectionMode}
          title={selectionMode ? 'Quitter le mode sélection (Échap)' : 'Mode sélection multiple'}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            selectionMode
              ? 'bg-terracotta-500 text-white'
              : 'text-heritage-brown hover:bg-parchment-200'
          }`}
        >
          <MousePointerSquareDashed className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 relative min-h-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-parchment-400 border-t-terracotta-500 animate-spin" />
          </div>
        ) : persons.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="text-6xl mb-4">🌳</div>
              <h2 className="text-xl font-display font-bold text-heritage-ink mb-2">
                L&apos;arbre est vide
              </h2>
              <p className="text-heritage-brown font-medium mb-6">
                Commencez par ajouter le premier membre de la famille.
              </p>
              <Link href="/ajouter" className="btn-primary">
                Ajouter une personne
              </Link>
            </div>
          </div>
        ) : !focalId ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="text-5xl mb-4">🌿</div>
              <h2 className="text-xl font-display font-bold text-heritage-ink mb-2">
                Aucun membre Youm pour l&apos;instant
              </h2>
              <p className="text-heritage-brown font-medium">
                Ajoutez une personne avec le nom Youm pour démarrer l&apos;arbre.
              </p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 p-3">
            <FamilyTree
              persons={persons}
              relationships={relationships}
              focalId={focalId}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPersonClick={setSelectedPerson}
              searchMatchIds={searchMatchIds}
              royalFilter={royalFilter}
              centerTargetId={centerTargetId}
              onCenterDone={() => setCenterTargetId(null)}
              souvenirsByPerson={souvenirsByPerson}
            />
          </div>
        )}

        {/* Bandeau flottant en bas (visible quand des items sont sélectionnés) */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white border border-parchment-400 shadow-warm-xl rounded-2xl px-5 py-3 flex items-center gap-4">
            <span className="font-bold text-heritage-ink text-sm">
              {selectedIds.size} membre{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-semibold text-heritage-brown hover:text-heritage-ink"
            >
              Tout désélectionner
            </button>
            <button
              onClick={() => setShowBulkDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-terracotta-500 text-white text-sm font-semibold hover:bg-terracotta-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
        )}

        {/* Indicateur mode sélection actif (si rien sélectionné encore) */}
        {selectionMode && selectedIds.size === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-heritage-ink text-white px-4 py-2 rounded-full text-xs font-semibold opacity-80">
            Glissez pour dessiner une zone de sélection, ou cliquez sur les membres. Échap pour quitter.
          </div>
        )}
      </div>

      {selectedPerson && !selectionMode && (
        <PersonPreviewPanel
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onDeleted={() => {
            setSelectedPerson(null)
            setPersons(prev => prev.filter(p => p.id !== selectedPerson.id))
          }}
        />
      )}

      {showBulkDelete && (
        <BulkDeleteModal
          ids={Array.from(selectedIds)}
          onClose={() => setShowBulkDelete(false)}
          onDeleted={() => {
            const deletedSet = new Set(selectedIds)
            setPersons(prev => prev.filter(p => !deletedSet.has(p.id)))
            setSelectedIds(new Set())
            setShowBulkDelete(false)
            setSelectionMode(false)
          }}
        />
      )}
    </div>
  )
}
