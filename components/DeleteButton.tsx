'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteButtonProps {
  personId: string
  personName: string
  variant?: 'compact' | 'full'
  onDeleted?: () => void
}

export default function DeleteButton({
  personId,
  personName,
  variant = 'full',
  onDeleted,
}: DeleteButtonProps) {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/persons/${personId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.status === 401) {
        setError('Mot de passe incorrect')
        setLoading(false)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erreur lors de la suppression')
        setLoading(false)
        return
      }

      // Succès — on notifie les autres vues, on ferme et on redirige vers l'arbre
      setShow(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('youm-data-updated'))
      }
      if (onDeleted) onDeleted()
      router.push('/')
      router.refresh()
    } catch {
      setError('Erreur réseau, réessayez')
      setLoading(false)
    }
  }

  function reset() {
    setShow(false)
    setPassword('')
    setError('')
    setLoading(false)
  }

  return (
    <>
      {variant === 'full' ? (
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-terracotta-600 hover:bg-terracotta-50 transition-colors text-sm font-semibold"
          title="Supprimer cette personne"
        >
          <Trash2 className="w-4 h-4" />
          Supprimer
        </button>
      ) : (
        <button
          onClick={() => setShow(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-terracotta-600 hover:bg-terracotta-50 transition-colors text-xs font-semibold"
          title="Supprimer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer
        </button>
      )}

      {show && (
        <div
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={loading ? undefined : reset}
        >
          <div
            className="bg-white rounded-2xl shadow-warm-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-terracotta-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-terracotta-600" />
              </div>
              <h3 className="font-display font-bold text-xl text-heritage-ink">
                Supprimer définitivement ?
              </h3>
            </div>

            <p className="text-heritage-brown font-medium mb-5 leading-relaxed">
              Vous êtes sur le point de supprimer <strong className="text-heritage-ink">{personName}</strong> de l&apos;arbre familial.
              Ses récits familiaux, photos et liens seront également supprimés. Cette action est irréversible.
            </p>

            <label className="label">Mot de passe de suppression</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="Entrez le mot de passe"
              autoFocus
              disabled={loading}
              onKeyDown={e => {
                if (e.key === 'Enter' && password) handleDelete()
              }}
            />

            {error && (
              <p className="mt-2 text-sm font-semibold text-terracotta-700 bg-terracotta-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={reset}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || !password}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-terracotta-500 text-white font-semibold hover:bg-terracotta-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ minHeight: 48 }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
