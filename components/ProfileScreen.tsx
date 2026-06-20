'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase, uploadDataUrl, uploadFile, deleteFile } from '@/lib/supabase'
import { Card, Hero, MemoryRow, Profile } from '@/lib/types'
import AdminLock from './AdminLock'
import ImageEditor from './ImageEditor'
import VideoPlayer from './VideoPlayer'

interface Props {
  profile:         Profile
  isEditor:        boolean
  onBack:          () => void
  onEditorChange:  (v: boolean) => void
  showToast:       (msg: string) => void
}

type ModalState =
  | { type: 'none' }
  | { type: 'lock' }
  | { type: 'view'; card: Card }
  | { type: 'editHero' }
  | { type: 'addRow' }
  | { type: 'editRow'; row: MemoryRow }
  | { type: 'addCard'; rowId: string }
  | { type: 'editCard'; rowId: string; card: Card }

function cardBackground(card: Card): string | undefined {
  if (card.media_type === 'video') return card.thumbnail_url ?? card.media_url ?? undefined
  return card.media_url ?? undefined
}

async function captureVideoThumbnail(file: File): Promise<string | null> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadeddata = () => { video.currentTime = 0.5 }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 360
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.78))
    }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
  })
}

export default function ProfileScreen({
  profile, isEditor, onBack, onEditorChange, showToast,
}: Props) {
  const [hero, setHero]           = useState<Hero | null>(null)
  const [rows, setRows]           = useState<MemoryRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [scrolled, setScrolled]   = useState(false)
  const [modal, setModal]         = useState<ModalState>({ type: 'none' })
  const closeModal                = () => setModal({ type: 'none' })

  const loadData = useCallback(async () => {
    const [{ data: heroData }, { data: rowsData }] = await Promise.all([
      supabase.from('heroes').select('*').eq('profile_id', profile.id).maybeSingle(),
      supabase.from('memory_rows').select('*, cards(*)').eq('profile_id', profile.id).order('position'),
    ])
    setHero(heroData as Hero | null)
    const sorted = (rowsData ?? []).map(row => ({
      ...row,
      cards: [...(row.cards ?? [])].sort((a, b) => a.position - b.position),
    })) as MemoryRow[]
    setRows(sorted)
    setLoading(false)
  }, [profile.id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const allCards = rows.flatMap(r => r.cards ?? [])
  const featured = allCards.find(c => c.media_url)

  const openFeatured = () => {
    if (featured) setModal({ type: 'view', card: featured })
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div>Loading {profile.name}&apos;s memories…</div>
      </div>
    )
  }

  return (
    <>
      <header className={`df-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="df-logo" onClick={onBack}>DADFLIX</div>
        <div className="header-right">
          <button
            className="icon-btn"
            title={isEditor ? 'Exit edit mode' : 'Admin login'}
            onClick={() => {
              if (isEditor) { onEditorChange(false); showToast('Edit mode off') }
              else setModal({ type: 'lock' })
            }}
          >
            {isEditor ? '🔓' : '🔒'}
          </button>
          <div
            className="switch-avatar"
            style={profile.avatar_url
              ? { backgroundImage: `url("${profile.avatar_url}")` }
              : { background: profile.color }}
            onClick={onBack}
            title="Switch profile"
          >
            {!profile.avatar_url && profile.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {hero?.background_url ? (
        <section
          className="df-hero"
          style={{ backgroundImage: `url("${hero.background_url}")` }}
        >
          <div className="hero-content">
            <div className="hero-tag">{hero.tag || 'A DADFLIX ORIGINAL'}</div>
            <h1 className="hero-title">{hero.title}</h1>
            {hero.description && <p className="hero-desc">{hero.description}</p>}
            <div className="hero-buttons">
              {featured && (
                <button className="btn btn-play" onClick={openFeatured}>▶ Play</button>
              )}
              {isEditor && (
                <button className="btn btn-ghost" onClick={() => setModal({ type: 'editHero' })}>
                  ✎ Edit banner
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="empty-hero">
          <div className="big-icon">🎬</div>
          <h2 style={{ margin: '0 0 12px', fontWeight: 800 }}>
            {isEditor ? 'Set up the hero banner' : `${profile.name}'s collection`}
          </h2>
          <p>
            {isEditor
              ? 'Add a featured photo and title — like the big Netflix banner at the top.'
              : 'Memories are being curated. Check back soon!'}
          </p>
          {isEditor && (
            <button
              className="btn btn-red"
              style={{ marginTop: 24 }}
              onClick={() => setModal({ type: 'editHero' })}
            >
              Create hero banner
            </button>
          )}
        </section>
      )}

      <div className="rows-wrap">
        {rows.map(row => (
          <section key={row.id} className="row">
            <div className="row-head">
              <h2 className="row-title">{row.title}</h2>
              {isEditor && (
                <button
                  className="row-edit-btn"
                  onClick={() => setModal({ type: 'editRow', row })}
                >
                  Edit row
                </button>
              )}
            </div>
            <div className="track">
              {(row.cards ?? []).map(card => (
                <div
                  key={card.id}
                  className="card"
                  style={cardBackground(card)
                    ? { backgroundImage: `url("${cardBackground(card)}")` }
                    : undefined}
                  onClick={() => setModal({ type: 'view', card })}
                >
                  {!cardBackground(card) && <div className="card-empty">🖼</div>}
                  {card.media_type === 'video' && <div className="card-video-badge">VIDEO</div>}
                  <div className="card-overlay">
                    <div className="card-label">{card.title}</div>
                  </div>
                </div>
              ))}
              {isEditor && (
                <div
                  className="add-card"
                  onClick={() => setModal({ type: 'addCard', rowId: row.id })}
                >
                  <div className="plus">+</div>
                  Add memory
                </div>
              )}
            </div>
          </section>
        ))}

        {isEditor && (
          <div className="add-row-section">
            <button className="add-row-btn" onClick={() => setModal({ type: 'addRow' })}>
              + Add a new row
            </button>
          </div>
        )}

        {!isEditor && rows.length === 0 && (
          <div className="empty-hero" style={{ minHeight: '30vh' }}>
            <div className="big-icon">📽</div>
            <p>No memory rows yet.</p>
          </div>
        )}
      </div>

      <footer className="credits">
        <div className="big">Made with love for Father&apos;s Day</div>
        <div className="sub">{profile.name}&apos;s Dadflix</div>
        <div className="tiny">DADFLIX · Family memories, streaming now</div>
      </footer>

      {modal.type === 'lock' && (
        <AdminLock
          onUnlock={() => { onEditorChange(true); closeModal(); showToast('Edit mode on ✓') }}
          onClose={closeModal}
          showToast={showToast}
        />
      )}

      {modal.type === 'view' && (
        <MemoryDetailModal
          card={modal.card}
          isEditor={isEditor}
          onClose={closeModal}
          onEdit={() => {
            const row = rows.find(r => r.cards?.some(c => c.id === modal.card.id))
            if (row) setModal({ type: 'editCard', rowId: row.id, card: modal.card })
          }}
        />
      )}

      {modal.type === 'editHero' && (
        <HeroFormModal
          hero={hero}
          onSave={async (data) => {
            const payload = { profile_id: profile.id, ...data }
            const { error } = hero
              ? await supabase.from('heroes').update(payload).eq('id', hero.id)
              : await supabase.from('heroes').insert(payload)
            if (error) { showToast('Failed to save banner'); return }
            await loadData()
            closeModal()
            showToast('Hero banner saved ✓')
          }}
          onClose={closeModal}
        />
      )}

      {modal.type === 'addRow' && (
        <RowFormModal
          title="Add a row"
          onSave={async (title) => {
            const { error } = await supabase.from('memory_rows').insert({
              profile_id: profile.id,
              title,
              position: rows.length,
            })
            if (error) { showToast('Failed to add row'); return }
            await loadData()
            closeModal()
            showToast('Row added ✓')
          }}
          onClose={closeModal}
        />
      )}

      {modal.type === 'editRow' && (
        <RowFormModal
          title="Edit row"
          initialTitle={modal.row.title}
          onSave={async (title) => {
            const { error } = await supabase
              .from('memory_rows')
              .update({ title })
              .eq('id', modal.row.id)
            if (error) { showToast('Failed to update row'); return }
            await loadData()
            closeModal()
            showToast('Row updated ✓')
          }}
          onDelete={async () => {
            if (!confirm(`Delete "${modal.row.title}" and all its memories?`)) return
            await supabase.from('memory_rows').delete().eq('id', modal.row.id)
            await loadData()
            closeModal()
            showToast('Row deleted')
          }}
          onClose={closeModal}
        />
      )}

      {(modal.type === 'addCard' || modal.type === 'editCard') && (
        <CardFormModal
          rowId={modal.rowId}
          card={modal.type === 'editCard' ? modal.card : undefined}
          onSave={async () => {
            await loadData()
            closeModal()
            showToast(modal.type === 'editCard' ? 'Memory updated ✓' : 'Memory added ✓')
          }}
          onClose={closeModal}
          showToast={showToast}
        />
      )}
    </>
  )
}

/* ── Memory detail modal ────────────────────────────────────── */
function MemoryDetailModal({ card, isEditor, onClose, onEdit }: {
  card: Card
  isEditor: boolean
  onClose: () => void
  onEdit: () => void
}) {
  const bg = cardBackground(card)

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-media">
          {card.media_type === 'video' && card.media_url ? (
            <VideoPlayer src={card.media_url} title={card.title} />
          ) : bg ? (
            <div style={{ width: '100%', height: '100%', backgroundImage: `url("${bg}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <div className="card-empty" style={{ height: '100%' }}>🖼</div>
          )}
        </div>
        <div className="modal-body">
          <h2 className="modal-title">{card.title}</h2>
          <div className="modal-meta">
            {card.year && <span>{card.year}</span>}
            <span className="modal-match">{card.match_text || '100% Match'}</span>
          </div>
          {card.message && <p className="modal-text">{card.message}</p>}
          {isEditor && (
            <div className="modal-actions">
              <button className="form-btn primary" onClick={onEdit}>Edit memory</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Hero form modal ────────────────────────────────────────── */
function HeroFormModal({ hero, onSave, onClose }: {
  hero: Hero | null
  onSave: (data: { tag: string; title: string; description: string; background_url: string | null }) => Promise<void>
  onClose: () => void
}) {
  const [tag, setTag]               = useState(hero?.tag ?? 'A DADFLIX ORIGINAL')
  const [title, setTitle]           = useState(hero?.title ?? '')
  const [description, setDesc]      = useState(hero?.description ?? '')
  const [bgData, setBgData]         = useState<string | null>(hero?.background_url ?? null)
  const [editing, setEditing]       = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    let background_url: string | null = bgData
    if (bgData?.startsWith('data:')) {
      background_url = await uploadDataUrl(bgData, 'heroes')
    }
    await onSave({
      tag: tag.trim(),
      title: title.trim(),
      description: description.trim(),
      background_url,
    })
    setSaving(false)
  }

  if (editing) return (
    <ImageEditor
      srcDataUrl={editing}
      onApply={d => { setBgData(d); setEditing(null) }}
      onCancel={() => setEditing(null)}
    />
  )

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="form-wrap">
          <h2>{hero ? 'Edit hero banner' : 'Create hero banner'}</h2>
          <p className="form-sub">The big featured banner at the top of the profile.</p>

          <div className="field">
            <label>Tag line</label>
            <input type="text" value={tag} onChange={e => setTag(e.target.value)} maxLength={40} />
          </div>
          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dad's Greatest Hits" maxLength={80} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="A short blurb about this collection" />
          </div>
          <div className="field">
            <label>Background photo</label>
            {bgData
              ? <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                  <div className="upload-preview" style={{ backgroundImage: `url("${bgData}")` }} />
                  <button className="form-btn secondary" onClick={() => setBgData(null)}>Remove</button>
                  <button className="form-btn secondary" onClick={() => setEditing(bgData.startsWith('data:') ? bgData : bgData!)}>Edit</button>
                </div>
              : <div className="upload-zone">
                  <div className="upload-icon">🖼</div>
                  Click to upload a banner photo
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => setEditing(reader.result as string)
                    reader.readAsDataURL(file)
                  }} />
                </div>
            }
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button className="form-btn secondary" onClick={onClose}>Cancel</button>
            <button className="form-btn primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save banner'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Row form modal ─────────────────────────────────────────── */
function RowFormModal({ title, initialTitle = '', onSave, onDelete, onClose }: {
  title: string
  initialTitle?: string
  onSave: (title: string) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const [rowTitle, setRowTitle] = useState(initialTitle)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSave = async () => {
    if (!rowTitle.trim()) { setError('Row title is required.'); return }
    setSaving(true)
    await onSave(rowTitle.trim())
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="form-wrap">
          <h2>{title}</h2>
          <div className="field">
            <label>Row title</label>
            <input type="text" value={rowTitle} onChange={e => setRowTitle(e.target.value)} placeholder="e.g. Summer Adventures" maxLength={60} />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            {onDelete && (
              <button className="form-btn danger" onClick={onDelete}>Delete row</button>
            )}
            <button className="form-btn secondary" onClick={onClose}>Cancel</button>
            <button className="form-btn primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Card form modal ────────────────────────────────────────── */
function CardFormModal({ rowId, card, onSave, onClose, showToast }: {
  rowId: string
  card?: Card
  onSave: () => Promise<void>
  onClose: () => void
  showToast: (msg: string) => void
}) {
  const [title, setTitle]           = useState(card?.title ?? '')
  const [year, setYear]             = useState(card?.year ?? '')
  const [matchText, setMatchText]   = useState(card?.match_text ?? '100% Match')
  const [message, setMessage]       = useState(card?.message ?? '')
  const [mediaType, setMediaType]   = useState<'image' | 'video'>(card?.media_type ?? 'image')
  const [mediaUrl, setMediaUrl]     = useState<string | null>(card?.media_url ?? null)
  const [thumbUrl, setThumbUrl]     = useState<string | null>(card?.thumbnail_url ?? null)
  const [editing, setEditing]       = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const handleMediaFile = async (file: File) => {
    const isVideo = file.type.startsWith('video/')
    setMediaType(isVideo ? 'video' : 'image')
    setUploading(true)

    if (isVideo) {
      const thumbData = await captureVideoThumbnail(file)
      const [uploaded, thumbUploaded] = await Promise.all([
        uploadFile(file, 'memories'),
        thumbData ? uploadDataUrl(thumbData, 'thumbnails') : Promise.resolve(null),
      ])
      setMediaUrl(uploaded)
      setThumbUrl(thumbUploaded)
    } else {
      const reader = new FileReader()
      reader.onload = () => setEditing(reader.result as string)
      reader.readAsDataURL(file)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)

    let finalMedia = mediaUrl
    let finalThumb = thumbUrl
    if (mediaType === 'image' && mediaUrl?.startsWith('data:')) {
      finalMedia = await uploadDataUrl(mediaUrl, 'memories')
    }

    const payload = {
      row_id: rowId,
      title: title.trim(),
      year: year.trim() || null,
      match_text: matchText.trim() || '100% Match',
      message: message.trim() || null,
      media_url: finalMedia,
      media_type: mediaType,
      thumbnail_url: mediaType === 'video' ? finalThumb : null,
    }

    const { error: saveError } = card
      ? await supabase.from('cards').update(payload).eq('id', card.id)
      : await supabase.from('cards').insert({ ...payload, position: 999 })

    if (saveError) {
      showToast('Failed to save memory')
      setSaving(false)
      return
    }

    await onSave()
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!card || !confirm(`Delete "${card.title}"?`)) return
    if (card.media_url) await deleteFile(card.media_url)
    if (card.thumbnail_url) await deleteFile(card.thumbnail_url)
    await supabase.from('cards').delete().eq('id', card.id)
    await onSave()
    showToast('Memory deleted')
  }

  if (editing) return (
    <ImageEditor
      srcDataUrl={editing}
      onApply={d => { setMediaUrl(d); setEditing(null) }}
      onCancel={() => setEditing(null)}
    />
  )

  const preview = mediaType === 'video' ? (thumbUrl ?? mediaUrl) : mediaUrl

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="form-wrap">
          <h2>{card ? 'Edit memory' : 'Add a memory'}</h2>

          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div className="field">
            <label>Year (optional)</label>
            <input type="text" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2019" maxLength={10} />
          </div>
          <div className="field">
            <label>Match text</label>
            <input type="text" value={matchText} onChange={e => setMatchText(e.target.value)} maxLength={30} />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="A note about this memory" />
          </div>
          <div className="field">
            <label>Photo or video</label>
            {preview
              ? <div style={{ marginTop: 6 }}>
                  {mediaType === 'video' && mediaUrl
                    ? <video className="upload-preview-video" src={mediaUrl} controls />
                    : <div className="upload-preview" style={{ backgroundImage: `url("${preview}")` }} />
                  }
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button className="form-btn secondary" onClick={() => { setMediaUrl(null); setThumbUrl(null) }}>Remove</button>
                    {mediaType === 'image' && mediaUrl && (
                      <button className="form-btn secondary" onClick={() => setEditing(mediaUrl.startsWith('data:') ? mediaUrl : mediaUrl!)}>Edit</button>
                    )}
                  </div>
                </div>
              : <div className="upload-zone">
                  <div className="upload-icon">{uploading ? '⏳' : '🎞'}</div>
                  {uploading ? 'Uploading…' : 'Click to upload a photo or video'}
                  <div className="upload-hint">Videos get an auto-generated thumbnail</div>
                  <input type="file" accept="image/*,video/*" disabled={uploading} onChange={e => {
                    const file = e.target.files?.[0]; if (file) handleMediaFile(file)
                  }} />
                </div>
            }
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            {card && <button className="form-btn danger" onClick={handleDelete}>Delete</button>}
            <button className="form-btn secondary" onClick={onClose}>Cancel</button>
            <button className="form-btn primary" onClick={handleSave} disabled={saving || uploading}>
              {saving ? 'Saving…' : 'Save memory'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
