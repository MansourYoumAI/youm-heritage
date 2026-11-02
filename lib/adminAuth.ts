import { cookies } from 'next/headers'
import crypto from 'crypto'

/**
 * Authentification admin côté serveur.
 *
 * Modèle : un cookie httpOnly `youm_admin` dont la valeur est signée en HMAC-SHA256
 * avec SESSION_SECRET. Impossible à forger côté client.
 */

const COOKIE_NAME = 'youm_admin'
const SESSION_DAYS = 30

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET env manquant ou trop court (>= 16 caractères).')
  }
  return s
}

function getAdminPassword(): string {
  const p = process.env.ADMIN_PASSWORD
  if (!p) throw new Error('ADMIN_PASSWORD env manquant.')
  return p
}

/** Signe une payload avec HMAC-SHA256. Retourne base64url(payload) + '.' + base64url(sig). */
function sign(payload: string): string {
  const secret = getSecret()
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  const p = Buffer.from(payload).toString('base64url')
  return `${p}.${sig}`
}

/** Vérifie la signature d'un token signé. Retourne la payload ou null. */
function verify(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [pB64, sig] = parts
  try {
    const payload = Buffer.from(pB64, 'base64url').toString()
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
    // comparaison à temps constant
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    return payload
  } catch {
    return null
  }
}

/** Vérifie si la requête courante est authentifiée en admin (via cookie signé). */
export function isAdminRequest(): boolean {
  try {
    const token = cookies().get(COOKIE_NAME)?.value
    if (!token) return false
    const payload = verify(token)
    if (!payload) return false
    const parts = payload.split(':')
    if (parts.length !== 2) return false
    const [role, expStr] = parts
    if (role !== 'admin') return false
    const exp = parseInt(expStr, 10)
    if (!Number.isFinite(exp)) return false
    if (Date.now() > exp) return false
    return true
  } catch {
    return false
  }
}

/** Pose un cookie signé admin (appelé après vérification du mot de passe). */
export function setAdminCookie() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const token = sign(`admin:${exp}`)
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

/** Supprime le cookie admin (déconnexion). */
export function clearAdminCookie() {
  cookies().delete(COOKIE_NAME)
}

/** Vérifie si un mot de passe fourni correspond à ADMIN_PASSWORD (comparaison constante). */
export function checkPassword(password: string): boolean {
  try {
    const expected = getAdminPassword()
    const a = Buffer.from(password)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Garde-fou pour une API route : retourne null si admin, sinon la Response 401
 * à retourner directement.
 */
export function requireAdmin(): Response | null {
  if (isAdminRequest()) return null
  return new Response(JSON.stringify({ error: 'Mode administrateur requis.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
