import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function createSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET || 'youm-heritage-secret-2024'
  const password = process.env.SITE_PASSWORD || 'njaboot'

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const data = encoder.encode(password + ':authenticated')
  const signature = await crypto.subtle.sign('HMAC', key, data)
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    const correctPassword = process.env.SITE_PASSWORD || 'njaboot'

    if (!password || password !== correctPassword) {
      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    const token = await createSessionToken()

    const response = NextResponse.json({ success: true })
    response.cookies.set('youm_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('youm_session')
  return response
}
