import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/adminAuth'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const guard = requireAdmin()
  if (guard) return guard
  try {
    const supabase = createAdminClient()
    const personId = params.id

    // Supprimer explicitement (au cas où le CASCADE ne serait pas en place) :
    // 1. Souvenirs
    await supabase.from('souvenirs').delete().eq('person_id', personId)
    // 2. Médias (photos)
    await supabase.from('media').delete().eq('person_id', personId)
    // 3. Toutes les relations (parent-enfant, mariage, union, fratrie) où la personne apparait
    await supabase
      .from('relationships')
      .delete()
      .or(`person1_id.eq.${personId},person2_id.eq.${personId}`)
    // 4. Titres royaux
    await supabase.from('titles').delete().eq('person_id', personId)

    // 5. Enfin la personne
    const { error } = await supabase.from('persons').delete().eq('id', personId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
