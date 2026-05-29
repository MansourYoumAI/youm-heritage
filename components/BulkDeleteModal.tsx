'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface BulkDeleteModalProps {
  ids: string[]
  onClose: () => void
  onDeleted: () => void
}

export default function BulkDeleteModal({ ids, onClose, onDeleted }: BulkDeleteModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [onClose])

  async function handleDelete() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/persons/delete-many', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, password }),
      })
      if (res.status === 401) { setError('Mot de passe incorrect'); setLoading(false); return }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erreur lors de la suppression')
        setLoading(false)
        return
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('youm-data-updated'))
      }
      onDeleted()
    } catch {
      setError('Erreur réseau, réessayez')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={loading ? undefined : onClose}
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
            Supprimer {ids.length} membre{ids.length > 1 ? 's' : ''} ?
          </h3>
        </div>

        <p className="text-heritage-brown font-medium mb-5 leading-relaxed">
          Vous allez supprimer <strong className="text-heritage-ink">{ids.length} personne{ids.length > 1 ? 's' : ''}</strong> de l&apos;arbre familial, ainsi que leurs souvenirs, photos et liens. Cette action est irréversible.
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
          onKeyDown={e => { if (e.key === 'Enter' && password) handleDelete() }}
        />

        {error && (
          <p className="mt-2 text-sm font-semibold text-terracotta-700 bg-terracotta-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
            Annuler
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || !password}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-terracotta-500 text-white font-semibold hover:bg-terracotta-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ minHeight: 48 }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Supprimer ${ids.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
