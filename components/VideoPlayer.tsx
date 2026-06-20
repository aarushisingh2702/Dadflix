'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  src:   string   // public URL or blob URL
  title: string
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2,'0')}`
}

export default function VideoPlayer({ src, title }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const [playing,  setPlaying]  = useState(false)
  const [muted,    setMuted]    = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [current,  setCurrent]  = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  const toggle = () => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  const toggleMute = () => {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const toggleFullscreen = () => {
    const wrap = videoRef.current?.closest('.video-player-wrap') as HTMLElement
    if (!wrap) return
    if (!document.fullscreenElement) {
      wrap.requestFullscreen?.()
      setFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setFullscreen(false)
    }
  }

  useEffect(() => {
    const v = videoRef.current; if (!v) return
    const onTime = () => {
      setCurrent(v.currentTime)
      setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0)
    }
    const onLoad  = () => setDuration(v.duration)
    const onEnded = () => { setPlaying(false); v.currentTime = 0 }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onLoad)
    v.addEventListener('ended', onEnded)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onLoad)
      v.removeEventListener('ended', onEnded)
    }
  }, [])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current; if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * v.duration
  }

  return (
    <div className="video-player-wrap" onClick={toggle}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        style={{ width:'100%', height:'100%', objectFit:'contain' }}
      />

      {/* big play button overlay */}
      <div className={`video-big-play ${playing ? 'hidden' : ''}`}>
        <div className="play-icon">▶</div>
      </div>

      {/* controls */}
      <div className="video-controls" onClick={e => e.stopPropagation()}>
        {/* progress bar */}
        <div className="vc-progress" onClick={seek}>
          <div className="vc-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="video-controls-row">
          <button className="vc-btn" onClick={toggle}>{playing ? '⏸' : '▶'}</button>
          <button className="vc-btn" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
          <span className="vc-time">{fmtTime(current)} / {fmtTime(duration)}</span>
          <span className="vc-spacer" />
          <button className="vc-btn" onClick={toggleFullscreen}>{fullscreen ? '⛶' : '⛶'}</button>
        </div>
      </div>
    </div>
  )
}
