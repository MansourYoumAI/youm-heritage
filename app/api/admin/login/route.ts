import { NextResponse } from 'next/server'
import { checkPassword, setAdminCookie } from '@/lib/adminAuth'

/**
 * Login admin.
 *
 * Anti-brute-force : on applique systématiquement un délai de ~700ms avant de
 * répondre, qu'on soit en succès ou en échec. Côté serverless Netlify on ne
 * peut pas partager d'état entre invocations, donc pas de vrai rate-limit par
 * IP ; mais 700ms × 3 600 tentatives / heure = max ~5 000 essais/h/instance,
 * ce qui rend inutilisable un dictionnaire face à un mot de passe fort.
 * Le délai constant masque aussi tout signal timing sur la validité.
 */
const MIN_RESPONSE_MS = 700

export async function POST(request: Request) {
  const start = Date.now()
  async function respond(status: number, body: object): Promise<NextResponse> {
    const elapsed = Date.now() - start
    const remaining = Math.max(0, MIN_RESPONSE_MS - elapsed)
    if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
    return NextResponse.json(body, { status })
  }
  try {
    const { password } = await request.json()
    if (typeof password !== 'string' || !password) {
      return respond(400, { error: 'Mot de passe requis.' })
    }
    if (!checkPassword(password)) {
      return respond(401, { error: 'Mot de passe incorrect.' })
    }
    setAdminCookie()
    return respond(200, { success: true })
  } catch {
    return respond(500, { error: 'Erreur serveur.' })
  }
}
