'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { LogOut, Plus, Crown, Sparkles } from 'lucide-react'
import PdfButton from '@/components/PdfButton'
import PersonDrawer from '@/components/PersonDrawer'
import { cn } from '@/lib/utils'

interface HeaderProps {
  showAddButton?: boolean
}

const KINGDOMS: { href: string; label: string }[] = [
  { href: '/cayor', label: 'Cayor' },
  { href: '/baol', label: 'Baol' },
  { href: '/fouta-toro', label: 'Fouta-Toro' },
]

const SOUVENIRS_LINK = { href: '/souvenirs', label: 'Souvenirs' }

export default function Header({ showAddButton = true }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/connexion')
    router.refresh()
  }

  function openAddDrawer() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('ajouter', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const isHome = pathname === '/'

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-parchment-400 shadow-warm-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-white text-base flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C4922A 0%, #8B6214 100%)' }}>
              Y
            </div>
            <span className="font-display font-bold text-heritage-ink text-base truncate">
              Famille Youm
            </span>
          </Link>

          {/* Navigation Royaumes */}
          <nav className="hidden sm:flex items-center gap-0.5 ml-2">
            <Link
              href="/"
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                isHome
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
              )}
            >
              Arbre
            </Link>
            {KINGDOMS.map(k => {
              const active = pathname === k.href
              return (
                <Link
                  key={k.href}
                  href={k.href}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    active
                      ? 'bg-royal-gold-light text-royal-gold-dark'
                      : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
                  )}
                >
                  <Crown className="w-3 h-3" />
                  {k.label}
                </Link>
              )
            })}
            <Link
              href={SOUVENIRS_LINK.href}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                pathname === SOUVENIRS_LINK.href
                  ? 'bg-terracotta-100 text-terracotta-700'
                  : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
              )}
            >
              <Sparkles className="w-3 h-3" />
              {SOUVENIRS_LINK.label}
            </Link>
          </nav>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {showAddButton && (
              <button
                onClick={openAddDrawer}
                title="Ajouter un membre"
                aria-label="Ajouter un membre"
                className="p-2 rounded-lg text-heritage-brown hover:text-heritage-green hover:bg-parchment-200 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
            <PdfButton />
            <button
              onClick={handleLogout}
              title="Déconnexion"
              aria-label="Déconnexion"
              className="p-2 rounded-lg text-heritage-brown hover:text-terracotta-500 hover:bg-terracotta-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation mobile sous le header */}
        <nav className="sm:hidden flex items-center gap-0.5 px-3 pb-2 overflow-x-auto">
          <Link
            href="/"
            className={cn(
              'px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0',
              isHome
                ? 'bg-parchment-200 text-heritage-ink'
                : 'text-heritage-brown'
            )}
          >
            Arbre
          </Link>
          {KINGDOMS.map(k => {
            const active = pathname === k.href
            return (
              <Link
                key={k.href}
                href={k.href}
                className={cn(
                  'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0',
                  active
                    ? 'bg-royal-gold-light text-royal-gold-dark'
                    : 'text-heritage-brown'
                )}
              >
                <Crown className="w-3 h-3" />
                {k.label}
              </Link>
            )
          })}
          <Link
            href={SOUVENIRS_LINK.href}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0',
              pathname === SOUVENIRS_LINK.href
                ? 'bg-terracotta-100 text-terracotta-700'
                : 'text-heritage-brown'
            )}
          >
            <Sparkles className="w-3 h-3" />
            {SOUVENIRS_LINK.label}
          </Link>
        </nav>
      </header>

      <PersonDrawer />
    </>
  )
}
