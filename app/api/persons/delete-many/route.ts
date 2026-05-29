import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const DELETE_PASSWORD = process.env.DELETE_PASSWORD || 'mansour'

export async function POST(request: Request) {
  try {
    const { ids, password } = await request.json()

    if (!password || password !== DELETE_PASSWORD) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucun identifiant à supprimer' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Nettoyage défensif (au cas où le CASCADE ne ferait pas tout)
    await supabase.from('souvenirs').delete().in('person_id', ids)
    await supabase.from('media').delete().in('person_id', ids)
    await supabase.from('titles').delete().in('person_id', ids)
    // Pour les relationships, il faut faire l'OR sur les deux colonnes
    for (const id of ids) {
      await supabase
        .from('relationships')
        .delete()
        .or(`person1_id.eq.${id},person2_id.eq.${id}`)
    }

    const { error } = await supabase.from('persons').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, count: ids.length })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
