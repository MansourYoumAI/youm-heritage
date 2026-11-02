import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

interface Params {
  params: { id: string }
}

export async function PUT(request: Request, { params }: Params) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const body = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('souvenirs')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('souvenirs').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
