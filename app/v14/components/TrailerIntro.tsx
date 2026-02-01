"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SubtitleCue } from '@/hooks/useTrailerAudio';

interface TrailerIntroProps {
  phase: 'waiting' | 'playing' | 'done';
  currentSubtitle: SubtitleCue | null;
  currentTime: number;
  duration: number;
  onStart: () => void;
  onSkip: () => void;
}

export const TrailerIntro = ({
  phase,
  currentSubtitle,
  currentTime,
  duration,
  onStart,
  onSkip,
}: TrailerIntroProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      {/* Pre-play state: tap to begin */}
      {phase === 'waiting' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex flex-col items-center text-center px-8"
        >
          <button
            onClick={onStart}
            className="group relative w-24 h-24 rounded-full border border-white/20 bg-white/[0.03] flex items-center justify-center hover:border-white/40 hover:bg-white/[0.06] transition-all duration-700 mb-8"
          >
            <div
              className="absolute inset-0 rounded-full border border-white/5 animate-ping opacity-30"
              style={{ animationDuration: '3s' }}
            />
            <svg
              className="w-8 h-8 text-white/60 group-hover:text-white transition-colors ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/25 font-cinzel">
            Tap to tune in
          </p>
        </motion.div>
      )}

      {/* Playing state: subtitles + skip button */}
      {phase === 'playing' && (
        <>
          {/* Subtitle display */}
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <AnimatePresence mode="wait">
              {currentSubtitle && (
                <motion.div
                  key={currentSubtitle.text}
                  initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="text-center px-8 max-w-2xl"
                >
                  <p
                    className={`font-playfair leading-relaxed whitespace-pre-line ${
                      currentSubtitle.style === 'distant'
                        ? 'text-white/40 text-lg md:text-2xl italic'
                        : currentSubtitle.style === 'present'
                        ? 'text-white/70 text-xl md:text-3xl italic'
                        : 'text-white text-2xl md:text-4xl font-cinzel not-italic tracking-[0.15em] uppercase drop-shadow-[0_0_40px_rgba(255,255,255,0.3)]'
                    }`}
                  >
                    {currentSubtitle.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Skip intro button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 0.5 }}
            onClick={onSkip}
            className="absolute bottom-8 right-8 z-20 text-white/20 hover:text-white/50 text-[10px] uppercase tracking-[0.3em] transition-colors duration-300 font-cinzel"
          >
            Skip intro →
          </motion.button>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20">
            <motion.div
              className="h-full bg-white/20"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </>
      )}
    </motion.div>
  );
};
