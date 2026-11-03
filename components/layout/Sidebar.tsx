'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TreeDeciduous,
  ScrollText,
  Crown,
  Search,
  ImageDown,
  HelpCircle,
  Lock,
  LogOut,
  X,
  UserPlus,
  Loader2,
  Menu,
} from 'lucide-react'
import type { Person } from '@/lib/types'
import AdminLoginModal from '@/components/AdminLoginModal'
import { useAdminMode } from '@/lib/useAdminMode'
import { cn } from '@/lib/utils'

const KINGDOMS = [
  { href: '/cayor', label: 'Cayor' },
  { href: '/baol', label: 'Baol' },
  { href: '/fouta-toro', label: 'Fouta-Toro' },
]

interface SidebarProps {
  /** Mode tree : affiche les actions spécifiques à l'arbre */
  treeMode?: boolean
  // ─── Recherche
  searchQuery?: string
  onSearchChange?: (q: string) => void
  searchMatches?: Person[] | null
  onPickMatch?: (p: Person) => void
  // ─── Actions arbre
  onDownloadPdf?: () => void
  downloadingPdf?: boolean
  onToggleLegend?: () => void
  legendOpen?: boolean
  onAddMember?: () => void
}

export default function Sidebar({
  treeMode = false,
  searchQuery = '',
  onSearchChange,
  searchMatches = null,
  onPickMatch,
  onDownloadPdf,
  downloadingPdf = false,
  onToggleLegend,
  legendOpen = false,
  onAddMember,
}: SidebarProps) {
  const pathname = usePathname()
  const { isAdmin, enterPassword, logout } = useAdminMode()
  const [loginOpen, setLoginOpen] = useState(false)
  // Drawer mobile : fermé par défaut sur mobile, pas d'incidence sur desktop (md:translate-x-0)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isHome = pathname === '/'
  const isRoyals = pathname === '/recits'

  const linkCls = (active: boolean) => cn(
    'flex items-center gap-2.5 px-3 py-2 rounded-lg font-display italic transition-colors text-sm',
    active
      ? 'bg-royal-gold-light text-royal-gold-dark font-bold'
      : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink',
  )

  const actionBtnCls = (active = false) => cn(
    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-display italic text-sm transition-colors',
    active
      ? 'bg-heritage-ink text-white'
      : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink',
  )

  return (
    <>
      {/* Bouton hamburger — visible seulement sur mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-full bg-parchment-50 border border-parchment-400 shadow-warm-md flex items-center justify-center text-heritage-ink"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-heritage-ink/50 backdrop-blur-sm z-40"
        />
      )}

      {/* Sidebar — fixe sur mobile (drawer), sticky sur desktop (collée à gauche) */}
      <aside
        className={cn(
          'w-60 flex-shrink-0 bg-parchment-50 border-r border-parchment-400 flex flex-col h-screen z-50 transition-transform',
          'md:sticky md:top-0 md:translate-x-0',
          'fixed top-0 left-0',
          mobileOpen ? 'translate-x-0 shadow-warm-xl' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Bouton fermer sur mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-3 right-3 w-8 h-8 rounded-full text-heritage-brown hover:bg-parchment-200 flex items-center justify-center z-10"
          aria-label="Fermer le menu"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-parchment-300">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-white text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #C4922A 0%, #8B6214 100%)' }}
            >
              Y
            </div>
            <div className="min-w-0">
              <p className="font-display italic font-bold text-heritage-ink text-base leading-tight truncate">
                Famille Youm
              </p>
              <p className="text-[10px] text-heritage-brown italic">Archive familiale</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="px-3 pt-4 space-y-1 flex-shrink-0">
          <Link href="/" className={linkCls(isHome)}>
            <TreeDeciduous className="w-4 h-4 flex-shrink-0" />
            <span>Arbre généalogique</span>
          </Link>
          <Link href="/recits" className={linkCls(isRoyals)}>
            <ScrollText className="w-4 h-4 flex-shrink-0" />
            <span>Récits familiaux</span>
          </Link>
        </nav>

        {/* Royaumes */}
        <div className="px-3 pt-4">
          <p className="px-3 text-[10px] font-display italic text-parchment-500 uppercase tracking-wider mb-1">
            Royaumes
          </p>
          <div className="space-y-0.5">
            {KINGDOMS.map(k => (
              <Link
                key={k.href}
                href={k.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-lg font-display italic transition-colors text-[13px]',
                  pathname === k.href
                    ? 'bg-royal-gold-light text-royal-gold-dark font-bold'
                    : 'text-heritage-brown hover:bg-parchment-200 hover:text-heritage-ink',
                )}
              >
                <Crown className="w-3 h-3 flex-shrink-0 text-royal-gold-dark" />
                <span>{k.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Actions arbre */}
        {treeMode && (
          <div className="px-3 pt-5 space-y-1">
            <p className="px-3 text-[10px] font-display italic text-parchment-500 uppercase tracking-wider mb-1">
              Outils
            </p>

            {/* Recherche */}
            <div className="px-1 py-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-heritage-brown opacity-50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange?.(e.target.value)}
                placeholder="Rechercher..."
                className={cn(
                  'w-full pl-8 pr-7 py-1.5 text-xs font-display italic rounded-full outline-none transition-all',
                  'placeholder:text-heritage-brown placeholder:opacity-50',
                  searchQuery
                    ? 'bg-white border border-parchment-400 text-heritage-ink shadow-warm-sm'
                    : 'bg-parchment-200/50 border border-transparent text-heritage-ink hover:bg-parchment-200 focus:bg-white focus:border-parchment-400',
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange?.('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-heritage-brown hover:bg-parchment-300"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {searchMatches && searchMatches.length > 0 && (
                <div className="absolute top-full left-1 right-1 mt-1 bg-white border border-parchment-400 rounded-xl shadow-warm-xl max-h-72 overflow-y-auto z-50">
                  {searchMatches.slice(0, 12).map(p => (
                    <button
                      key={p.id}
                      onClick={() => onPickMatch?.(p)}
                      className="w-full text-left px-3 py-2 hover:bg-parchment-100 transition-colors flex items-center gap-2 text-xs border-b border-parchment-200 last:border-b-0"
                    >
                      {p.is_royal && <Crown className="w-3 h-3 text-royal-gold flex-shrink-0" />}
                      <span className="font-semibold text-heritage-ink truncate">
                        {p.first_name} {p.last_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {searchMatches && searchMatches.length === 0 && (
                <div className="absolute top-full left-1 right-1 mt-1 bg-white border border-parchment-400 rounded-xl shadow-warm-xl px-3 py-2 text-xs italic text-heritage-brown z-50">
                  Aucun résultat
                </div>
              )}
            </div>

            {isAdmin && onAddMember && (
              <button className={actionBtnCls()} onClick={onAddMember}>
                <UserPlus className="w-4 h-4 flex-shrink-0" />
                <span>Ajouter un parent</span>
              </button>
            )}

            {onDownloadPdf && (
              <button className={actionBtnCls()} onClick={onDownloadPdf} disabled={downloadingPdf}>
                {downloadingPdf
                  ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  : <ImageDown className="w-4 h-4 flex-shrink-0" />}
                <span>Télécharger</span>
              </button>
            )}

            {onToggleLegend && (
              <button className={actionBtnCls(legendOpen)} onClick={onToggleLegend}>
                <HelpCircle className="w-4 h-4 flex-shrink-0" />
                <span>Légende</span>
              </button>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Admin */}
        <div className="px-3 pb-3 border-t border-parchment-300 pt-3">
          {isAdmin ? (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-display italic text-sm text-royal-gold-dark bg-royal-gold-light hover:bg-royal-gold hover:text-white transition-colors"
            >
              <Crown className="w-4 h-4 flex-shrink-0" fill="currentColor" />
              <span className="flex-1 text-left">Admin</span>
              <LogOut className="w-3 h-3 opacity-70 flex-shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-display italic text-sm text-parchment-500 hover:text-heritage-brown hover:bg-parchment-200 transition-colors"
            >
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Signature */}
        <div className="px-5 pb-4">
          <p className="font-display italic text-[9px] text-heritage-brown/50 leading-tight">
            Réalisé par Mansour Youm,<br />2026
          </p>
        </div>
      </aside>

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
