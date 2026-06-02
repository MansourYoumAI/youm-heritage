'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, Camera, Mic, Loader2, Trash2, ScrollText, Pencil, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAudioRecorder, MAX_RECORDING_SECONDS } from '@/hooks/useAudioRecorder'
import type { Souvenir } from '@/lib/types'
import { parseYearFromDate, formatDuration, cn } from '@/lib/utils'
import { resizeImage } from '@/lib/imageResize'
import Lightbox from './Lightbox'

interface SouvenirsSectionProps {
  /** Cible : un person_id OU un kingdom_slug (exclusifs) */
  personId?: string
  kingdomSlug?: string
  /** Mode "page royaume" : inclut les récits attachés au royaume ET ceux des
   *  personnes listées (souverains du royaume). Active aussi les étoiles
   *  jaunes (favoris par royaume) et le tri "favoris d'abord, puis date asc". */
  kingdomContext?: {
    slug: string
    personIds: string[]
  }
}

// Tri : si on est sur une page royaume, mettre les favoris en premier,
// puis chronologique ascendant (du plus ancien au plus récent).
function sortForKingdom(souvenirs: Souvenir[], slug: string): Souvenir[] {
  return [...souvenirs].sort((a, b) => {
    const aFav = (a.kingdom_favorites || []).includes(slug)
    const bFav = (b.kingdom_favorites || []).includes(slug)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    const yA = parseYearFromDate(a.souvenir_date)
    const yB = parseYearFromDate(b.souvenir_date)
    if (yA !== null && yB !== null) return yA - yB
    if (yA !== null) return -1
    if (yB !== null) return 1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// Tri chronologique : du plus ancien (en haut) au plus récent (en bas)
function sortByDateAsc(souvenirs: Souvenir[]): Souvenir[] {
  return [...souvenirs].sort((a, b) => {
    const yA = parseYearFromDate(a.souvenir_date)
    const yB = parseYearFromDate(b.souvenir_date)
    if (yA !== null && yB !== null) return yA - yB
    if (yA !== null) return -1
    if (yB !== null) return 1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

export default function SouvenirsSection({ personId, kingdomSlug, kingdomContext }: SouvenirsSectionProps) {
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Souvenir | null>(null)

  // Stringifier les personIds pour la clé du useEffect (sinon re-render infini)
  const personIdsKey = kingdomContext?.personIds.join(',') || ''
  const contextSlug = kingdomContext?.slug

  useEffect(() => {
    loadSouvenirs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, kingdomSlug, contextSlug, personIdsKey])

  async function loadSouvenirs() {
    const supabase = createClient()
    let query = supabase.from('souvenirs').select('*')
    if (kingdomContext) {
      // Récits attachés au royaume OU à un des souverains listés
      const personIds = kingdomContext.personIds
      if (personIds.length > 0) {
        // Format Supabase pour OR + IN avec UUID (sans quotes autour des UUID)
        query = query.or(`kingdom_slug.eq.${kingdomContext.slug},person_id.in.(${personIds.join(',')})`)
      } else {
        query = query.eq('kingdom_slug', kingdomContext.slug)
      }
    } else if (personId) {
      query = query.eq('person_id', personId)
    } else if (kingdomSlug) {
      query = query.eq('kingdom_slug', kingdomSlug)
    } else {
      setSouvenirs([])
      setLoading(false)
      return
    }
    const { data } = await query
    const list = (data || []) as Souvenir[]
    if (kingdomContext) {
      setSouvenirs(sortForKingdom(list, kingdomContext.slug))
    } else {
      setSouvenirs(sortByDateAsc(list))
    }
    setLoading(false)
  }

  async function deleteSouvenir(id: string) {
    if (!confirm('Supprimer ce récit familial ?')) return
    const supabase = createClient()
    await supabase.from('souvenirs').delete().eq('id', id)
    setSouvenirs(prev => prev.filter(s => s.id !== id))
  }

  async function toggleFavorite(souvenir: Souvenir) {
    if (!kingdomContext) return
    const slug = kingdomContext.slug
    const current = souvenir.kingdom_favorites || []
    const isFav = current.includes(slug)
    const next = isFav ? current.filter(s => s !== slug) : [...current, slug]
    const supabase = createClient()
    const { error } = await supabase
      .from('souvenirs')
      .update({ kingdom_favorites: next })
      .eq('id', souvenir.id)
    if (error) return
    // Mise à jour locale + re-tri
    setSouvenirs(prev => sortForKingdom(
      prev.map(s => s.id === souvenir.id ? { ...s, kingdom_favorites: next } : s),
      slug,
    ))
  }

  const isFormOpen = showForm || editing !== null
  const isEditMode = editing !== null

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <ScrollText className="w-5 h-5 text-heritage-green" />
          <h2 className="text-xl font-display font-bold text-heritage-ink">
            Récits familiaux ({souvenirs.length})
          </h2>
        </div>
        <button
          onClick={() => (isFormOpen ? closeForm() : setShowForm(true))}
          className={isFormOpen ? 'btn-secondary text-sm py-2 px-3' : 'btn-primary text-sm py-2 px-3'}
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isFormOpen
            ? 'Annuler'
            : 'Ajouter un récit'}
        </button>
      </div>

      {isFormOpen && (
        <SouvenirForm
          personId={personId}
          // En mode royaume, les nouveaux récits sont attachés au royaume
          kingdomSlug={kingdomSlug || kingdomContext?.slug}
          existing={editing}
          onSaved={() => {
            closeForm()
            loadSouvenirs()
          }}
        />
      )}

      {!isFormOpen && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
            </div>
          ) : souvenirs.length === 0 ? (
            <div className="text-center py-8 text-heritage-brown font-medium">
              <p>Aucun récit familial pour l&apos;instant.</p>
              <p className="text-sm mt-1">Ajoutez-en un pour enrichir cette mémoire.</p>
            </div>
          ) : (
            <Timeline
              souvenirs={souvenirs}
              onDelete={deleteSouvenir}
              onEdit={setEditing}
              kingdomSlugForFavorite={kingdomContext?.slug}
              onToggleFavorite={kingdomContext ? toggleFavorite : undefined}
            />
          )}
        </>
      )}
    </div>
  )
}

function Timeline({
  souvenirs, onDelete, onEdit, kingdomSlugForFavorite, onToggleFavorite,
}: {
  souvenirs: Souvenir[]
  onDelete: (id: string) => void
  onEdit: (s: Souvenir) => void
  kingdomSlugForFavorite?: string
  onToggleFavorite?: (s: Souvenir) => void
}) {
  return (
    <div>
      {souvenirs.map((s, i) => {
        const isFav = !!kingdomSlugForFavorite
          && (s.kingdom_favorites || []).includes(kingdomSlugForFavorite)
        return (
          <div key={s.id}>
            <TimelineItem
              souvenir={s}
              onDelete={() => onDelete(s.id)}
              onEdit={() => onEdit(s)}
              isFavorite={isFav}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(s) : undefined}
            />
            {i < souvenirs.length - 1 && <DashedConnector />}
          </div>
        )
      })}
    </div>
  )
}

function DashedConnector() {
  return (
    <div className="flex justify-center py-1">
      <div
        className="h-12"
        style={{
          width: 5,
          background:
            'repeating-linear-gradient(to bottom, #5C3A24 0, #5C3A24 9px, transparent 9px, transparent 16px)',
          opacity: 0.5,
        }}
      />
    </div>
  )
}

function TimelineItem({
  souvenir, onDelete, onEdit, isFavorite, onToggleFavorite,
}: {
  souvenir: Souvenir
  onDelete: () => void
  onEdit: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const dateLabel = souvenir.souvenir_date || 'Sans date'

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-warm-sm p-5 transition-colors',
      isFavorite ? 'border-yellow-400 border-2 ring-2 ring-yellow-200' : 'border-parchment-400',
    )}>
      {/* En-tête : pastille + année + pastille */}
      <div className="flex items-center justify-center gap-2.5 mb-4">
        <div className="w-2 h-2 rounded-full bg-navy-500" />
        <span className="px-3.5 py-1 rounded-full bg-navy-50 border border-navy-200 text-xs font-bold text-navy-700 tracking-wider uppercase">
          {dateLabel}
        </span>
        <div className="w-2 h-2 rounded-full bg-navy-500" />
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display font-bold text-heritage-ink text-base">{souvenir.title}</h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Étoile favori — visible uniquement en mode page royaume */}
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={isFavorite ? 'Retirer des favoris du royaume' : 'Marquer comme favori du royaume'}
              className={cn(
                'p-1.5 rounded transition-colors',
                isFavorite
                  ? 'text-yellow-500 hover:bg-yellow-50'
                  : 'text-parchment-500 hover:text-yellow-500 hover:bg-yellow-50',
              )}
            >
              <Star
                className="w-4 h-4"
                fill={isFavorite ? 'currentColor' : 'none'}
                strokeWidth={2}
              />
            </button>
          )}
          <button onClick={onEdit} title="Modifier"
            className="p-1.5 rounded text-parchment-500 hover:text-heritage-green hover:bg-heritage-green/10">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={onDelete} title="Supprimer"
            className="p-1.5 rounded text-parchment-500 hover:text-terracotta-500 hover:bg-terracotta-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Illustration éventuelle — juste après le titre, avant le texte */}
      {souvenir.image_url && (
        <button
          onClick={() => setLightboxOpen(true)}
          className="mb-3 rounded-xl overflow-hidden block w-full cursor-zoom-in"
        >
          <Image
            src={souvenir.image_url}
            alt={souvenir.title}
            width={600}
            height={400}
            className="w-full max-h-64 object-cover"
          />
        </button>
      )}

      {souvenir.detail && (
        <p className="text-sm font-medium text-heritage-ink leading-relaxed whitespace-pre-wrap mb-3">
          {souvenir.detail}
        </p>
      )}

      {souvenir.audio_url && (
        <audio src={souvenir.audio_url} controls className="w-full mt-2" />
      )}

      {souvenir.source && (
        <p className="mt-3 pt-2 border-t border-parchment-200 text-[11px] italic text-heritage-brown opacity-70">
          Source : {souvenir.source}
        </p>
      )}

      {lightboxOpen && souvenir.image_url && (
        <Lightbox
          src={souvenir.image_url}
          alt={souvenir.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}

interface SouvenirFormProps {
  personId?: string
  kingdomSlug?: string
  /** Si fourni, le formulaire passe en mode édition (UPDATE) */
  existing?: Souvenir | null
  onSaved: () => void
}

function SouvenirForm({ personId, kingdomSlug, existing, onSaved }: SouvenirFormProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEdit = !!existing

  const [title, setTitle] = useState(existing?.title || '')
  const [souvenirDate, setSouvenirDate] = useState(existing?.souvenir_date || '')
  const [detail, setDetail] = useState(existing?.detail || '')
  const [source, setSource] = useState(existing?.source || '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(existing?.image_url || null)
  // Tracking de la photo existante (pour savoir si on doit la retirer en DB)
  const [keepExistingImage, setKeepExistingImage] = useState(!!existing?.image_url)
  const [showRecorder, setShowRecorder] = useState(false)
  const [keepExistingAudio, setKeepExistingAudio] = useState(!!existing?.audio_url)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const recorder = useAudioRecorder()

  function handleImageSelect(file: File) {
    setImageFile(file)
    setKeepExistingImage(false)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    setKeepExistingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeAudio() {
    recorder.resetRecording()
    setShowRecorder(false)
    setKeepExistingAudio(false)
  }

  async function uploadFile(bucket: string, file: Blob, ext: string): Promise<{ url: string; path: string } | null> {
    const filename = `souvenir-${Date.now()}.${ext}`
    const { error: err } = await supabase.storage
      .from(bucket)
      .upload(filename, file, { contentType: file.type })
    if (err) {
      setError(`Erreur upload : ${err.message}`)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filename)
    return { url: publicUrl, path: filename }
  }

  async function handleSave() {
    setError('')
    if (!title.trim()) { setError('Le titre est obligatoire.'); return }
    setSaving(true)

    // ── PHOTO : 3 cas
    // 1) nouveau fichier sélectionné → upload, remplace
    // 2) photo existante conservée (édition sans toucher à l'image) → on garde l'URL existante
    // 3) ni nouveau fichier ni conservée → champ NULL
    let imageUrl: string | null = isEdit && keepExistingImage ? (existing?.image_url ?? null) : null
    let imagePath: string | null = isEdit && keepExistingImage ? (existing?.image_storage_path ?? null) : null
    if (imageFile) {
      let upload: File
      try {
        upload = await resizeImage(imageFile, {
          maxDim: 1280, quality: 0.85,
          baseName: `souvenir-${title.trim() || Date.now().toString(36)}`,
        })
      } catch (e) {
        setError(`Erreur image : ${(e as Error).message}`)
        setSaving(false)
        return
      }
      const ext = upload.name.split('.').pop() || 'jpg'
      const result = await uploadFile('souvenirs', upload, ext)
      if (!result) { setSaving(false); return }
      imageUrl = result.url
      imagePath = result.path
    }

    // ── AUDIO : même logique
    let audioUrl: string | null = isEdit && keepExistingAudio ? (existing?.audio_url ?? null) : null
    let audioPath: string | null = isEdit && keepExistingAudio ? (existing?.audio_storage_path ?? null) : null
    let audioDuration: number | null = isEdit && keepExistingAudio ? (existing?.audio_duration_seconds ?? null) : null
    if (recorder.audioBlob) {
      const result = await uploadFile('souvenirs', recorder.audioBlob, 'webm')
      if (!result) { setSaving(false); return }
      audioUrl = result.url
      audioPath = result.path
      audioDuration = recorder.duration
    }

    const payload = {
      title: title.trim(),
      souvenir_date: souvenirDate.trim() || null,
      detail: detail.trim() || null,
      source: source.trim() || null,
      image_url: imageUrl,
      image_storage_path: imagePath,
      audio_url: audioUrl,
      audio_storage_path: audioPath,
      audio_duration_seconds: audioDuration,
    }

    let dbError: { message: string } | null = null
    if (isEdit && existing) {
      const { error: updateErr } = await supabase
        .from('souvenirs')
        .update(payload)
        .eq('id', existing.id)
      dbError = updateErr
    } else {
      const { error: insertErr } = await supabase.from('souvenirs').insert({
        ...payload,
        person_id: personId ?? null,
        kingdom_slug: kingdomSlug ?? null,
      })
      dbError = insertErr
    }

    if (dbError) { setError(dbError.message); setSaving(false); return }
    recorder.resetRecording()
    onSaved()
  }

  return (
    <div className="bg-parchment-100 rounded-2xl p-5 border border-parchment-400 space-y-4">
      <div>
        <label className="label">Titre du récit *</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex : Le mariage de Malick et Fatou Binetou" />
      </div>

      <div>
        <label className="label">Date du récit</label>
        <input className="input" value={souvenirDate} onChange={e => setSouvenirDate(e.target.value)}
          placeholder="1970, vers 1950, années 60..." />
        <p className="text-xs text-heritage-brown mt-1 font-medium">
          Une année suffit. Approximative possible (ex : vers 1980).
        </p>
      </div>

      <div>
        <label className="label">Détails</label>
        <textarea className="input min-h-28 resize-y" value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="Racontez ce récit familial, ce moment, cette anecdote..." />
      </div>

      {/* Photo */}
      <div className="flex flex-wrap items-center gap-3">
        {!imagePreview ? (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-sm py-2 px-4">
            <Camera className="w-4 h-4" /> Ajouter une photo
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <Image src={imagePreview} alt="Aperçu" width={60} height={60}
              className="w-16 h-16 object-cover rounded-lg border border-parchment-400" />
            <button type="button" onClick={removeImage}
              className="text-sm font-semibold text-terracotta-600 hover:underline">
              Retirer la photo
            </button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0])} />
      </div>

      {/* Audio */}
      <div>
        {/* En mode édition : afficher l'audio existant si conservé et qu'on n'enregistre pas un nouveau */}
        {isEdit && keepExistingAudio && existing?.audio_url && !recorder.audioUrl && !showRecorder && (
          <div className="space-y-2">
            <audio src={existing.audio_url} controls className="w-full" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowRecorder(true)}
                className="text-sm font-semibold text-heritage-green hover:underline">
                Remplacer par un nouveau vocal
              </button>
              <button type="button" onClick={removeAudio}
                className="text-sm font-semibold text-terracotta-600 hover:underline">
                Retirer le vocal
              </button>
            </div>
          </div>
        )}
        {!showRecorder && !recorder.audioUrl && !(isEdit && keepExistingAudio && existing?.audio_url) && (
          <div className="space-y-1">
            <button type="button" onClick={() => setShowRecorder(true)}
              className="btn-secondary text-sm py-2 px-4">
              <Mic className="w-4 h-4" /> Enregistrer un vocal
            </button>
            <p className="text-[11px] text-heritage-brown opacity-70 italic">
              Durée max : {formatDuration(MAX_RECORDING_SECONDS)} · arrêt automatique au-delà.
            </p>
          </div>
        )}

        {showRecorder && !recorder.audioUrl && (
          <div className="space-y-3">
            {recorder.state === 'idle' && (
              <div className="flex gap-2">
                <button type="button" onClick={recorder.startRecording}
                  className="btn-primary text-sm">
                  <Mic className="w-4 h-4" /> Commencer
                </button>
                <button type="button" onClick={() => setShowRecorder(false)}
                  className="btn-secondary text-sm">
                  Annuler
                </button>
              </div>
            )}
            {recorder.state === 'recording' && (
              <div className="flex items-center gap-3 p-3 bg-terracotta-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-terracotta-500 animate-pulse" />
                <span className="font-bold text-terracotta-700 tabular-nums">
                  {recorder.formattedDuration}
                </span>
                <span className="text-[10px] font-semibold text-heritage-brown opacity-70 tabular-nums">
                  / {formatDuration(MAX_RECORDING_SECONDS)}
                </span>
                <button type="button" onClick={recorder.stopRecording}
                  className="ml-auto btn-primary text-sm py-1.5 px-3">
                  Arrêter
                </button>
              </div>
            )}
            {recorder.error && (
              <p className="text-sm font-medium text-terracotta-700">{recorder.error}</p>
            )}
          </div>
        )}

        {recorder.audioUrl && (
          <div className="space-y-2">
            <audio src={recorder.audioUrl} controls className="w-full" />
            <button type="button" onClick={removeAudio}
              className="text-sm font-semibold text-terracotta-600 hover:underline">
              Retirer le vocal
            </button>
          </div>
        )}
      </div>

      {/* Source — discret, en bas du formulaire */}
      <div className="pt-2 border-t border-parchment-300">
        <label className="text-[11px] font-semibold text-heritage-brown uppercase tracking-wider opacity-70">
          Source (optionnel)
        </label>
        <input
          type="text"
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="Témoin, livre, archive, tradition orale..."
          className="mt-1 w-full px-3 py-1.5 text-sm rounded-lg border border-parchment-400 bg-white/60 text-heritage-ink placeholder:text-heritage-brown placeholder:opacity-50 focus:bg-white focus:border-heritage-green focus:outline-none"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-terracotta-700 bg-terracotta-50 p-3 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={handleSave}
          className="btn-primary flex-1" disabled={saving || !title.trim()}
          title={isEdit ? 'Enregistrer les modifications' : 'Enregistrer le récit'}>
          {saving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isEdit ? 'Enregistrer les modifications' : 'Enregistrer le récit'}
        </button>
      </div>
    </div>
  )
}
