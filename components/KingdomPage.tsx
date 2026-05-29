'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  Crown, MapPin, Calendar, ChevronRight, Sparkles,
  Pencil, X, Save, Loader2, Plus, Trash2, Upload, Download,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import SenegalMap from '@/components/SenegalMap'
import SouvenirsSection from '@/components/SouvenirsSection'
import type { Kingdom, KingdomSlug, Person } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { getInitials, parseYearFromDate, cn } from '@/lib/utils'

interface KingdomPageProps {
  slug: KingdomSlug
}

// Filtre des souverains : quels royal_title correspondent à ce royaume
const TITLE_MATCHERS: Record<KingdomSlug, RegExp> = {
  cayor: /cayor/i,
  baol: /baol/i,
  'fouta-toro': /fouta(-?toro)?/i,
}

const ACCENT: Record<KingdomSlug, { gradient: string; border: string; chip: string }> = {
  cayor: {
    gradient: 'from-terracotta-50 to-parchment-100',
    border: 'border-terracotta-200',
    chip: 'bg-terracotta-100 text-terracotta-700',
  },
  baol: {
    gradient: 'from-heritage-green/5 to-parchment-100',
    border: 'border-heritage-green/20',
    chip: 'bg-heritage-green/10 text-heritage-green',
  },
  'fouta-toro': {
    gradient: 'from-royal-gold-light to-parchment-100',
    border: 'border-royal-gold/30',
    chip: 'bg-royal-gold-light text-royal-gold-dark',
  },
}

export default function KingdomPage({ slug }: KingdomPageProps) {
  const accent = ACCENT[slug]
  const matchTitle = TITLE_MATCHERS[slug]

  const [kingdom, setKingdom] = useState<Kingdom | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  // ─── Mode édition
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Kingdom | null>(null)
  const [askPassword, setAskPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function load() {
    const supabase = createClient()
    const [{ data: k }, { data: ps }] = await Promise.all([
      supabase.from('kingdoms').select('*').eq('slug', slug).single(),
      supabase.from('persons').select('*').eq('is_royal', true).not('royal_title', 'is', null),
    ])
    setKingdom((k as Kingdom) || null)
    setPersons(ps || [])
    setLoading(false)
  }

  const rulers = useMemo(() => {
    const filtered = persons.filter(p => p.royal_title && matchTitle.test(p.royal_title))
    return filtered.sort((a, b) => {
      const ya = parseYearFromDate(a.birth_date) ?? parseYearFromDate(a.death_date)
      const yb = parseYearFromDate(b.birth_date) ?? parseYearFromDate(b.death_date)
      if (ya == null && yb == null) return a.first_name.localeCompare(b.first_name)
      if (ya == null) return 1
      if (yb == null) return -1
      return ya - yb
    })
  }, [persons, matchTitle])

  function startEdit() {
    setPassword('')
    setPwError('')
    setAskPassword(true)
  }

  function confirmPassword() {
    if (!password) {
      setPwError('Mot de passe requis.')
      return
    }
    // Le mot de passe n'est validé qu'au moment de l'enregistrement (côté serveur).
    if (!kingdom) return
    // Si on était déjà en édition (réouverture après 401), on garde le draft
    if (!draft) setDraft(JSON.parse(JSON.stringify(kingdom)))
    setAskPassword(false)
    setEditing(true)
    setSaveError('')
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(null)
    setSaveError('')
  }

  async function saveEdit() {
    if (!draft) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/kingdoms/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, kingdom: draft }),
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          // Mauvais mot de passe : on garde le draft, on rouvre le modal
          setPassword('')
          setPwError('Mot de passe incorrect.')
          setAskPassword(true)
        } else {
          setSaveError(json.error || 'Erreur inconnue')
        }
        setSaving(false)
        return
      }
      setKingdom(draft)
      setEditing(false)
      setDraft(null)
      setPassword('')
    } catch (err) {
      setSaveError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Téléchargement PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  async function downloadPdf() {
    if (!kingdom) return
    setDownloadingPdf(true)
    try {
      const { downloadKingdomPdf } = await import('@/lib/generateKingdomPdf')
      await downloadKingdomPdf(kingdom, rulers)
    } catch (err) {
      console.error('Erreur PDF royaume :', err)
      alert("Erreur lors de la génération du PDF.")
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ─── Upload carte custom
  const mapFileRef = useRef<HTMLInputElement>(null)
  const [uploadingMap, setUploadingMap] = useState(false)

  async function uploadMap(file: File) {
    if (!draft) return
    setUploadingMap(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${slug}-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('kingdom-maps')
      .upload(filename, file, { contentType: file.type, upsert: true })
    if (error) {
      setSaveError(`Upload carte : ${error.message}`)
      setUploadingMap(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('kingdom-maps').getPublicUrl(filename)
    setDraft({ ...draft, map_image_url: publicUrl })
    setUploadingMap(false)
  }

  function removeMap() {
    if (!draft) return
    setDraft({ ...draft, map_image_url: null })
  }

  // ─── Helpers pour modifier les arrays
  function updateKeyFact(i: number, field: 'label' | 'value', value: string) {
    if (!draft) return
    const next = [...draft.key_facts]
    next[i] = { ...next[i], [field]: value }
    setDraft({ ...draft, key_facts: next })
  }
  function addKeyFact() {
    if (!draft) return
    setDraft({ ...draft, key_facts: [...draft.key_facts, { label: '', value: '' }] })
  }
  function removeKeyFact(i: number) {
    if (!draft) return
    setDraft({ ...draft, key_facts: draft.key_facts.filter((_, idx) => idx !== i) })
  }
  function updateDetail(i: number, field: 'title' | 'body', value: string) {
    if (!draft) return
    const next = [...draft.details]
    next[i] = { ...next[i], [field]: value }
    setDraft({ ...draft, details: next })
  }
  function addDetail() {
    if (!draft) return
    setDraft({ ...draft, details: [...draft.details, { title: '', body: '' }] })
  }
  function removeDetail(i: number) {
    if (!draft) return
    setDraft({ ...draft, details: draft.details.filter((_, idx) => idx !== i) })
  }
  function moveDetail(i: number, dir: -1 | 1) {
    if (!draft) return
    const next = [...draft.details]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setDraft({ ...draft, details: next })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment-100">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 rounded-full border-4 border-parchment-400 border-t-terracotta-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (!kingdom) {
    return (
      <div className="min-h-screen bg-parchment-100">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="font-display text-3xl font-bold text-heritage-ink mb-3">
            Royaume introuvable
          </h1>
          <p className="text-heritage-brown font-medium">
            La fiche de ce royaume n&apos;a pas encore été initialisée. Lance la migration 009
            depuis Supabase pour la créer.
          </p>
        </div>
      </div>
    )
  }

  const k = editing && draft ? draft : kingdom

  return (
    <div className="min-h-screen bg-parchment-100 bg-grain">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">

        {/* ─── Barre d'édition flottante en haut */}
        <div className="flex items-center justify-end gap-2">
          {!editing ? (
            <>
              <button
                onClick={downloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-parchment-400 text-sm font-semibold text-heritage-ink hover:bg-parchment-200 shadow-warm-sm disabled:opacity-50"
                title="Télécharger cette page en PDF"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Télécharger PDF
              </button>
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-parchment-400 text-sm font-semibold text-heritage-ink hover:bg-parchment-200 shadow-warm-sm"
              >
                <Pencil className="w-4 h-4" />
                Modifier
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-parchment-400 text-sm font-semibold text-heritage-brown hover:bg-parchment-200 shadow-warm-sm disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-heritage-green text-white text-sm font-semibold hover:bg-heritage-green-light shadow-warm-md disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          )}
        </div>

        {saveError && (
          <div className="rounded-xl bg-terracotta-50 border border-terracotta-200 px-4 py-3 text-sm font-semibold text-terracotta-700">
            {saveError}
          </div>
        )}

        {/* ─── HERO ──────────────────────────────────────────── */}
        <section
          className={cn(
            'rounded-3xl border-2 px-6 sm:px-10 py-8 sm:py-10 bg-gradient-to-br shadow-warm-md',
            accent.gradient,
            accent.border,
          )}
        >
          <div className="flex items-start gap-4 sm:gap-6">
            <EditableEmblem
              value={k.emblem}
              editing={editing}
              onChange={v => draft && setDraft({ ...draft, emblem: v })}
            />
            <div className="flex-1 min-w-0 flex flex-col items-start gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/70 text-[10px] font-bold uppercase tracking-wide text-heritage-brown w-fit">
                <Crown className="w-3 h-3" />
                Royaume ancestral
              </span>
              <h1 className="w-full">
                <EditableText
                  value={k.name}
                  editing={editing}
                  onChange={v => draft && setDraft({ ...draft, name: v })}
                  className="block font-display font-bold text-3xl sm:text-5xl text-heritage-ink leading-tight"
                  inputClassName="font-display font-bold text-3xl sm:text-5xl text-heritage-ink"
                />
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-heritage-brown">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <EditableText
                    value={k.period}
                    editing={editing}
                    onChange={v => draft && setDraft({ ...draft, period: v })}
                    className=""
                  />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <EditableText
                    value={k.location}
                    editing={editing}
                    onChange={v => draft && setDraft({ ...draft, location: v })}
                    className=""
                  />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── L'essentiel ──────────────────────────────────── */}
        <section className="card bg-white border-2 border-royal-gold/40 p-6 sm:p-8 shadow-warm-md">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-royal-gold-light flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-royal-gold-dark" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-royal-gold-dark mb-1.5">
                L&apos;essentiel
              </p>
              <EditableText
                value={k.tldr}
                editing={editing}
                onChange={v => draft && setDraft({ ...draft, tldr: v })}
                multiline
                className="font-display text-lg sm:text-xl text-heritage-ink leading-snug font-semibold"
              />
            </div>
          </div>
        </section>

        {/* ─── Carte + Repères clés ──────────────────────────── */}
        <section className="grid lg:grid-cols-5 gap-5">
          <div className={cn('lg:col-span-3 card p-4 sm:p-5 bg-parchment-50 border-2', accent.border)}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-base text-heritage-ink flex items-center gap-2">
                <MapPin className="w-4 h-4 text-royal-gold-dark" />
                Localisation
              </h2>
              {editing && (
                <div className="flex items-center gap-1">
                  <input
                    ref={mapFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && uploadMap(e.target.files[0])}
                  />
                  <button
                    onClick={() => mapFileRef.current?.click()}
                    disabled={uploadingMap}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-heritage-brown hover:text-heritage-ink px-2 py-1 rounded-md hover:bg-parchment-200 disabled:opacity-50"
                  >
                    {uploadingMap ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {k.map_image_url ? 'Remplacer la carte' : 'Importer une carte'}
                  </button>
                  {k.map_image_url && (
                    <button
                      onClick={removeMap}
                      className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-700 px-2 py-1 rounded-md hover:bg-terracotta-50"
                    >
                      <Trash2 className="w-3 h-3 inline" /> Retirer
                    </button>
                  )}
                </div>
              )}
            </div>
            {k.map_image_url ? (
              <div className="rounded-xl overflow-hidden border border-parchment-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={k.map_image_url}
                  alt={`Carte du ${k.name}`}
                  className="w-full h-auto block"
                />
              </div>
            ) : (
              <SenegalMap highlight={slug} />
            )}
            {editing && !k.map_image_url && (
              <p className="text-[11px] text-heritage-brown italic mt-2 text-center">
                Carte par défaut (SVG stylisé). Importe une image pour la remplacer.
              </p>
            )}
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-base text-heritage-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-royal-gold-dark" />
                Repères clés
              </h2>
              {editing && (
                <button
                  onClick={addKeyFact}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-heritage-green hover:bg-heritage-green/10 px-2 py-1 rounded-md"
                >
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              {k.key_facts.map((f, i) => (
                <div key={i} className="card p-3.5 bg-white border border-parchment-300 relative group">
                  {editing && (
                    <button
                      onClick={() => removeKeyFact(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-white/80 text-terracotta-600 opacity-0 group-hover:opacity-100 hover:bg-terracotta-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <EditableText
                    value={f.label}
                    editing={editing}
                    onChange={v => updateKeyFact(i, 'label', v)}
                    className="text-[10px] font-bold uppercase tracking-wider text-heritage-brown opacity-80"
                  />
                  <div className="mt-0.5">
                    <EditableText
                      value={f.value}
                      editing={editing}
                      onChange={v => updateKeyFact(i, 'value', v)}
                      className="font-display font-bold text-base text-heritage-ink leading-tight"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Histoire détaillée — INLINE pleine largeur ─────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-l-4 border-royal-gold pl-3">
            <h2 className="font-display font-bold text-xl text-heritage-ink">
              Histoire détaillée
            </h2>
            {editing && (
              <button
                onClick={addDetail}
                className="inline-flex items-center gap-1 text-sm font-semibold text-heritage-green hover:bg-heritage-green/10 px-3 py-1.5 rounded-md"
              >
                <Plus className="w-4 h-4" /> Ajouter une section
              </button>
            )}
          </div>
          {/* Stack vertical pleine largeur (plus de grille 2x2) */}
          <div className="space-y-4">
            {k.details.map((d, i) => (
              <article
                key={i}
                className="card p-5 sm:p-6 bg-white border border-parchment-300 hover:shadow-warm-md transition-shadow relative group"
              >
                {editing && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => moveDetail(i, -1)}
                      disabled={i === 0}
                      className="p-1.5 rounded bg-white border border-parchment-400 text-heritage-brown hover:bg-parchment-200 disabled:opacity-30"
                      title="Monter"
                    >▲</button>
                    <button
                      onClick={() => moveDetail(i, 1)}
                      disabled={i === k.details.length - 1}
                      className="p-1.5 rounded bg-white border border-parchment-400 text-heritage-brown hover:bg-parchment-200 disabled:opacity-30"
                      title="Descendre"
                    >▼</button>
                    <button
                      onClick={() => removeDetail(i)}
                      className="p-1.5 rounded bg-white border border-terracotta-200 text-terracotta-600 hover:bg-terracotta-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <h3 className="font-display font-bold text-lg text-heritage-ink mb-2 flex items-baseline gap-2 pr-24">
                  <span className="text-[11px] font-mono text-royal-gold-dark">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <EditableText
                    value={d.title}
                    editing={editing}
                    onChange={v => updateDetail(i, 'title', v)}
                    className="font-display font-bold text-lg text-heritage-ink"
                  />
                </h3>
                <EditableText
                  value={d.body}
                  editing={editing}
                  onChange={v => updateDetail(i, 'body', v)}
                  multiline
                  className="text-base text-heritage-brown leading-relaxed font-medium"
                />
              </article>
            ))}
          </div>
        </section>

        {/* ─── Souverains de la famille ──────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4 border-l-4 border-royal-gold pl-3">
            <h2 className="font-display font-bold text-xl text-heritage-ink">
              Souverains de la famille Youm
            </h2>
            <span className="text-xs font-semibold text-heritage-brown">
              {`${rulers.length} ${rulers.length > 1 ? 'membres' : 'membre'}`}
            </span>
          </div>

          {rulers.length === 0 ? (
            <div className="card p-6 text-center text-heritage-brown font-medium">
              Aucun souverain de la famille n&apos;a encore été enregistré dans ce royaume.
            </div>
          ) : (
            <ol className="space-y-3">
              {rulers.map((p, i) => {
                const year = parseYearFromDate(p.birth_date) ?? parseYearFromDate(p.death_date)
                return (
                  <li key={p.id}>
                    <Link
                      href={`/profil/${p.id}`}
                      className={cn('group card p-4 flex items-center gap-4 bg-white border-2 hover:shadow-warm-lg hover:-translate-y-0.5 transition-all', accent.border)}
                    >
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-royal-gold-light text-royal-gold-dark font-display font-bold text-sm flex items-center justify-center">
                        {i + 1}
                      </div>
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-royal-gold flex items-center justify-center bg-royal-gold-light">
                        {p.profile_picture_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.profile_picture_url} alt={`${p.first_name} ${p.last_name}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-royal-gold-dark">{getInitials(p)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-heritage-ink text-base leading-tight truncate">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className={cn('inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1', accent.chip)}>
                          {p.royal_title}
                        </p>
                        {p.historical_notes && (
                          <p className="text-xs text-heritage-brown font-medium mt-1.5 line-clamp-2">
                            {p.historical_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2 text-heritage-brown">
                        {year != null && (
                          <span className="hidden sm:inline-block text-sm font-mono font-semibold">{year}</span>
                        )}
                        <ChevronRight className="w-5 h-5 group-hover:text-heritage-ink transition-colors" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ol>
          )}

          <p className="text-[11px] text-heritage-brown italic text-center pt-2">
            La liste se met à jour automatiquement à partir du champ « titre royal » de
            chaque fiche.
          </p>
        </section>

        {/* ─── Souvenirs du royaume ──────────────────────────── */}
        <section className="space-y-3">
          <h2 className="font-display font-bold text-xl text-heritage-ink border-l-4 border-royal-gold pl-3">
            Souvenirs du royaume
          </h2>
          <p className="text-sm text-heritage-brown font-medium">
            Enregistre une anecdote, un récit ou un vocal sur ce royaume — il s&apos;ajoutera ici.
          </p>
          <SouvenirsSection kingdomSlug={slug} />
        </section>
      </main>

      {/* ─── Modal mot de passe ────────────────────────────── */}
      {askPassword && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAskPassword(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-warm-xl border-2 border-parchment-400 p-6 max-w-sm w-full">
            <h3 className="font-display font-bold text-lg text-heritage-ink mb-2 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-heritage-green" />
              Modifier la page
            </h3>
            <p className="text-sm text-heritage-brown font-medium mb-4">
              Saisis le mot de passe d&apos;édition pour passer en mode modification.
            </p>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmPassword()}
              placeholder="Mot de passe"
              className="w-full px-4 py-2.5 rounded-xl border-2 border-parchment-400 focus:border-heritage-green focus:outline-none font-semibold text-heritage-ink"
            />
            {pwError && <p className="text-xs text-terracotta-700 font-semibold mt-2">{pwError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAskPassword(false)} className="btn-secondary flex-1">
                Annuler
              </button>
              <button onClick={confirmPassword} className="btn-primary flex-1">
                Continuer
              </button>
            </div>
            <p className="text-[10px] text-heritage-brown opacity-70 italic mt-3 text-center">
              Le mot de passe sera vérifié au moment de l&apos;enregistrement.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Sous-composants d'édition inline
// ──────────────────────────────────────────────────────────

function EditableText({
  value, editing, onChange, multiline, className, inputClassName,
}: {
  value: string
  editing: boolean
  onChange: (v: string) => void
  multiline?: boolean
  className?: string
  inputClassName?: string
}) {
  if (!editing) {
    return multiline ? (
      <p className={cn('whitespace-pre-wrap', className)}>{value}</p>
    ) : (
      <span className={className}>{value}</span>
    )
  }
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full px-3 py-2 rounded-lg border-2 border-heritage-green/30 bg-parchment-50 focus:border-heritage-green focus:outline-none resize-y min-h-[5rem]',
          inputClassName || className,
        )}
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'w-full px-2 py-1 rounded-md border-2 border-heritage-green/30 bg-parchment-50 focus:border-heritage-green focus:outline-none',
        inputClassName || className,
      )}
    />
  )
}

function EditableEmblem({
  value, editing, onChange,
}: {
  value: string
  editing: boolean
  onChange: (v: string) => void
}) {
  if (!editing) {
    return (
      <div className="text-6xl sm:text-7xl flex-shrink-0 leading-none select-none" aria-hidden>
        {value}
      </div>
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={4}
      className="w-20 sm:w-24 h-20 sm:h-24 text-5xl sm:text-6xl text-center bg-parchment-50 border-2 border-heritage-green/30 rounded-2xl focus:border-heritage-green focus:outline-none flex-shrink-0"
      title="Emoji du royaume"
    />
  )
}
