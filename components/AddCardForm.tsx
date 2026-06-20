'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import MediaUploader from '@/components/MediaUploader'

type MediaType = 'image' | 'video'

interface AddCardFormProps {
  /** The memory_rows.id this card belongs to */
  rowId: string
  /** Called after the card is successfully saved */
  onCardAdded?: () => void
  /** Optional cancel handler — shows a Cancel button when provided */
  onCancel?: () => void
}

export default function AddCardForm({ rowId, onCardAdded, onCancel }: AddCardFormProps) {
  const [title,     setTitle]     = useState('')
  const [year,      setYear]      = useState('')
  const [message,   setMessage]   = useState('')
  const [mediaUrl,  setMediaUrl]  = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  function handleUploadComplete(url: string, type: MediaType) {
    setMediaUrl(url)
    setMediaType(type)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Please add a title.')
      return
    }
    if (!mediaUrl || !mediaType) {
      setError('Please upload a photo or video first.')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase.from('cards').insert({
      row_id:     rowId,
      title:      title.trim(),
      year:       year.trim() || null,
      message:    message.trim() || null,
      media_url:  mediaUrl,
      media_type: mediaType,
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    // Reset for the next memory
    setTitle('')
    setYear('')
    setMessage('')
    setMediaUrl(null)
    setMediaType(null)

    onCardAdded?.()
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-wrap" style={{ paddingTop: 24 }}>
        <h2>Add a memory</h2>
        <p className="form-sub">This card will appear in the row below.</p>

        {/* Title */}
        <div className="field">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Beach trip 2019"
            maxLength={60}
            required
          />
        </div>

        {/* Year */}
        <div className="field">
          <label>Year / date (optional)</label>
          <input
            type="text"
            value={year}
            onChange={e => setYear(e.target.value)}
            placeholder='e.g. 2019, or "Every summer"'
            maxLength={30}
          />
        </div>

        {/* Message */}
        <div className="field">
          <label>Your message (optional)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="A note to go with this memory…"
            rows={3}
          />
        </div>

        {/* Media — delegates upload + preview to MediaUploader */}
        <div className="field">
          <MediaUploader
            label="Photo or video"
            accept="both"
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* Error */}
        {error && <p className="form-error">{error}</p>}

        {/* Actions */}
        <div className="form-actions">
          {onCancel && (
            <button type="button" className="form-btn secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="form-btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add memory'}
          </button>
        </div>
      </div>
    </form>
  )
}
