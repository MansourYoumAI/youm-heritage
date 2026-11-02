'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Crown, ScrollText, TreeDeciduous, Lock, LogOut } from 'lucide-react'
import PersonDrawer from '@/components/PersonDrawer'
import AdminLoginModal from '@/components/AdminLoginModal'
import { cn } from '@/lib/utils'
import { useAdminMode } from '@/lib/useAdminMode'

// `showAddButton` est conservé pour compatibilité mais n'est plus utilisé
// (les actions add/PDF/logout sont déplacées en flottant dans la vue arbre).
interface HeaderProps {
  showAddButton?: boolean
}

const KINGDOMS: { href: string; label: string }[] = [
  { href: '/cayor', label: 'Cayor' },
  { href: '/baol', label: 'Baol' },
  { href: '/fouta-toro', label: 'Fouta-Toro' },
]

export default function Header({}: HeaderProps) {
  const pathname = usePathname()
  const { isAdmin, enterPassword, logout } = useAdminMode()
  const [loginOpen, setLoginOpen] = useState(false)

  const isHome = pathname === '/'
  const isRoyals = pathname === '/recits'
  const isKingdom = KINGDOMS.some(k => k.href === pathname)

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-parchment-400 shadow-warm-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-white text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C4922A 0%, #8B6214 100%)' }}>
              Y
            </div>
            <span className="font-display font-bold text-heritage-ink text-base truncate hidden md:inline">
              Famille Youm
            </span>
          </Link>

          {/* Navigation desktop : 2 grands liens + groupe discret royaumes */}
          <nav className="hidden sm:flex items-center gap-1.5 flex-1 justify-center min-w-0">
            <Link
              href="/"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-display text-sm font-semibold italic transition-colors',
                isHome
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
              )}
            >
              <TreeDeciduous className="w-3.5 h-3.5" />
              Arbre généalogique
            </Link>

            <Link
              href="/recits"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-display text-sm font-semibold italic transition-colors',
                isRoyals
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
              )}
            >
              <ScrollText className="w-3.5 h-3.5" />
              Récits familiaux royaux
            </Link>

            {/* Groupe royaumes — une seule icône, 3 noms discrets séparés par · */}
            <div className={cn(
              'inline-flex items-center gap-1.5 ml-1 pl-3 border-l border-parchment-300 text-[11px]',
              isKingdom && 'text-heritage-ink',
            )}>
              <Crown className="w-3.5 h-3.5 text-royal-gold-dark flex-shrink-0" />
              {KINGDOMS.map((k, i) => (
                <span key={k.href} className="flex items-center gap-1.5">
                  <Link
                    href={k.href}
                    className={cn(
                      'px-1.5 py-0.5 rounded transition-colors font-display font-semibold italic text-[13px]',
                      pathname === k.href
                        ? 'bg-royal-gold-light text-royal-gold-dark'
                        : 'text-heritage-brown hover:text-heritage-ink hover:bg-parchment-100'
                    )}
                  >
                    {k.label}
                  </Link>
                  {i < KINGDOMS.length - 1 && <span className="text-parchment-500 select-none">·</span>}
                </span>
              ))}
            </div>
          </nav>

          {/* Bouton admin discret à droite */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isAdmin ? (
              <button
                onClick={logout}
                title="Quitter le mode administrateur"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-royal-gold-dark bg-royal-gold-light hover:bg-royal-gold hover:text-white transition-colors border border-royal-gold/40"
              >
                <Crown className="w-3 h-3" fill="currentColor" />
                <span className="hidden sm:inline">Admin</span>
                <LogOut className="w-2.5 h-2.5 opacity-70" />
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                title="Mode administrateur"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-parchment-500 hover:text-heritage-brown hover:bg-parchment-200 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation mobile sous le header — 2 grands liens, royaumes en petite ligne */}
        <nav className="sm:hidden px-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-display text-sm font-semibold italic flex-1 justify-center',
                isHome
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'bg-parchment-100 text-heritage-brown'
              )}
            >
              <TreeDeciduous className="w-3.5 h-3.5" />
              Arbre généalogique
            </Link>
            <Link
              href="/recits"
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-display text-sm font-semibold italic flex-1 justify-center',
                isRoyals
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'bg-parchment-100 text-heritage-brown'
              )}
            >
              <ScrollText className="w-3.5 h-3.5" />
              Récits royaux
            </Link>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[10px]">
            <Crown className="w-3 h-3 text-royal-gold-dark" />
            {KINGDOMS.map((k, i) => (
              <span key={k.href} className="flex items-center gap-1.5">
                <Link
                  href={k.href}
                  className={cn(
                    'px-1.5 py-0.5 rounded font-semibold',
                    pathname === k.href
                      ? 'bg-royal-gold-light text-royal-gold-dark'
                      : 'text-heritage-brown'
                  )}
                >
                  {k.label}
                </Link>
                {i < KINGDOMS.length - 1 && <span className="text-parchment-500 select-none">·</span>}
              </span>
            ))}
          </div>
        </nav>
      </header>

      <PersonDrawer />

      {loginOpen && (
        <AdminLoginModal
          onClose={() => setLoginOpen(false)}
          onSubmit={async (pw) => {
            const ok = await enterPassword(pw)
            if (ok) setLoginOpen(false)
            return ok
          }}
        />
      )}
    </>
  )
}
