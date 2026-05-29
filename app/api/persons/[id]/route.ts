import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

interface Params {
  params: { id: string }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('persons')
      .select(`
        *,
        dynasty:dynasties(*),
        titles(*, dynasty:dynasties(*)),
        media(*),
        audio_memories(*)
      `)
      .eq('id', params.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Personne introuvable' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('persons')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Enregistrer dans l'historique
    await supabase.from('edit_history').insert({
      table_name: 'persons',
      record_id: params.id,
      action: 'update',
      changes: body,
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('persons').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabase.from('edit_history').insert({
      table_name: 'persons',
      record_id: params.id,
      action: 'delete',
      changes: {},
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
