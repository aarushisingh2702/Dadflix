'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import IntroAnimation from '@/components/IntroAnimation'
import ProfilePicker from '@/components/ProfilePicker'
import ProfileScreen from '@/components/ProfileScreen'
import Toast from '@/components/Toast'

type AppScreen = 'intro' | 'picker' | 'profile'

export default function Home() {
  const [screen, setScreen]             = useState<AppScreen>('intro')
  const [profiles, setProfiles]         = useState<Profile[]>([])
  const [selected, setSelected]         = useState<Profile | null>(null)
  const [isEditor, setIsEditor]         = useState(false)
  const [toast, setToast]               = useState('')
  const [loading, setLoading]           = useState(true)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }, [])

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    if (data) setProfiles(data as Profile[])
  }, [])

  useEffect(() => {
    const introSeen = typeof window !== 'undefined'
      ? localStorage.getItem('dadflix:intro-seen') : null
    loadProfiles().then(() => {
      setLoading(false)
      if (introSeen) setScreen('picker')
      // else stays 'intro'
    })
  }, [loadProfiles])

  const handleIntroComplete = () => {
    localStorage.setItem('dadflix:intro-seen', 'true')
    setScreen('picker')
  }

  const handleSelectProfile = (profile: Profile) => {
    setSelected(profile)
    setScreen('profile')
  }

  const handleBack = () => {
    setSelected(null)
    setScreen('picker')
    setIsEditor(false)
    loadProfiles()
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div>Loading memories…</div>
      </div>
    )
  }

  return (
    <>
      {screen === 'intro' && (
        <IntroAnimation onComplete={handleIntroComplete} />
      )}
      {screen === 'picker' && (
        <ProfilePicker
          profiles={profiles}
          isEditor={isEditor}
          onSelect={handleSelectProfile}
          onProfilesChange={loadProfiles}
          onEditorChange={setIsEditor}
          showToast={showToast}
        />
      )}
      {screen === 'profile' && selected && (
        <ProfileScreen
          profile={selected}
          isEditor={isEditor}
          onBack={handleBack}
          onEditorChange={setIsEditor}
          showToast={showToast}
        />
      )}
      <Toast message={toast} />
    </>
  )
}
