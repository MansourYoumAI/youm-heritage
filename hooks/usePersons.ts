'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Person, Relationship } from '@/lib/types'

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('persons')
      .select('*, dynasty:dynasties(*)')
      .order('display_order', { ascending: true })
      .order('last_name', { ascending: true })

    if (err) setError(err.message)
    else setPersons(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { persons, loading, error, reload: load }
}

export function useRelationships(personId?: string) {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      let query = supabase
        .from('relationships')
        .select('*, person1:persons!relationships_person1_id_fkey(*), person2:persons!relationships_person2_id_fkey(*)')

      if (personId) {
        query = query.or(`person1_id.eq.${personId},person2_id.eq.${personId}`)
      }

      const { data } = await query
      setRelationships(data || [])
      setLoading(false)
    }
    load()
  }, [personId])

  return { relationships, loading }
}

export function usePerson(id: string) {
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('persons')
        .select('*, dynasty:dynasties(*), titles(*, dynasty:dynasties(*))')
        .eq('id', id)
        .single()

      setPerson(data)
      setLoading(false)
    }
    load()
  }, [id])

  return { person, loading }
}
