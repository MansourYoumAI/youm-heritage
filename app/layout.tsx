import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['700', '800', '900'],
})

export const metadata: Metadata = {
  title: {
    default: 'Famille Youm',
    template: '%s | Famille Youm',
  },
  description: 'Archive familiale Youm',
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#F9F6EF',
}

// L'app est entièrement protégée par middleware (cookie HMAC). Toutes les pages
// utilisent le Header qui consomme useSearchParams, donc on désactive globalement
// le pré-rendu statique (sinon Next.js exige un <Suspense> autour de chaque
// consommateur de useSearchParams).
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-parchment-100 font-body antialiased">
        {children}
      </body>
    </html>
  )
}
