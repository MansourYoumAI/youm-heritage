'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Crown, Loader2, Check, AlertTriangle, Camera, Trash2, Link2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { BIRTH_PLACES, type Person } from '@/lib/types'

interface PersonFormProps {
  person?: Person
  mode: 'add' | 'edit'
  onSaved?: (personId?: string) => void
}

export default function PersonForm({ person, mode, onSaved }: PersonFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const supabase = createClient()

  // Lien préfixé depuis l'arbre
  const parentOfId = searchParams.get('parent_of')   // nouvelle personne sera PARENT de cet id
  const childOfId = searchParams.get('child_of')     // nouvelle personne sera ENFANT de cet id
  const spouseOfId = searchParams.get('spouse_of')   // nouvelle personne sera CONJOINT(E) de cet id
  const [linkedPerson, setLinkedPerson] = useState<Person | null>(null)
  // Mode rapide : si on vient d'un bouton + de l'arbre, on n'affiche que
  // prénom, nom et genre. Tout le reste se complète après via "Modifier".
  const isQuickMode = mode === 'add' && (!!parentOfId || !!childOfId || !!spouseOfId)

  const [allPersons, setAllPersons] = useState<Person[]>([])
  const [currentRelations, setCurrentRelations] = useState<{
    parents: Person[]
    spouses: Person[]
  }>({ parents: [], spouses: [] })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState(person?.first_name || '')
  const [lastName, setLastName] = useState(person?.last_name || 'Youm')
  const [nickname, setNickname] = useState(person?.nickname || '')
  const [maidenName, setMaidenName] = useState(person?.maiden_name || '')
  const [gender, setGender] = useState<'homme' | 'femme'>(
    person?.gender === 'femme' ? 'femme' : 'homme'
  )
  const [descendantIds, setDescendantIds] = useState<Set<string>>(new Set())
  const [birthDate, setBirthDate] = useState(person?.birth_date || '')
  const [deathDate, setDeathDate] = useState(person?.death_date || '')
  const [birthPlace, setBirthPlace] = useState(person?.birth_place || '')
  const [birthPlaceOther, setBirthPlaceOther] = useState(person?.birth_place_other || '')
  const [biography, setBiography] = useState(person?.biography || '')
  const [isRoyal, setIsRoyal] = useState(person?.is_royal || false)
  const [royalTitle, setRoyalTitle] = useState(person?.royal_title || '')
  const [profilePictureUrl, setProfilePictureUrl] = useState(person?.profile_picture_url || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [parent1Id, setParent1Id] = useState('')
  const [parent2Id, setParent2Id] = useState('')
  const [spouseIds, setSpouseIds] = useState<string[]>([''])

  // Préfixage des dropdowns selon le contexte URL (en mode add)
  useEffect(() => {
    if (mode !== 'add') return
    if (childOfId) {
      setParent1Id(childOfId)
      // Pré-remplir parent 2 avec le/la conjoint(e) du parent 1 si connu(e)
      ;(async () => {
        const { data } = await supabase
          .from('relationships')
          .select('person1_id, person2_id, type')
          .or(`person1_id.eq.${childOfId},person2_id.eq.${childOfId}`)
          .in('type', ['mariage', 'union'])
          .limit(1)
          .maybeSingle()
        if (data) {
          const partner = data.person1_id === childOfId ? data.person2_id : data.person1_id
          setParent2Id(partner)
        }
      })().catch(() => {})
    }
    if (spouseOfId) setSpouseIds([spouseOfId])
  }, [mode, childOfId, spouseOfId])

  // Charger les descendants (à exclure des choix de parents pour éviter les cycles)
  useEffect(() => {
    if (mode !== 'edit' || !person?.id) return
    ;(async () => {
      const { data: rels } = await supabase
        .from('relationships')
        .select('person1_id, person2_id')
        .eq('type', 'parent-enfant')
      const childMap = new Map<string, string[]>()
      for (const r of rels || []) {
        const arr = childMap.get(r.person1_id) || []
        arr.push(r.person2_id)
        childMap.set(r.person1_id, arr)
      }
      const descs = new Set<string>([person.id])
      const queue = [person.id]
      while (queue.length > 0) {
        const id = queue.shift()!
        for (const c of childMap.get(id) || []) {
          if (!descs.has(c)) { descs.add(c); queue.push(c) }
        }
      }
      setDescendantIds(descs)
    })().catch(() => {})
  }, [mode, person?.id])

  // Charger les infos de la personne liée pour affichage
  useEffect(() => {
    const linkedId = parentOfId || childOfId || spouseOfId
    if (!linkedId) return
    supabase.from('persons').select('*').eq('id', linkedId).single()
      .then(({ data }) => setLinkedPerson(data))
  }, [parentOfId, childOfId, spouseOfId])

  useEffect(() => {
    async function load() {
      const { data: ps } = await supabase
        .from('persons')
        .select('id, first_name, last_name, gender')
        .order('last_name')
      setAllPersons((ps || []).filter(p => p.id !== person?.id) as Person[])

      if (person?.id) {
        const { data: rels } = await supabase
          .from('relationships')
          .select('*, person1:persons!relationships_person1_id_fkey(*), person2:persons!relationships_person2_id_fkey(*)')
          .or(`person1_id.eq.${person.id},person2_id.eq.${person.id}`)

        const parents: Person[] = []
        const spouses: Person[] = []
        for (const rel of rels || []) {
          if (rel.type === 'parent-enfant' && rel.person2_id === person.id && rel.person1) {
            parents.push(rel.person1 as Person)
          } else if ((rel.type === 'mariage' || rel.type === 'union')) {
            if (rel.person1_id === person.id && rel.person2) spouses.push(rel.person2 as Person)
            else if (rel.person2_id === person.id && rel.person1) spouses.push(rel.person1 as Person)
          }
        }
        setCurrentRelations({ parents, spouses })
      }
    }
    load()
  }, [person?.id])

  async function handlePhotoSelect(file: File) {
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = e => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const filename = `photo-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('profile-photos')
      .upload(filename, file, { contentType: file.type })
    if (uploadErr) {
      setError(`Erreur upload photo : ${uploadErr.message}`)
      return null
    }
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(filename)
    return publicUrl
  }

  async function deleteRelation(relatedId: string, type: 'parent' | 'spouse') {
    if (!person?.id) return
    if (!confirm('Supprimer ce lien familial ?')) return

    let query
    if (type === 'parent') {
      query = supabase.from('relationships').delete()
        .eq('type', 'parent-enfant')
        .eq('person1_id', relatedId)
        .eq('person2_id', person.id)
    } else {
      query = supabase.from('relationships').delete()
        .in('type', ['mariage', 'union'])
        .or(`and(person1_id.eq.${person.id},person2_id.eq.${relatedId}),and(person1_id.eq.${relatedId},person2_id.eq.${person.id})`)
    }

    await query
    setCurrentRelations(prev => ({
      parents: type === 'parent' ? prev.parents.filter(p => p.id !== relatedId) : prev.parents,
      spouses: type === 'spouse' ? prev.spouses.filter(p => p.id !== relatedId) : prev.spouses,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Garde-fou : empêche un double-clic de créer deux personnes identiques
    if (submittingRef.current) return

    if (!firstName.trim() || !lastName.trim()) {
      setError('Le prénom et le nom sont obligatoires.')
      return
    }
    if (birthPlace === 'Autre' && !birthPlaceOther.trim()) {
      setError('Précisez le lieu de naissance.')
      return
    }

    submittingRef.current = true
    setSaving(true)

    let finalPictureUrl: string | null = profilePictureUrl || null
    if (photoFile) {
      const url = await uploadPhoto(photoFile)
      if (!url) { submittingRef.current = false; setSaving(false); return }
      finalPictureUrl = url
    }

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      nickname: nickname.trim() || null,
      maiden_name: maidenName.trim() || null,
      gender,
      birth_date: birthDate.trim() || null,
      death_date: deathDate.trim() || null,
      birth_place: birthPlace || null,
      birth_place_other: birthPlace === 'Autre' ? (birthPlaceOther.trim() || null) : null,
      biography: biography.trim() || null,
      is_royal: isRoyal,
      royal_title: isRoyal ? (royalTitle.trim() || null) : null,
      profile_picture_url: finalPictureUrl,
    }

    let personId: string | undefined = person?.id

    if (mode === 'edit' && personId) {
      const { error: updateErr } = await supabase
        .from('persons')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', personId)
      if (updateErr) { setError(updateErr.message); submittingRef.current = false; setSaving(false); return }
    } else {
      const { data: created, error: insertErr } = await supabase
        .from('persons')
        .insert(payload)
        .select()
        .single()
      if (insertErr) { setError(insertErr.message); submittingRef.current = false; setSaving(false); return }
      personId = created.id
    }

    if (personId) {
      const relsToInsert: { person1_id: string; person2_id: string; type: string }[] = []
      if (parent1Id) relsToInsert.push({ person1_id: parent1Id, person2_id: personId, type: 'parent-enfant' })
      if (parent2Id && parent2Id !== parent1Id) relsToInsert.push({ person1_id: parent2Id, person2_id: personId, type: 'parent-enfant' })

      // Polygamie : on enregistre plusieurs conjoint(e)s si renseigné(e)s
      const uniqueSpouses = Array.from(new Set(spouseIds.filter(Boolean)))
      for (const sid of uniqueSpouses) {
        relsToInsert.push({ person1_id: personId, person2_id: sid, type: 'mariage' })
      }

      // Cas spécial : la nouvelle personne est PARENT d'une personne existante
      if (mode === 'add' && parentOfId) {
        relsToInsert.push({ person1_id: personId, person2_id: parentOfId, type: 'parent-enfant' })
      }

      if (relsToInsert.length > 0) {
        await supabase.from('relationships').insert(relsToInsert)
      }
    }

    // Notifier les autres composants pour qu'ils rechargent
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('youm-data-updated'))
    }

    if (onSaved) {
      onSaved(personId)
      return
    }

    if (mode === 'edit') {
      router.push(`/profil/${personId}`)
    } else {
      router.push('/')
    }
    router.refresh()
  }

  const linkLabel = parentOfId
    ? `Cette personne sera le parent de ${linkedPerson?.first_name || ''} ${linkedPerson?.last_name || ''}`
    : childOfId
    ? `Cette personne sera l'enfant de ${linkedPerson?.first_name || ''} ${linkedPerson?.last_name || ''}`
    : spouseOfId
    ? `Cette personne sera le/la conjoint(e) de ${linkedPerson?.first_name || ''} ${linkedPerson?.last_name || ''}`
    : null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {linkLabel && (
        <div className="bg-heritage-green/10 border-2 border-heritage-green/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Link2 className="w-5 h-5 text-heritage-green flex-shrink-0" />
          <p className="font-semibold text-heritage-green text-sm">{linkLabel}</p>
        </div>
      )}

      {!isQuickMode && (
        <section className="card p-5 space-y-5">
          <h2 className="text-lg font-display font-bold text-heritage-ink">Photo</h2>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-parchment-200 border-2 border-parchment-400 flex items-center justify-center flex-shrink-0">
              {photoPreview || profilePictureUrl ? (
                <Image
                  src={photoPreview || profilePictureUrl}
                  alt="Aperçu"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-7 h-7 text-parchment-500" />
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm py-2 px-4">
                Choisir une photo
              </button>
              {(photoPreview || profilePictureUrl) && (
                <button type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); setProfilePictureUrl('') }}
                  className="text-sm font-semibold text-terracotta-500 hover:underline text-left">
                  Retirer la photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
            />
          </div>
        </section>
      )}

      <section className="card p-5 space-y-5">
        <h2 className="text-lg font-display font-bold text-heritage-ink">Identité</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prénom *</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Nom *</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} required />
          </div>
        </div>

        {!isQuickMode && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Surnom</label>
              <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>
            <div>
              <label className="label">Nom de jeune fille</label>
              <input className="input" value={maidenName} onChange={e => setMaidenName(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className="label">Genre</label>
          <div className="grid grid-cols-2 gap-2">
            {(['homme', 'femme'] as const).map(g => (
              <button type="button" key={g} onClick={() => setGender(g)}
                className={`py-3 rounded-lg text-sm font-semibold border-2 transition-all ${
                  gender === g
                    ? 'bg-terracotta-500 text-white border-terracotta-500'
                    : 'bg-white text-heritage-brown border-parchment-400 hover:border-terracotta-400'
                }`}
                style={{ minHeight: 48 }}>
                {g === 'homme' ? 'Homme' : 'Femme'}
              </button>
            ))}
          </div>
        </div>

      </section>

      {!isQuickMode && (
        <section className="card p-5 space-y-5">
          <h2 className="text-lg font-display font-bold text-heritage-ink">Biographie</h2>

          <div>
            <label className="label">Année de naissance</label>
            <input className="input" value={birthDate} onChange={e => setBirthDate(e.target.value)}
              placeholder="1970, vers 1840, années 60..." />
            <p className="text-xs text-heritage-brown mt-1 font-medium">
              Une année suffit. Approximative possible (ex : vers 1840).
            </p>
          </div>

          <div>
            <label className="label">Lieu de naissance</label>
            <select className="input" value={birthPlace} onChange={e => setBirthPlace(e.target.value)}>
              <option value="">Sélectionner</option>
              {BIRTH_PLACES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
              <option value="Autre">Autre (préciser)</option>
            </select>
            {birthPlace === 'Autre' && (
              <input className="input mt-2" value={birthPlaceOther}
                onChange={e => setBirthPlaceOther(e.target.value)}
                placeholder="Ville, Pays" />
            )}
          </div>

          <div>
            <label className="label">Année de décès</label>
            <input className="input" value={deathDate} onChange={e => setDeathDate(e.target.value)}
              placeholder="Laisser vide si la personne est en vie" />
            <p className="text-xs text-heritage-brown mt-1 font-medium">
              Renseigne uniquement si la personne est décédée.
            </p>
          </div>

          <div>
            <label className="label">Histoire de cette personne</label>
            <textarea className="input min-h-32 resize-y" value={biography}
              onChange={e => setBiography(e.target.value)}
              placeholder="Quelques mots sur cette personne, son parcours, son rôle dans la famille..." />
          </div>
        </section>
      )}

      {!isQuickMode && (
      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-display font-bold text-heritage-ink">Famille</h2>

        {currentRelations.parents.length > 0 && (
          <div>
            <p className="label">Parents actuels</p>
            <div className="space-y-2">
              {currentRelations.parents.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-parchment-100 rounded-lg">
                  <span className="font-semibold text-heritage-ink text-sm">{p.first_name} {p.last_name}</span>
                  <button type="button" onClick={() => deleteRelation(p.id, 'parent')}
                    className="p-1.5 rounded text-terracotta-500 hover:bg-terracotta-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentRelations.spouses.length > 0 && (
          <div>
            <p className="label">Conjoint(e) actuel(le)</p>
            <div className="space-y-2">
              {currentRelations.spouses.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-parchment-100 rounded-lg">
                  <span className="font-semibold text-heritage-ink text-sm">{p.first_name} {p.last_name}</span>
                  <button type="button" onClick={() => deleteRelation(p.id, 'spouse')}
                    className="p-1.5 rounded text-terracotta-500 hover:bg-terracotta-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Ajouter parent 1</label>
          <select className="input" value={parent1Id} onChange={e => setParent1Id(e.target.value)}>
            <option value="">Aucun</option>
            {allPersons.filter(p => !descendantIds.has(p.id)).map(p => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Ajouter parent 2</label>
          <select className="input" value={parent2Id} onChange={e => setParent2Id(e.target.value)}>
            <option value="">Aucun</option>
            {allPersons.filter(p => p.id !== parent1Id && !descendantIds.has(p.id)).map(p => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Ajouter conjoint(e)</label>
          <div className="space-y-2">
            {spouseIds.map((sid, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className="input flex-1"
                  value={sid}
                  onChange={e => {
                    const next = [...spouseIds]
                    next[i] = e.target.value
                    setSpouseIds(next)
                  }}
                >
                  <option value="">Aucun(e)</option>
                  {allPersons
                    .filter(p => !spouseIds.includes(p.id) || p.id === sid)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                </select>
                {spouseIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSpouseIds(spouseIds.filter((_, j) => j !== i))}
                    className="p-2 rounded-lg text-terracotta-600 hover:bg-terracotta-50 transition-colors"
                    title="Retirer ce(tte) conjoint(e)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSpouseIds([...spouseIds, ''])}
              className="text-sm font-semibold text-heritage-green hover:underline"
            >
              + Ajouter un(e) autre conjoint(e)
            </button>
          </div>
          <p className="text-xs text-heritage-brown mt-2 font-medium">
            Plusieurs unions possibles (cas de polygamie).
          </p>
        </div>
      </section>
      )}

      {!isQuickMode && (
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setIsRoyal(!isRoyal)}
              className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${isRoyal ? 'bg-royal-gold' : 'bg-parchment-400'}`}>
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isRoyal ? 'left-8' : 'left-1'}`} />
            </button>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-royal-gold" />
              <span className="font-semibold text-heritage-ink text-sm">
                Lignée royale
              </span>
            </div>
          </div>

          {isRoyal && (
            <div>
              <label className="block text-sm font-semibold text-heritage-ink mb-1">
                Titre royal
              </label>
              <input
                type="text"
                value={royalTitle}
                onChange={e => setRoyalTitle(e.target.value)}
                placeholder="Ex : Damel du Cayor, Teigne du Baol, Linguère du Djolof…"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-parchment-400 bg-white focus:border-royal-gold focus:outline-none text-heritage-ink text-sm"
              />
              <p className="text-xs text-parchment-500 mt-1">
                S'affiche en doré sous le prénom sur la carte.
              </p>
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="bg-terracotta-50 border border-terracotta-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-terracotta-500 flex-shrink-0" />
          <p className="text-terracotta-800 font-semibold">{error}</p>
        </div>
      )}

      <div className="flex gap-3 sticky bottom-4 z-10">
        <button type="button" onClick={() => router.back()}
          className="btn-secondary flex-1">
          Annuler
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement</>
            : <><Check className="w-5 h-5" /> {mode === 'add' ? 'Ajouter' : 'Enregistrer'}</>
          }
        </button>
      </div>
    </form>
  )
}
