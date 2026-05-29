import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const EDIT_PASSWORD = process.env.DELETE_PASSWORD || 'mansour'

const VALID_SLUGS = new Set(['cayor', 'baol', 'fouta-toro'])

// Validation minimale du payload
function sanitizeKeyFacts(value: unknown): { label: string; value: string }[] | null {
  if (!Array.isArray(value)) return null
  const out: { label: string; value: string }[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const label = String((item as Record<string, unknown>).label ?? '').trim()
    const val = String((item as Record<string, unknown>).value ?? '').trim()
    if (!label || !val) return null
    out.push({ label, value: val })
  }
  return out
}

function sanitizeDetails(value: unknown): { title: string; body: string }[] | null {
  if (!Array.isArray(value)) return null
  const out: { title: string; body: string }[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const title = String((item as Record<string, unknown>).title ?? '').trim()
    const body = String((item as Record<string, unknown>).body ?? '').trim()
    if (!title || !body) return null
    out.push({ title, body })
  }
  return out
}

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const { slug } = params
    if (!VALID_SLUGS.has(slug)) {
      return NextResponse.json({ error: 'Royaume inconnu' }, { status: 404 })
    }

    const body = await request.json()
    const { password, kingdom } = body || {}

    if (!password || password !== EDIT_PASSWORD) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }
    if (!kingdom || typeof kingdom !== 'object') {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const name = String(kingdom.name ?? '').trim()
    const period = String(kingdom.period ?? '').trim()
    const location = String(kingdom.location ?? '').trim()
    const emblem = String(kingdom.emblem ?? '').trim() || '👑'
    const tldr = String(kingdom.tldr ?? '').trim()
    const keyFacts = sanitizeKeyFacts(kingdom.key_facts)
    const details = sanitizeDetails(kingdom.details)
    const mapImageUrl =
      typeof kingdom.map_image_url === 'string' || kingdom.map_image_url === null
        ? (kingdom.map_image_url as string | null)
        : undefined

    if (!name || !period || !location || !tldr) {
      return NextResponse.json(
        { error: 'Nom, période, localisation et résumé sont obligatoires.' },
        { status: 400 },
      )
    }
    if (!keyFacts || !details) {
      return NextResponse.json(
        { error: 'Repères clés et détails mal formés.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const update: Record<string, unknown> = {
      name,
      period,
      location,
      emblem,
      tldr,
      key_facts: keyFacts,
      details,
      updated_at: new Date().toISOString(),
    }
    if (mapImageUrl !== undefined) update.map_image_url = mapImageUrl

    const { error } = await supabase
      .from('kingdoms')
      .update(update)
      .eq('slug', slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
