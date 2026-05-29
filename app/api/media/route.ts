import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const personId = searchParams.get('person_id')

    const supabase = createAdminClient()
    let query = supabase
      .from('media')
      .select('*, person:persons(id, first_name, last_name)')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (personId) query = query.eq('person_id', personId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

    const supabase = createAdminClient()

    // Récupérer le storage_path pour supprimer du bucket
    const { data: media } = await supabase
      .from('media')
      .select('storage_path, person_id, is_profile_picture')
      .eq('id', id)
      .single()

    if (media?.storage_path) {
      await supabase.storage.from('profile-photos').remove([media.storage_path])
    }

    const { error } = await supabase.from('media').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
