'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Check, AlertTriangle, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Person } from '@/lib/types'

interface AddParentsFormProps {
  childId: string
  onSaved: () => void
}

export default function AddParentsForm({ childId, onSaved }: AddParentsFormProps) {
  const supabase = createClient()
  const submittingRef = useRef(false)

  const [child, setChild] = useState<Person | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Père
  const [fatherFirst, setFatherFirst] = useState('')
  const [fatherLast, setFatherLast] = useState('Youm')
  const [fatherYear, setFatherYear] = useState('')

  // Mère
  const [motherFirst, setMotherFirst] = useState('')
  const [motherLast, setMotherLast] = useState('Youm')
  const [motherMaiden, setMotherMaiden] = useState('')
  const [motherYear, setMotherYear] = useState('')

  useEffect(() => {
    supabase.from('persons').select('*').eq('id', childId).single()
      .then(({ data }) => setChild(data))
  }, [childId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (submittingRef.current) return

    const hasFather = fatherFirst.trim() && fatherLast.trim()
    const hasMother = motherFirst.trim() && motherLast.trim()

    if (!hasFather && !hasMother) {
      setError("Renseignez au moins un parent (prénom et nom).")
      return
    }

    submittingRef.current = true
    setSaving(true)

    try {
      // 1. Créer le(s) parent(s)
      let fatherId: string | undefined
      let motherId: string | undefined

      if (hasFather) {
        const { data, error: err } = await supabase
          .from('persons')
          .insert({
            first_name: fatherFirst.trim(),
            last_name: fatherLast.trim(),
            gender: 'homme',
            birth_date: fatherYear.trim() || null,
            is_royal: false,
          })
          .select()
          .single()
        if (err) throw err
        fatherId = data.id
      }

      if (hasMother) {
        const { data, error: err } = await supabase
          .from('persons')
          .insert({
            first_name: motherFirst.trim(),
            last_name: motherLast.trim(),
            maiden_name: motherMaiden.trim() || null,
            gender: 'femme',
            birth_date: motherYear.trim() || null,
            is_royal: false,
          })
          .select()
          .single()
        if (err) throw err
        motherId = data.id
      }

      // 2. Relations parent-enfant + mariage entre les deux parents
      const rels: { person1_id: string; person2_id: string; type: string }[] = []
      if (fatherId) rels.push({ person1_id: fatherId, person2_id: childId, type: 'parent-enfant' })
      if (motherId) rels.push({ person1_id: motherId, person2_id: childId, type: 'parent-enfant' })
      if (fatherId && motherId) {
        rels.push({ person1_id: fatherId, person2_id: motherId, type: 'mariage' })
      }
      if (rels.length > 0) await supabase.from('relationships').insert(rels)

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('youm-data-updated'))
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      submittingRef.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {child && (
        <div className="bg-heritage-green/10 border-2 border-heritage-green/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Link2 className="w-5 h-5 text-heritage-green flex-shrink-0" />
          <p className="font-semibold text-heritage-green text-sm">
            Parents de {child.first_name} {child.last_name}
          </p>
        </div>
      )}

      <section className="card p-5 space-y-4">
        <h3 className="text-base font-display font-bold text-heritage-ink">Père</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom</label>
            <input className="input" value={fatherFirst}
              onChange={e => setFatherFirst(e.target.value)} placeholder="Malick" />
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" value={fatherLast}
              onChange={e => setFatherLast(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h3 className="text-base font-display font-bold text-heritage-ink">Mère</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Prénom</label>
            <input className="input" value={motherFirst}
              onChange={e => setMotherFirst(e.target.value)} placeholder="Fatou Binetou" />
          </div>
          <div>
            <label className="label">Nom</label>
            <input className="input" value={motherLast}
              onChange={e => setMotherLast(e.target.value)} />
          </div>
        </div>
      </section>

      <p className="text-xs text-heritage-brown font-medium text-center">
        Laissez vide un parent inconnu. Les deux parents seront automatiquement liés par mariage si renseignés.
      </p>

      {error && (
        <div className="bg-terracotta-50 border border-terracotta-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-terracotta-500 flex-shrink-0" />
          <p className="text-terracotta-800 font-semibold">{error}</p>
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={saving}>
        {saving
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement</>
          : <><Check className="w-5 h-5" /> Enregistrer les parents</>
        }
      </button>
    </form>
  )
}
