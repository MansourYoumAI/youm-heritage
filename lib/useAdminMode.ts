'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Hook admin : interroge le serveur (/api/admin/check) pour savoir si le
 * cookie `youm_admin` signé est présent. Impossible à forger côté client.
 *
 * - enterPassword(pw) → POST /api/admin/login, pose le cookie si bon
 * - logout() → POST /api/admin/logout, efface le cookie
 */
export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/check', { cache: 'no-store' })
      if (!res.ok) {
        setIsAdmin(false)
      } else {
        const data = await res.json()
        setIsAdmin(!!data.isAdmin)
      }
    } catch {
      setIsAdmin(false)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const enterPassword = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) return false
      setIsAdmin(true)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {}
    setIsAdmin(false)
  }, [])

  return { isAdmin, enterPassword, logout, hydrated, refresh }
}
