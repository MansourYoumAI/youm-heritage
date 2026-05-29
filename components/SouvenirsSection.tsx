'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Plus, X, Camera, Mic, Loader2, Trash2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAudioRecorder, MAX_RECORDING_SECONDS } from '@/hooks/useAudioRecorder'
import type { Souvenir } from '@/lib/types'
import { parseYearFromDate, formatDuration } from '@/lib/utils'
import Lightbox from './Lightbox'

interface SouvenirsSectionProps {
  /** Cible : un person_id OU un kingdom_slug (exclusifs) */
  personId?: string
  kingdomSlug?: string
}

// Tri décroissant : plus récent en haut
function sortByDateDesc(souvenirs: Souvenir[]): Souvenir[] {
  return [...souvenirs].sort((a, b) => {
    const yA = parseYearFromDate(a.souvenir_date)
    const yB = parseYearFromDate(b.souvenir_date)
    if (yA !== null && yB !== null) return yB - yA
    if (yA !== null) return -1
    if (yB !== null) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default function SouvenirsSection({ personId, kingdomSlug }: SouvenirsSectionProps) {
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadSouvenirs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, kingdomSlug])

  async function loadSouvenirs() {
    const supabase = createClient()
    let query = supabase.from('souvenirs').select('*')
    if (personId) query = query.eq('person_id', personId)
    else if (kingdomSlug) query = query.eq('kingdom_slug', kingdomSlug)
    else {
      setSouvenirs([])
      setLoading(false)
      return
    }
    const { data } = await query
    setSouvenirs(sortByDateDesc(data || []))
    setLoading(false)
  }

  async function deleteSouvenir(id: string) {
    if (!confirm('Supprimer ce souvenir ?')) return
    const supabase = createClient()
    await supabase.from('souvenirs').delete().eq('id', id)
    setSouvenirs(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-terracotta-500" />
          <h2 className="text-xl font-display font-bold text-heritage-ink">
            Souvenirs ({souvenirs.length})
          </h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-secondary text-sm py-2 px-3' : 'btn-primary text-sm py-2 px-3'}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuler' : 'Ajouter un souvenir'}
        </button>
      </div>

      {showForm && (
        <SouvenirForm
          personId={personId}
          kingdomSlug={kingdomSlug}
          onSaved={() => {
            setShowForm(false)
            loadSouvenirs()
          }}
        />
      )}

      {!showForm && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 skeleton rounded-xl" />)}
            </div>
          ) : souvenirs.length === 0 ? (
            <div className="text-center py-8 text-heritage-brown font-medium">
              <p>Aucun souvenir pour l&apos;instant.</p>
              <p className="text-sm mt-1">Ajoutez-en un pour enrichir cette mémoire.</p>
            </div>
          ) : (
            <Timeline souvenirs={souvenirs} onDelete={deleteSouvenir} />
          )}
        </>
      )}
    </div>
  )
}

function Timeline({ souvenirs, onDelete }: { souvenirs: Souvenir[]; onDelete: (id: string) => void }) {
  return (
    <div>
      {souvenirs.map((s, i) => (
        <div key={s.id}>
          <TimelineItem souvenir={s} onDelete={() => onDelete(s.id)} />
          {i < souvenirs.length - 1 && <DashedConnector />}
        </div>
      ))}
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

function TimelineItem({ souvenir, onDelete }: { souvenir: Souvenir; onDelete: () => void }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const dateLabel = souvenir.souvenir_date || 'Sans date'

  return (
    <div className="bg-white rounded-2xl border border-parchment-400 shadow-warm-sm p-5">
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
        <button onClick={onDelete}
          className="p-1.5 rounded text-parchment-500 hover:text-terracotta-500 hover:bg-terracotta-50 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {souvenir.detail && (
        <p className="text-sm font-medium text-heritage-ink leading-relaxed whitespace-pre-wrap mb-3">
          {souvenir.detail}
        </p>
      )}

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

      {souvenir.audio_url && (
        <audio src={souvenir.audio_url} controls className="w-full mt-2" />
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
  onSaved: () => void
}

function SouvenirForm({ personId, kingdomSlug, onSaved }: SouvenirFormProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [souvenirDate, setSouvenirDate] = useState('')
  const [detail, setDetail] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showRecorder, setShowRecorder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const recorder = useAudioRecorder()

  function handleImageSelect(file: File) {
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeAudio() {
    recorder.resetRecording()
    setShowRecorder(false)
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

    let imageUrl: string | null = null
    let imagePath: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop() || 'jpg'
      const result = await uploadFile('souvenirs', imageFile, ext)
      if (!result) { setSaving(false); return }
      imageUrl = result.url
      imagePath = result.path
    }

    let audioUrl: string | null = null
    let audioPath: string | null = null
    let audioDuration: number | null = null
    if (recorder.audioBlob) {
      const result = await uploadFile('souvenirs', recorder.audioBlob, 'webm')
      if (!result) { setSaving(false); return }
      audioUrl = result.url
      audioPath = result.path
      audioDuration = recorder.duration
    }

    const { error: insertErr } = await supabase.from('souvenirs').insert({
      person_id: personId ?? null,
      kingdom_slug: kingdomSlug ?? null,
      title: title.trim(),
      souvenir_date: souvenirDate.trim() || null,
      detail: detail.trim() || null,
      image_url: imageUrl,
      image_storage_path: imagePath,
      audio_url: audioUrl,
      audio_storage_path: audioPath,
      audio_duration_seconds: audioDuration,
    })

    if (insertErr) { setError(insertErr.message); setSaving(false); return }
    recorder.resetRecording()
    onSaved()
  }

  return (
    <div className="bg-parchment-100 rounded-2xl p-5 border border-parchment-400 space-y-4">
      <div>
        <label className="label">Titre du souvenir *</label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Ex : Le mariage de Malick et Fatou Binetou" />
      </div>

      <div>
        <label className="label">Date du souvenir</label>
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
          placeholder="Racontez ce souvenir, ce moment, cette anecdote..." />
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
        {!showRecorder && !recorder.audioUrl && (
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

      {error && (
        <p className="text-sm font-medium text-terracotta-700 bg-terracotta-50 p-3 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={handleSave}
          className="btn-primary flex-1" disabled={saving || !title.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer le souvenir'}
        </button>
      </div>
    </div>
  )
}
