import Link from 'next/link'
import Header from '@/components/layout/Header'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-parchment-100">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <p className="text-7xl mb-6">🌳</p>
        <h1 className="text-4xl font-display font-bold text-heritage-ink mb-3">
          Page introuvable
        </h1>
        <p className="text-heritage-brown font-medium text-lg mb-8 max-w-sm">
          Cette page n&apos;existe pas dans l&apos;archive familiale.
        </p>
        <Link href="/" className="btn-primary">
          Retourner à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
