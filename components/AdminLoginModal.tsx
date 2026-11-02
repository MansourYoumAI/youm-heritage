'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Lock } from 'lucide-react'

interface AdminLoginModalProps {
  onClose: () => void
  onSubmit: (password: string) => Promise<boolean>
}

export default function AdminLoginModal({ onClose, onSubmit }: AdminLoginModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const ok = await onSubmit(password)
    setBusy(false)
    if (!ok) {
      setError('Mot de passe incorrect.')
      setPassword('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-heritage-ink/70 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-warm-xl w-full max-w-sm border-2 border-royal-gold/30 overflow-hidden"
      >
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-royal-gold-light to-parchment-100 border-b border-royal-gold/20">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full text-heritage-brown hover:bg-white/60 flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-royal-gold flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-lg text-heritage-ink font-semibold">
                Mode administrateur
              </h2>
              <p className="text-xs text-heritage-brown">
                Pour ajouter, modifier ou supprimer.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-heritage-brown mb-1.5">
            Mot de passe
          </label>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            autoComplete="current-password"
            className="w-full px-3 py-2 rounded-lg border-2 border-parchment-400 focus:border-royal-gold focus:outline-none text-sm"
            placeholder="••••••••"
          />
          {error && (
            <p className="mt-2 text-xs text-terracotta-600 font-semibold">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password}
            className="mt-4 w-full px-4 py-2 rounded-lg bg-royal-gold text-white font-semibold hover:bg-royal-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Entrer
          </button>
        </div>
      </form>
    </div>
  )
}
