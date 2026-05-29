import KingdomPage from '@/components/KingdomPage'

export const metadata = {
  title: 'Cayor — Famille Youm',
  description: 'Royaume du Cayor : présentation et souverains de la famille Youm.',
}

// Page contient des composants client utilisant useSearchParams (Header) :
// on désactive la génération statique pour éviter l'erreur de Suspense boundary.
export const dynamic = 'force-dynamic'

export default function CayorPage() {
  return <KingdomPage slug="cayor" />
}
