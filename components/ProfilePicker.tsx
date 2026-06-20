'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadDataUrl, uploadFile } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import ImageEditor from './ImageEditor'
import AdminLock from './AdminLock'

const PROFILE_COLORS = ['#e5573f','#1f8a4c','#3b6fd6','#9b51c0','#c2185b','#e8a23a','#00897b','#d4840a']

interface Props {
  profiles:         Profile[]
  isEditor:         boolean
  onSelect:         (p: Profile) => void
  onProfilesChange: () => Promise<void>
  onEditorChange:   (v: boolean) => void
  showToast:        (msg: string) => void
}

type ModalState =
  | { type: 'none' }
  | { type: 'lock' }
  | { type: 'add' }
  | { type: 'edit'; profile: Profile }

export default function ProfilePicker({
  profiles, isEditor, onSelect, onProfilesChange, onEditorChange, showToast,
}: Props) {
  const [managing, setManaging]   = useState(false)
  const [modal, setModal]         = useState<ModalState>({ type: 'none' })
  const closeModal                = () => setModal({ type: 'none' })

  return (
    <div className="picker">
      <h1>Who&apos;s watching?</h1>

      <div className="profiles-grid">
        {profiles.map(p => (
          <div
            key={p.id}
            className={`profile-item ${managing ? 'editing' : ''}`}
            onClick={() => managing
              ? (isEditor ? setModal({ type: 'edit', profile: p }) : null)
              : onSelect(p)
            }
          >
            <div
              className="avatar"
              style={p.avatar_url
                ? { backgroundImage: `url("${p.avatar_url}")` }
                : { background: p.color }
              }
            >
              {!p.avatar_url && p.name.charAt(0).toUpperCase()}
            </div>
            {managing && isEditor && (
              <div className="edit-pencil">✎</div>
            )}
            <div className="profile-name">{p.name}</div>
          </div>
        ))}

        {/* Add profile — only shown to editor */}
        {isEditor && (
          <div className="profile-item add-profile" onClick={() => setModal({ type: 'add' })}>
            <div className="avatar">+</div>
            <div className="profile-name">Add profile</div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <button
          className={`manage-btn ${managing ? 'active' : ''}`}
          onClick={() => setManaging(m => !m)}
        >
          {managing ? 'Done' : 'Manage profiles'}
        </button>

        {/* Admin lock toggle */}
        <button
          className="manage-btn"
          onClick={() => {
            if (isEditor) { onEditorChange(false); showToast('Edit mode off') }
            else setModal({ type: 'lock' })
          }}
          title={isEditor ? 'Exit edit mode' : 'Admin login'}
        >
          {isEditor ? '🔓 Editor on' : '🔒 Admin'}
        </button>
      </div>

      {/* ── Modals ────────────────────────── */}
      {modal.type === 'lock' && (
        <AdminLock
          onUnlock={() => { onEditorChange(true); closeModal(); showToast('Edit mode on ✓') }}
          onClose={closeModal}
          showToast={showToast}
        />
      )}
      {modal.type === 'add' && (
        <AddProfileModal
          count={profiles.length}
          colors={PROFILE_COLORS}
          onSave={async (name, avatarUrl) => {
            const { error } = await supabase.from('profiles').insert({
              name,
              color: PROFILE_COLORS[profiles.length % PROFILE_COLORS.length],
              avatar_url: avatarUrl,
            })
            if (error) { showToast('Failed to add profile'); return }
            await onProfilesChange()
            closeModal()
            showToast('Profile added ✓')
          }}
          onClose={closeModal}
          showToast={showToast}
        />
      )}
      {modal.type === 'edit' && (
        <EditProfileModal
          profile={modal.profile}
          onSave={async (name, avatarUrl) => {
            const { error } = await supabase
              .from('profiles')
              .update({ name, avatar_url: avatarUrl })
              .eq('id', modal.profile.id)
            if (error) { showToast('Update failed'); return }
            await onProfilesChange()
            closeModal()
            showToast('Profile updated ✓')
          }}
          onDelete={async () => {
            if (!confirm(`Delete "${modal.profile.name}" and all their memories? This can't be undone.`)) return
            await supabase.from('profiles').delete().eq('id', modal.profile.id)
            await onProfilesChange()
            closeModal()
            showToast('Profile deleted')
          }}
          onClose={closeModal}
          showToast={showToast}
        />
      )}
    </div>
  )
}

/* ── Add Profile Modal ──────────────────────────────────────── */
function AddProfileModal({ count, colors, onSave, onClose, showToast }:{
  count: number; colors: string[]
  onSave:(name:string, avatarUrl:string|null)=>Promise<void>
  onClose:()=>void; showToast:(m:string)=>void
}) {
  const [name, setName]         = useState('')
  const [avatarData, setAvatar] = useState<string|null>(null)
  const [editing, setEditing]   = useState<string|null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a name.'); return }
    setSaving(true)
    let url: string|null = null
    if (avatarData) url = await uploadDataUrl(avatarData, 'avatars')
    await onSave(name.trim(), url)
    setSaving(false)
  }

  if (editing) return (
    <ImageEditor
      srcDataUrl={editing}
      onApply={d => { setAvatar(d); setEditing(null) }}
      onCancel={() => setEditing(null)}
    />
  )

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="form-wrap">
          <h2>Add a profile</h2>
          <p className="form-sub">One profile per family member. Each has their own memories.</p>

          <div className="field">
            <label>Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)}
              placeholder="e.g. Dad, Mom, Priya" maxLength={24} />
          </div>

          <div className="field">
            <label>Profile photo (optional)</label>
            {avatarData
              ? <div style={{display:'flex',gap:12,alignItems:'center',marginTop:6}}>
                  <div className="upload-preview" style={{width:80,height:80,borderRadius:8,backgroundImage:`url("${avatarData}")`}} />
                  <button className="form-btn secondary" onClick={()=>setAvatar(null)}>Remove</button>
                  <button className="form-btn secondary" onClick={()=>setEditing(avatarData)}>Edit</button>
                </div>
              : <div className="upload-zone">
                  <div className="upload-icon">🖼</div>
                  Click to upload a photo
                  <div className="upload-hint">JPG, PNG, WEBP — skip for a colour initial</div>
                  <input type="file" accept="image/*" onChange={async e=>{
                    const file = e.target.files?.[0]; if(!file) return
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
              {saving ? 'Saving…' : 'Add profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Edit Profile Modal ─────────────────────────────────────── */
function EditProfileModal({ profile, onSave, onDelete, onClose, showToast }:{
  profile: Profile
  onSave:(name:string, avatarUrl:string|null)=>Promise<void>
  onDelete:()=>Promise<void>
  onClose:()=>void; showToast:(m:string)=>void
}) {
  const [name, setName]         = useState(profile.name)
  const [avatarData, setAvatar] = useState<string|null>(profile.avatar_url)
  const [editing, setEditing]   = useState<string|null>(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a name.'); return }
    setSaving(true)
    let url: string|null = avatarData
    if (avatarData && avatarData.startsWith('data:')) {
      url = await uploadDataUrl(avatarData, 'avatars')
    }
    await onSave(name.trim(), url)
    setSaving(false)
  }

  if (editing) return (
    <ImageEditor
      srcDataUrl={editing}
      onApply={d => { setAvatar(d); setEditing(null) }}
      onCancel={() => setEditing(null)}
    />
  )

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="form-wrap">
          <h2>Edit profile</h2>

          <div className="field">
            <label>Name</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} maxLength={24} />
          </div>

          <div className="field">
            <label>Profile photo</label>
            {avatarData && !avatarData.startsWith('data:')
              ? <div style={{display:'flex',gap:12,alignItems:'center',marginTop:6}}>
                  <div className="upload-preview" style={{width:80,height:80,borderRadius:8,backgroundImage:`url("${avatarData}")`}} />
                  <button className="form-btn secondary" onClick={()=>setAvatar(null)}>Remove</button>
                  <button className="form-btn secondary" onClick={()=>setEditing(avatarData)}>Edit</button>
                </div>
              : avatarData
              ? <div style={{display:'flex',gap:12,alignItems:'center',marginTop:6}}>
                  <div className="upload-preview" style={{width:80,height:80,borderRadius:8,backgroundImage:`url("${avatarData}")`}} />
                  <button className="form-btn secondary" onClick={()=>setAvatar(null)}>Remove</button>
                  <button className="form-btn secondary" onClick={()=>setEditing(avatarData)}>Re-edit</button>
                </div>
              : <div className="upload-zone">
                  <div className="upload-icon">🖼</div>
                  Click to upload a photo
                  <input type="file" accept="image/*" onChange={async e=>{
                    const file = e.target.files?.[0]; if(!file) return
                    const reader = new FileReader()
                    reader.onload = () => setEditing(reader.result as string)
                    reader.readAsDataURL(file)
                  }} />
                </div>
            }
          </div>

          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button className="form-btn danger" onClick={onDelete}>Delete profile</button>
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
