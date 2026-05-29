'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/layout/Header'
import PersonForm from '@/components/PersonForm'

export default function AjouterPage() {
  return (
    <div className="min-h-screen bg-parchment-100">
      <Header showAddButton={false} />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-heritage-brown hover:text-heritage-ink mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;arbre
        </Link>

        <h1 className="text-2xl font-display font-bold text-heritage-ink mb-6">
          Ajouter une personne
        </h1>

        <PersonForm mode="add" />
      </main>
    </div>
  )
}
