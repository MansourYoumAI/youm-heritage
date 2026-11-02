import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

export async function POST(request: Request) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const body = await request.json()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('souvenirs')
      .insert(body)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
