'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { findFamilyFocal } from '@/lib/utils'

export default function PdfButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: persons }, { data: rels }] = await Promise.all([
        supabase.from('persons').select('*').order('display_order', { ascending: true }),
        supabase.from('relationships').select('*'),
      ])

      const allPersons = persons || []
      const allRels = rels || []
      const focalId = findFamilyFocal(allPersons, allRels, 'youm')

      const { downloadFamilyTreePdf } = await import('@/lib/generatePdf')
      await downloadFamilyTreePdf(allPersons, allRels, focalId, 'Youm')
    } catch (err) {
      console.error('Erreur PDF :', err)
      alert("Erreur lors de la génération du PDF. Réessayez dans un instant.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-2 rounded-lg text-heritage-brown hover:text-heritage-green hover:bg-parchment-200 transition-colors disabled:opacity-50 flex-shrink-0"
      title="Télécharger l'arbre Youm en PDF (format A0)"
      aria-label="Télécharger l'arbre généalogique en PDF"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Download className="w-5 h-5" />
      )}
    </button>
  )
}
