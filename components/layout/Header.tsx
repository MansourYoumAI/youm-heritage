'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { LogOut, Plus, Crown, ScrollText, TreeDeciduous } from 'lucide-react'
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
  const isRoyals = pathname === '/souvenirs'
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
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors',
                isHome
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
              )}
            >
              <TreeDeciduous className="w-4 h-4" />
              Arbre généalogique
            </Link>

            <Link
              href="/souvenirs"
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors',
                isRoyals
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink'
              )}
            >
              <ScrollText className="w-4 h-4" />
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
                      'px-1.5 py-0.5 rounded transition-colors font-semibold',
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

        {/* Navigation mobile sous le header — 2 grands liens, royaumes en petite ligne */}
        <nav className="sm:hidden px-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Link
              href="/"
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold flex-1 justify-center',
                isHome
                  ? 'bg-parchment-200 text-heritage-ink'
                  : 'bg-parchment-100 text-heritage-brown'
              )}
            >
              <TreeDeciduous className="w-3.5 h-3.5" />
              Arbre généalogique
            </Link>
            <Link
              href="/souvenirs"
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold flex-1 justify-center',
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
    </>
  )
}
