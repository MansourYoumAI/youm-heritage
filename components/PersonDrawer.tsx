'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import PersonForm from './PersonForm'
import AddParentsForm from './AddParentsForm'
import { createClient } from '@/lib/supabase'
import type { Person } from '@/lib/types'

export default function PersonDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isAdd = searchParams.get('ajouter') === '1'
  const modifierId = searchParams.get('modifier')
  const parentsOfId = searchParams.get('parents_of')
  const isAddParents = !!parentsOfId
  const isOpen = isAdd || !!modifierId || isAddParents

  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [loadingPerson, setLoadingPerson] = useState(false)

  useEffect(() => {
    if (!modifierId) {
      setEditPerson(null)
      return
    }
    let cancelled = false
    setLoadingPerson(true)
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('persons')
        .select('*')
        .eq('id', modifierId)
        .single()
      if (!cancelled) {
        setEditPerson(data)
        setLoadingPerson(false)
      }
    })()
    return () => { cancelled = true }
  }, [modifierId])

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('ajouter')
    params.delete('modifier')
    params.delete('parent_of')
    params.delete('child_of')
    params.delete('spouse_of')
    params.delete('parents_of')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (!isOpen) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
  }, [isOpen, close])

  if (!isOpen) return null

  const mode = isAdd ? 'add' : 'edit'
  const title = isAddParents
    ? 'Ajouter le père et la mère'
    : isAdd
      ? 'Ajouter un membre'
      : editPerson
        ? `Modifier ${editPerson.first_name} ${editPerson.last_name}`
        : 'Modification'

  return (
    <div className="fixed inset-0 z-[70] flex justify-end pointer-events-none">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={close}
      />
      <div
        key={modifierId || 'add'}
        className="relative pointer-events-auto w-full md:w-[34rem] max-w-full bg-parchment-100 shadow-warm-xl overflow-y-auto animate-slide-in-right border-l border-parchment-400"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-parchment-400 px-5 py-3.5 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-heritage-ink truncate pr-3">{title}</h2>
          <button
            onClick={close}
            className="w-9 h-9 rounded-full bg-parchment-200 flex items-center justify-center text-heritage-brown hover:bg-parchment-300 transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 pb-12">
          {isAddParents && parentsOfId ? (
            <AddParentsForm childId={parentsOfId} onSaved={close} />
          ) : mode === 'edit' && loadingPerson ? (
            <div className="flex items-center gap-3 text-heritage-brown py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Chargement...
            </div>
          ) : mode === 'edit' && editPerson ? (
            <PersonForm mode="edit" person={editPerson} onSaved={close} />
          ) : (
            <PersonForm mode="add" onSaved={close} />
          )}
        </div>
      </div>
    </div>
  )
}
