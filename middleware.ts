import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/connexion', '/api/auth', '/_next', '/favicon.ico', '/public']

async function verifySession(token: string): Promise<boolean> {
  const secret = process.env.SESSION_SECRET || 'youm-heritage-secret-2024'
  const password = process.env.SITE_PASSWORD || 'njaboot'

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const tokenBytes = Uint8Array.from(atob(token), c => c.charCodeAt(0))
    const dataBytes = encoder.encode(password + ':authenticated')

    return await crypto.subtle.verify('HMAC', key, tokenBytes, dataBytes)
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les routes publiques
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('youm_session')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/connexion', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isValid = await verifySession(sessionToken)

  if (!isValid) {
    const loginUrl = new URL('/connexion', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('youm_session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)'],
}
