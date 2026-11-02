import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('person_id')

    const supabase = createAdminClient()
    let query = supabase
      .from('relationships')
      .select('*, person1:persons!relationships_person1_id_fkey(*), person2:persons!relationships_person2_id_fkey(*)')

    if (personId) {
      query = query.or(`person1_id.eq.${personId},person2_id.eq.${personId}`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    // Support un seul objet OU un tableau
    if (Array.isArray(body)) {
      if (body.length === 0) return NextResponse.json([], { status: 201 })
      const { data, error } = await supabase
        .from('relationships')
        .insert(body)
        .select()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json(data, { status: 201 })
    }

    const { data, error } = await supabase
      .from('relationships')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('relationships').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
