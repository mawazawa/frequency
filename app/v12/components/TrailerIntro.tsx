"use client";

import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrailerAudio, type SubtitleCue } from '@/hooks/useTrailerAudio';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════════════
// TRAILER INTRO — Full-screen cinematic intro with audio & subtitles
// Phases: 'waiting' → user taps play → 'playing' → audio ends → 'done'
// ═══════════════════════════════════════════════════════════════════

interface TrailerIntroProps {
  /** Current intro phase */
  phase: 'waiting' | 'playing' | 'done';
  /** Called when user starts the trailer */
  onPlay: () => void;
  /** Called when user skips or trailer ends */
  onDone: () => void;
  /** Trailer audio hook instance — pass through so parent can use getFrequencyData */
  trailerAudio: ReturnType<typeof useTrailerAudio>;
}

const SubtitleDisplay = ({ cue }: { cue: SubtitleCue | null }) => (
  <AnimatePresence mode="wait">
    {cue && (
      <motion.div
        key={cue.text}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed bottom-[12vh] left-0 right-0 z-[110] flex justify-center pointer-events-none px-6"
      >
        <p className={`text-center max-w-lg leading-relaxed whitespace-pre-line ${
          cue.style === 'powerful'
            ? 'font-cinzel text-xl md:text-3xl text-white tracking-wider uppercase'
            : cue.style === 'present'
            ? 'font-playfair italic text-lg md:text-2xl text-white/90'
            : 'font-sans text-base md:text-xl text-white/70 font-light'
        }`}>
          {cue.text}
        </p>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function TrailerIntro({ phase, onPlay, onDone, trailerAudio }: TrailerIntroProps) {
  const { currentSubtitle, isPlaying } = trailerAudio;

  if (phase === 'done') return null;

  return (
    <>
      <AnimatePresence>
        {phase === 'waiting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035),rgba(0,0,0,0.9)_55%,rgba(0,0,0,0.98)_100%)]" />
            {/* Background mushroom imagery */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[600px] aspect-[4/3] opacity-[0.12] relative">
                <Image
                  src="/images/mushroom-cluster.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 768px) 80vw, 600px"
                  className="object-contain"
                />
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center text-center px-8 max-w-md -mt-6"
            >
              <div className="absolute -inset-10 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0)_60%)]" />
              <h2 className="font-cinzel text-3xl md:text-4xl text-white mb-4 tracking-[0.2em] drop-shadow-[0_12px_40px_rgba(0,0,0,0.9)]">
                Find Your Frequency
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-10 max-w-xs">
                This experience reacts to sound. Press play to begin the journey, or skip to explore on your own.
              </p>

              {/* Play button */}
              <button
                onClick={onPlay}
                className="group relative w-28 h-28 rounded-full border-2 border-white/40 bg-white/5 backdrop-blur-xl flex items-center justify-center hover:border-white/70 hover:bg-white/10 transition-all duration-500 hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] mb-6"
              >
                <div className="absolute -inset-6 rounded-full bg-mycelium-gold/10 blur-2xl opacity-60" />
                <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                <div className="absolute inset-[6px] rounded-full border border-white/10" />
                <div className="flex flex-col items-center gap-2">
                  {/* Play triangle */}
                  <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/50 group-hover:text-white/80 transition-colors">Play</span>
                </div>
              </button>

              <button
                onClick={onDone}
                className="text-white/50 hover:text-white/80 text-xs uppercase tracking-[0.25em] transition-colors"
              >
                Skip intro →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitle overlay during playback */}
      {phase === 'playing' && (
        <>
          <SubtitleDisplay cue={currentSubtitle} />
          {/* Skip button during playback */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            onClick={onDone}
            className="fixed top-8 right-8 z-[110] text-white/30 hover:text-white/60 text-xs uppercase tracking-[0.2em] transition-colors backdrop-blur-sm bg-black/20 px-4 py-2 rounded-full"
          >
            Skip →
          </motion.button>
        </>
      )}
    </>
  );
}
