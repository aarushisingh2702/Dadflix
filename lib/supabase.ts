import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel (or .env.local locally).'
  )
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder')

// ─── Storage helpers ────────────────────────────────────────────────────────

const BUCKET = 'dadflix-media'

/** Upload a raw File to Supabase Storage. Returns public URL or null on failure. */
export async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) { console.error('Upload error:', error); return null }
  return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl
}

/** Upload a base64 data-URL (after image editor) to Supabase Storage. */
export async function uploadDataUrl(dataUrl: string, folder: string): Promise<string | null> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'image.jpg', { type: 'image/jpeg' })
  return uploadFile(file, folder)
}

/** Delete a file from Supabase Storage by its public URL. */
export async function deleteFile(publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl)
    // path after /object/public/dadflix-media/
    const parts = url.pathname.split(`/object/public/${BUCKET}/`)
    if (parts.length < 2) return
    await supabase.storage.from(BUCKET).remove([parts[1]])
  } catch { /* ignore */ }
}
