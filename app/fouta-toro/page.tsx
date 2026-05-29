import KingdomPage from '@/components/KingdomPage'

export const metadata = {
  title: 'Fouta-Toro — Famille Youm',
  description: 'Royaume du Fouta-Toro : présentation et souverains de la famille Youm.',
}

export const dynamic = 'force-dynamic'

export default function FoutaToroPage() {
  return <KingdomPage slug="fouta-toro" />
}
