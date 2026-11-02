import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

/**
 * Supprime les relationships correspondant à un filtre.
 * Body : { type: string | string[], person1_id?: string, person2_id?: string,
 *          bidirectional?: boolean } (bidirectional : matche aussi l'inverse p1↔p2)
 */
export async function POST(request: Request) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const { type, person1_id, person2_id, bidirectional } = await request.json()
    const supabase = createAdminClient()

    let query = supabase.from('relationships').delete()

    if (Array.isArray(type)) query = query.in('type', type)
    else if (typeof type === 'string') query = query.eq('type', type)

    if (bidirectional && person1_id && person2_id) {
      query = query.or(
        `and(person1_id.eq.${person1_id},person2_id.eq.${person2_id}),and(person1_id.eq.${person2_id},person2_id.eq.${person1_id})`,
      )
    } else {
      if (person1_id) query = query.eq('person1_id', person1_id)
      if (person2_id) query = query.eq('person2_id', person2_id)
    }

    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
