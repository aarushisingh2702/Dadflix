'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  onComplete: () => void
}

export default function IntroAnimation({ onComplete }: Props) {
  const [phase, setPhase]   = useState<'tap'|'playing'|'flare'>('tap')
  const finishedRef         = useRef(false)
  const word                = 'DADFLIX'

  function finish() {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete()
  }

  function start() {
    if (phase !== 'tap') return
    setPhase('playing')
    playTaDum()

    const letterCount   = word.length
    const lastLetterEnd = (letterCount - 1) * 0.09 + 0.45
    setTimeout(() => setPhase('flare'), lastLetterEnd * 1000 + 140)
    setTimeout(finish,                  lastLetterEnd * 1000 + 940)
  }

  // auto-finish when flare is done
  useEffect(() => {
    if (phase === 'flare') {
      const t = setTimeout(finish, 800)
      return () => clearTimeout(t)
    }
  }, [phase])

  return (
    <div
      className="intro-overlay"
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest('.intro-skip')) return
        if (phase === 'tap') start()
        else finish()
      }}
    >
      {/* tap to begin */}
      {phase === 'tap' && (
        <div className="intro-tap">
          <div className="intro-tap-icon">▶</div>
          <div>Tap to begin</div>
        </div>
      )}

      {/* animated letters */}
      {phase !== 'tap' && (
        <div className={`intro-letters ${phase === 'playing' ? 'playing' : ''} ${phase === 'flare' ? 'fadeout' : ''}`}>
          {word.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.09}s` }}>{ch}</span>
          ))}
        </div>
      )}

      {/* red flash */}
      <div className={`intro-flare ${phase === 'flare' ? 'animate' : ''}`} />

      {/* skip */}
      {phase !== 'tap' && (
        <button className="intro-skip" onClick={(e) => { e.stopPropagation(); finish() }}>
          Skip intro
        </button>
      )}
    </div>
  )
}

/* ── Netflix-style ta-dum sound ─────────────────────────────── */
function playTaDum() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime

    const thud = (time: number, freq: number, dur: number, gain: number) => {
      const osc  = ctx.createOscillator()
      const g    = ctx.createGain()
      osc.type   = 'sine'
      osc.frequency.setValueAtTime(freq, time)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, time + dur)
      g.gain.setValueAtTime(0.0001, time)
      g.gain.exponentialRampToValueAtTime(gain, time + 0.04)
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(time); osc.stop(time + dur + 0.05)
    }

    const chime = (time: number, freqs: number[], dur: number, gain: number) => {
      freqs.forEach(f => {
        const osc = ctx.createOscillator()
        const g   = ctx.createGain()
        osc.type  = 'triangle'
        osc.frequency.setValueAtTime(f, time)
        g.gain.setValueAtTime(0.0001, time)
        g.gain.exponentialRampToValueAtTime(gain, time + 0.03)
        g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
        osc.connect(g); g.connect(ctx.destination)
        osc.start(time); osc.stop(time + dur + 0.05)
      })
    }

    thud(now,        90,  0.5,  0.35)
    chime(now,       [220, 440], 0.4, 0.05)
    thud(now + 0.62, 70,  0.9,  0.45)
    chime(now + 0.62,[261.6, 523.3, 659.3], 0.85, 0.08)

    setTimeout(() => { try { ctx.close() } catch {} }, 2200)
  } catch { /* silent fallback */ }
}
