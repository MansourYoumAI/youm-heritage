import KingdomPage from '@/components/KingdomPage'

export const metadata = {
  title: 'Baol — Famille Youm',
  description: 'Royaume du Baol : présentation et souverains de la famille Youm.',
}

export const dynamic = 'force-dynamic'

export default function BaolPage() {
  return <KingdomPage slug="baol" />
}
