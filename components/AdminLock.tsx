'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  onUnlock:  () => void
  onClose:   () => void
  showToast: (msg: string) => void
}

export default function AdminLock({ onUnlock, onClose, showToast }: Props) {
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [setting, setSetting] = useState(false)
  const [newCode, setNewCode] = useState('')

  const handleUnlock = async () => {
    if (!code.trim()) { setError('Enter the admin code.'); return }
    setLoading(true)
    const { data } = await supabase.from('settings').select('value').eq('key','admin_code').single()
    setLoading(false)
    if (!data) {
      // No code set yet — ask to create one
      setSetting(true)
      return
    }
    if (code.trim() === data.value) {
      onUnlock()
    } else {
      setError('Incorrect code. Try again.')
    }
  }

  const handleSetCode = async () => {
    if (!newCode.trim()) { setError('Enter a code.'); return }
    setLoading(true)
    await supabase.from('settings').upsert({ key: 'admin_code', value: newCode.trim() })
    setLoading(false)
    onUnlock()
    showToast('Admin code created ✓')
  }

  return (
    <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {!setting ? (
          <div className="lock-box">
            <h2>🔒 Admin Login</h2>
            <p>Enter your admin code to unlock editing controls. Visitors without the code can only browse.</p>
            <input
              type="password"
              placeholder="Admin code"
              value={code}
              onChange={e => { setCode(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              autoFocus
            />
            {error && <div className="form-error" style={{marginBottom:10}}>{error}</div>}
            <button onClick={handleUnlock} disabled={loading}>
              {loading ? 'Checking…' : 'Unlock editor'}
            </button>
            <div className="help-text" style={{marginTop:14,textAlign:'center'}}>
              First time? Just enter any code — it will be set as your admin code.
            </div>
          </div>
        ) : (
          <div className="lock-box">
            <h2>Set Admin Code</h2>
            <p>No admin code exists yet. Create one now — you&apos;ll use it to make edits. Anyone without it can only view.</p>
            <input
              type="password"
              placeholder="Choose a passcode"
              value={newCode}
              onChange={e => { setNewCode(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSetCode()}
              autoFocus
            />
            {error && <div className="form-error" style={{marginBottom:10}}>{error}</div>}
            <button onClick={handleSetCode} disabled={loading}>
              {loading ? 'Saving…' : 'Set code & unlock'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
