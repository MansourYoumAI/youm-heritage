'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Trash2, X, Search, Crown, Download, UserPlus, Loader2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import FamilyTree from '@/components/tree/FamilyTree'
import PersonPreviewPanel from '@/components/PersonPreviewPanel'
import BulkDeleteModal from '@/components/BulkDeleteModal'
import RoyalGenerationModal from '@/components/RoyalGenerationModal'
import ProfileModal from '@/components/ProfileModal'
import type { GenerationBand } from '@/lib/treeLayout'
import type { Person, Relationship, Souvenir } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { findFamilyFocal, cn } from '@/lib/utils'

export default function HomePage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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
  const [souvenirFilter, setSouvenirFilter] = useState(false)
  const [centerTargetId, setCenterTargetId] = useState<string | null>(null)

  // Téléchargement PDF (logique inlined depuis l'ancien PdfButton)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  async function downloadPdf() {
    if (downloadingPdf) return
    setDownloadingPdf(true)
    try {
      const supabase = createClient()
      const [{ data: ps }, { data: rels }] = await Promise.all([
        supabase.from('persons').select('*').order('display_order', { ascending: true }),
        supabase.from('relationships').select('*'),
      ])
      const allPersons = ps || []
      const allRels = rels || []
      const fId = findFamilyFocal(allPersons, allRels, 'youm')
      const { downloadFamilyTreePdf } = await import('@/lib/generatePdf')
      await downloadFamilyTreePdf(allPersons, allRels, fId, 'Youm')
    } catch (err) {
      console.error('Erreur PDF :', err)
      alert("Erreur lors de la génération du PDF.")
    } finally {
      setDownloadingPdf(false)
    }
  }

  function openAddDrawer() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('ajouter', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  // Modales : royaux par génération + profil personne
  const [openGen, setOpenGen] = useState<GenerationBand | null>(null)
  const [openProfileId, setOpenProfileId] = useState<string | null>(null)
  // Légende hoistée pour pouvoir ouvrir depuis la sidebar
  const [legendOpen, setLegendOpen] = useState(false)


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
    <div className="flex h-screen bg-parchment-100">
      <Sidebar
        treeMode
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchMatches={searchMatches}
        onPickMatch={p => {
          setCenterTargetId(p.id)
          setSearchQuery('')
        }}
        onDownloadPdf={downloadPdf}
        downloadingPdf={downloadingPdf}
        onToggleLegend={() => setLegendOpen(o => !o)}
        legendOpen={legendOpen}
        onAddMember={openAddDrawer}
      />

      <div className="flex-1 relative min-h-0 overflow-hidden">
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
              onToggleRoyalFilter={() => setRoyalFilter(v => !v)}
              souvenirFilter={souvenirFilter}
              onToggleSouvenirFilter={() => setSouvenirFilter(v => !v)}
              hideTopActions
              legendOpenControlled={legendOpen}
              onLegendClose={() => setLegendOpen(false)}
              onOpenRoyalGeneration={gen => setOpenGen(gen)}
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

      {openGen && (
        <RoyalGenerationModal
          generation={openGen}
          persons={persons}
          onClose={() => setOpenGen(null)}
          onOpenPerson={id => setOpenProfileId(id)}
        />
      )}

      {openProfileId && (
        <ProfileModal
          personId={openProfileId}
          onClose={() => setOpenProfileId(null)}
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
