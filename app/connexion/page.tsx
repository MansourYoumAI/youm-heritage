'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function ConnexionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push(redirect)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Mot de passe incorrect')
        setPassword('')
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-parchment-100 flex flex-col items-center justify-center p-6">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C4922A 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #C2541A 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ background: 'linear-gradient(135deg, #C4922A 0%, #8B6214 100%)' }}>
            <span className="text-3xl font-display font-bold text-white">Y</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-heritage-ink">
            Famille Youm
          </h1>
          <p className="text-heritage-brown mt-2 font-medium">
            Archive familiale
          </p>
        </div>

        {/* Formulaire */}
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-parchment-200 flex items-center justify-center">
              <Lock className="w-5 h-5 text-terracotta-500" />
            </div>
            <div>
              <p className="font-semibold text-heritage-ink text-base">Mot de passe requis</p>
              <p className="text-sm text-heritage-brown">Réservé à la famille</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="Entrez le mot de passe"
                  autoFocus
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-heritage-brown hover:text-heritage-ink transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-terracotta-50 border border-terracotta-200 rounded-lg px-4 py-3">
                <p className="text-terracotta-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !password}
            >
              {loading ? 'Vérification...' : 'Entrer dans la mémoire familiale'}
            </button>
          </form>
        </div>

        {/* Description : même texte que l'encart du PDF, en italique discret */}
        <div className="mt-8 pl-4 border-l-2 border-royal-gold/40 space-y-2.5 text-sm text-heritage-brown italic leading-relaxed">
          <p>
            Cet arbre retrace plusieurs siècles de filiations, depuis les royaumes
            pré-coloniaux du Cayor, du Baol et du Fouta-Toro jusqu&apos;à aujourd&apos;hui.
          </p>
          <p>
            Les liens présentés s&apos;appuient sur des sources vérifiées : archives
            historiques et tradition orale avérée.
          </p>
          <p>
            Cette mémoire est vivante et continue d&apos;être enrichie au fil des
            découvertes.
          </p>
        </div>

        {/* Signature en bas */}
        <p className="text-center text-[11px] text-heritage-brown opacity-70 mt-10">
          Réalisé par Mansour Youm, Juin 2026
        </p>
      </div>
    </div>
  )
}
