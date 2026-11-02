import { NextResponse } from 'next/server'
import { checkPassword, setAdminCookie } from '@/lib/adminAuth'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Mot de passe requis.' }, { status: 400 })
    }
    if (!checkPassword(password)) {
      // Petit delay anti brute-force (300ms)
      await new Promise(r => setTimeout(r, 300))
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
    }
    setAdminCookie()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
