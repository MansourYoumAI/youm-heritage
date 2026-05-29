'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import PersonForm from '@/components/PersonForm'
import SouvenirsSection from '@/components/SouvenirsSection'
import { createClient } from '@/lib/supabase'
import type { Person } from '@/lib/types'

export default function ModifierPage() {
  const params = useParams<{ id: string }>()
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('persons')
        .select('*')
        .eq('id', params.id)
        .single()
      setPerson(data)
      setLoading(false)
    }
    load()
  }, [params.id])

  return (
    <div className="min-h-screen bg-parchment-100">
      <Header showAddButton={false} />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <Link href={`/profil/${params.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-heritage-brown hover:text-heritage-ink mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour au profil
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-parchment-400 border-t-terracotta-500 animate-spin" />
          </div>
        ) : person ? (
          <>
            <h1 className="text-2xl font-display font-bold text-heritage-ink mb-6">
              Modifier {person.first_name} {person.last_name}
            </h1>
            <PersonForm mode="edit" person={person} />

            <div className="mt-10">
              <SouvenirsSection personId={person.id} />
            </div>
          </>
        ) : (
          <p className="text-heritage-brown">Personne introuvable.</p>
        )}
      </main>
    </div>
  )
}
