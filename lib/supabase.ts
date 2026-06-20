/**
 * Re-exports the canonical Supabase client from utils/supabase.
 * New code should import directly from '@/utils/supabase'.
 */
export { supabase } from '@/utils/supabase'

// ── Storage helpers used by the rest of the app ─────────────────────────────

import { supabase as _sb } from '@/utils/supabase'

const BUCKET = 'dadflix-media'

/** Upload a raw File to Supabase Storage. Returns public URL or null. */
export async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext  = file.name.split('.').pop() ?? 'bin'
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await _sb.storage.from(BUCKET).upload(path, file)
  if (error) { console.error('Upload error:', error); return null }
  return _sb.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl
}

/** Upload a base64 data-URL (after image editing) to Supabase Storage. */
export async function uploadDataUrl(dataUrl: string, folder: string): Promise<string | null> {
  const res  = await fetch(dataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
  return uploadFile(file, folder)
}

/** Delete a file from Supabase Storage by its public URL. */
export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    const url   = new URL(publicUrl)
    const parts = url.pathname.split(`/object/public/${BUCKET}/`)
    if (parts.length < 2) return
    await _sb.storage.from(BUCKET).remove([parts[1]])
  } catch { /* ignore */ }
}
