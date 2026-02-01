'use client'

import { useState, useRef, useEffect } from 'react'

/* ─── Types ─── */
interface Sample {
  id: string
  file: string
  label: string
  description: string
  script: string
  settings: string
  duration?: string
}

/* ─── Data ─── */
const SAMPLES: { section: string; description: string; items: Sample[] }[] = [
  {
    section: 'Script A — "Future Self" (3 Variations)',
    description:
      'Same script, different voice settings. This is the ~30-second "origin story" monologue — vulnerable opening, builds to passionate conviction.',
    items: [
      {
        id: 'a-v5',
        file: '/audio/voice-samples/A_v5_stable.mp3',
        label: 'Version 1 — Balanced',
        description: 'Our most reliable setting. Clean, natural, no artifacts.',
        script:
          'Three years ago, I was stuck. I mean really stuck. I was drinking too much, hiding behind a smile, and honestly I did not know who I was anymore.\n\nAnd then something shifted. I found mushrooms — not in some crazy way — but in this ancient, beautiful, scientific way that just made everything click.\n\nThat is what Frequency is. It is not a supplement company. It is the version of yourself you have not met yet.\n\nAnd trust me — that version of you? Way more interesting.',
        settings: 'Stability: 0.50 · Similarity: 0.78 · Style: 0.30',
      },
      {
        id: 'a-expressive',
        file: '/audio/voice-samples/A_expressive.mp3',
        label: 'Version 2 — Expressive',
        description:
          'More dynamic range — bigger emotional swings. May have slight quirks.',
        script: '(Same script as Version 1)',
        settings: 'Stability: 0.35 · Similarity: 0.80 · Style: 0.45',
      },
      {
        id: 'a-broadcast',
        file: '/audio/voice-samples/A_broadcast.mp3',
        label: 'Version 3 — Broadcast',
        description:
          'Higher stability, more controlled. Think radio host / narrator.',
        script: '(Same script as Version 1)',
        settings: 'Stability: 0.65 · Similarity: 0.85 · Style: 0.20',
      },
    ],
  },
  {
    section: 'Script B — "Frequency Manifesto"',
    description: 'Short, punchy. Good for ads and reels (~15 seconds).',
    items: [
      {
        id: 'b-manifesto',
        file: '/audio/voice-samples/B_manifesto.mp3',
        label: 'Manifesto — Balanced',
        description: 'Clean delivery with balanced settings.',
        script:
          'Nature has been doing this for millions of years. We just stopped listening.\n\nFrequency is about tuning back in. Functional mushrooms, ancient wisdom, modern science — all working together.\n\nThis is not wellness. This is waking up.',
        settings: 'Stability: 0.50 · Similarity: 0.78 · Style: 0.30',
      },
    ],
  },
  {
    section: 'Script C — "Direct Address"',
    description:
      'Conversational, like talking to one person. Testimonial-style (~20 seconds).',
    items: [
      {
        id: 'c-direct',
        file: '/audio/voice-samples/C_direct_address.mp3',
        label: 'Direct Address — Balanced',
        description: 'Natural conversational delivery.',
        script:
          'So look, I get it. You hear mushrooms and you think — right, another wellness trend. I thought the same thing.\n\nBut here is what nobody told me: these organisms are four billion years old. They have been solving problems longer than we have existed.\n\nOnce you understand that, you know, everything changes.',
        settings: 'Stability: 0.50 · Similarity: 0.78 · Style: 0.30',
      },
    ],
  },
  {
    section: 'Bonus — Trailer Mix',
    description:
      'The full 35-second cinematic trailer audio with radio static intro, 432Hz drone, and 3-act structure. This is what plays on the landing page.',
    items: [
      {
        id: 'trailer',
        file: '/audio/voice-samples/frequency_trailer_v1.mp3',
        label: 'Cinematic Trailer v1',
        description:
          'Mixed with static, reverb, and 432Hz drone. 3 acts: Rock Bottom → The Download → The Truth → "GOD IS FREQUENCY"',
        script:
          'Act 1 (distant, with static): "I was stuck. Drinking too much. Hiding behind a smile."\nAct 2 (clearing): "Then I found mushrooms. Not in some crazy way. In this ancient, beautiful, scientific way."\nAct 3 (clear, powerful): "Spirituality is simply unexplained science."\nClimax: "GOD IS FREQUENCY"',
        settings: 'Post-processed with FFmpeg: low-pass filter, reverb, pink noise bed',
      },
    ],
  },
]

/* ─── Player Component ─── */
function AudioCard({ sample }: { sample: Sample }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showScript, setShowScript] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => {
      setProgress(a.currentTime)
      setDuration(a.duration || 0)
    }
    const onEnd = () => setPlaying(false)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    // Pause all other audio elements on page
    document.querySelectorAll('audio').forEach((el) => {
      if (el !== a) {
        el.pause()
      }
    })
    if (playing) {
      a.pause()
    } else {
      a.play()
    }
    setPlaying(!playing)
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    a.currentTime = pct * duration
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]">
      <audio ref={audioRef} src={sample.file} preload="metadata" />

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-white/90">{sample.label}</h3>
          <p className="mt-1 text-sm text-white/40">{sample.description}</p>
        </div>
        <a
          href={sample.file}
          download
          className="flex-shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/60 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white/90"
          title="Download"
        >
          ↓ Download
        </a>
      </div>

      {/* Player */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition-all hover:border-white/20 hover:bg-white/[0.12] hover:text-white"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l10-5.5z" />
            </svg>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-1.5">
          <div
            className="group/bar relative h-2 cursor-pointer rounded-full bg-white/[0.06]"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/40 transition-all"
              style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>{fmt(progress)}</span>
            <span>{duration ? fmt(duration) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Settings badge */}
      <div className="mt-4 flex items-center gap-3">
        <span className="rounded-lg bg-white/[0.04] px-3 py-1 text-xs text-white/30">
          {sample.settings}
        </span>
        <button
          onClick={() => setShowScript(!showScript)}
          className="text-xs text-white/30 underline decoration-white/10 underline-offset-2 transition-colors hover:text-white/50"
        >
          {showScript ? 'Hide script' : 'Show script'}
        </button>
      </div>

      {/* Script */}
      {showScript && (
        <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/30 p-4 font-serif text-sm leading-relaxed text-white/50">
          {sample.script}
        </pre>
      )}
    </div>
  )
}

/* ─── Page ─── */
export default function VoiceReviewPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Subtle gradient bg */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-amber-950/[0.03] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-amber-500/40">
            Client Review
          </div>
          <h1 className="font-serif text-4xl font-light tracking-tight text-white/90 sm:text-5xl">
            Voice Clone Samples
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/35">
            AI-generated voice samples using your voice profile. Listen, compare, and let us know which direction feels right.
          </p>
          <div className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        </div>

        {/* Sections */}
        <div className="space-y-16">
          {SAMPLES.map((section) => (
            <div key={section.section}>
              <div className="mb-6">
                <h2 className="text-xl font-medium text-white/80">
                  {section.section}
                </h2>
                <p className="mt-1 text-sm text-white/30">{section.description}</p>
              </div>
              <div className="space-y-4">
                {section.items.map((sample) => (
                  <AudioCard key={sample.id} sample={sample} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-white/[0.06] pt-8 text-center">
          <p className="text-sm text-white/25">
            Frequency × Empathy Labs · Voice AI · {new Date().getFullYear()}
          </p>
          <p className="mt-2 text-xs text-white/15">
            Generated with ElevenLabs Multilingual v2 · Instant voice clone
          </p>
        </div>
      </div>
    </div>
  )
}
