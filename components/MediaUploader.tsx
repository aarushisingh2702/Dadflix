'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'

const BUCKET = 'dadflix-media'

type MediaType = 'image' | 'video'

interface MediaUploaderProps {
  /** Called after a successful upload with the public URL and detected media type */
  onUploadComplete?: (url: string, mediaType: MediaType) => void
  /** Optional label shown above the drop zone */
  label?: string
  /** Restrict to image only or video only — default accepts both */
  accept?: 'image' | 'video' | 'both'
}

export default function MediaUploader({
  onUploadComplete,
  label,
  accept = 'both',
}: MediaUploaderProps) {
  const [uploading,  setUploading]  = useState(false)
  const [progress,   setProgress]   = useState(0)
  const [error,      setError]      = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mediaType,  setMediaType]  = useState<MediaType | null>(null)

  const acceptAttr =
    accept === 'image' ? 'image/*' :
    accept === 'video' ? 'video/*' :
    'image/*,video/*'

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setUploading(true)
    setProgress(10)

    const detectedType: MediaType = file.type.startsWith('video') ? 'video' : 'image'
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const filePath = `${Date.now()}-${safeName}`

    setProgress(30)

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(90)

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

    setPreviewUrl(data.publicUrl)
    setMediaType(detectedType)
    setProgress(100)
    setUploading(false)
    onUploadComplete?.(data.publicUrl, detectedType)
  }

  const reset = () => {
    setPreviewUrl(null)
    setMediaType(null)
    setProgress(0)
    setError(null)
  }

  return (
    <div>
      {label && (
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-dim)',
          marginBottom: 7,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
        }}>
          {label}
        </label>
      )}

      {/* ── Drop zone (shown when no preview yet) ──────────────── */}
      {!previewUrl && (
        <div className="upload-zone" style={{ position: 'relative' }}>
          <div className="upload-icon">
            {accept === 'video' ? '🎬' : accept === 'image' ? '🖼' : '📁'}
          </div>
          <div>
            {uploading
              ? 'Uploading…'
              : `Click to upload ${accept === 'both' ? 'photo or video' : accept}`}
          </div>
          <div className="upload-hint">
            {accept === 'image' && 'JPG · PNG · WEBP · GIF'}
            {accept === 'video' && 'MP4 · MOV · WEBM'}
            {accept === 'both' && 'Photos: JPG PNG WEBP  ·  Videos: MP4 MOV WEBM'}
          </div>
          <input
            type="file"
            accept={acceptAttr}
            onChange={handleUpload}
            disabled={uploading}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
          />
        </div>
      )}

      {/* ── Upload progress bar ─────────────────────────────────── */}
      {uploading && (
        <div className="upload-progress" style={{ marginTop: 10 }}>
          <div className="upload-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ── Error state ─────────────────────────────────────────── */}
      {error && (
        <p className="form-error" style={{ marginTop: 8 }}>
          ⚠ {error}
        </p>
      )}

      {/* ── Image preview ───────────────────────────────────────── */}
      {previewUrl && mediaType === 'image' && (
        <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded preview"
            style={{
              maxWidth: '100%',
              maxHeight: 200,
              borderRadius: 6,
              display: 'block',
              objectFit: 'cover',
            }}
          />
          <button
            onClick={reset}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.6)', border: 'none',
              color: '#fff', borderRadius: '50%', width: 26, height: 26,
              cursor: 'pointer', fontSize: 13, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            title="Remove"
          >✕</button>
        </div>
      )}

      {/* ── Video preview ───────────────────────────────────────── */}
      {previewUrl && mediaType === 'video' && (
        <div style={{ marginTop: 10, position: 'relative' }}>
          <video
            src={previewUrl}
            controls
            className="upload-preview-video"
            style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }}
          />
          <button
            onClick={reset}
            style={{
              position: 'absolute', top: 6, right: 6,
              background: 'rgba(0,0,0,0.6)', border: 'none',
              color: '#fff', borderRadius: '50%', width: 26, height: 26,
              cursor: 'pointer', fontSize: 13, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
            title="Remove"
          >✕</button>
        </div>
      )}
    </div>
  )
}
