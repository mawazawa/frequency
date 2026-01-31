"use client";

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Waves, Disc, Sprout, Activity, Sparkles } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Shared Components & Context
import { useAudio } from '@/components/AudioProvider';
import { GlassButton } from '@/components/ui/GlassButton';
import { WaveIcon } from '@/components/ui/WaveIcon';
import { Accordion } from '@/components/ui/Accordion';

const GPGPUParticles = dynamic(() => import('@/components/cymatics/GPGPUParticles').then(mod => mod.GPGPUParticles), { 
  ssr: false,
  loading: () => null
});

// ═══════════════════════════════════════════════════════════════════
// ANIMATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const TRANSITION_EASE = [0.22, 1, 0.36, 1]; // Custom spring-like easing

// ═══════════════════════════════════════════════════════════════════
// FONTS & STYLES
// ═══════════════════════════════════════════════════════════════════
const FontStyles = () => (
  <style>{`
    .font-cinzel { font-family: var(--font-cinzel), 'Cinzel', serif; }
    .font-playfair { font-family: var(--font-playfair), 'Playfair Display', serif; }
    .metal-text {
      background-image: linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 48%, #475569 50%, #94A3B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes wave {
      0%, 100% { height: 4px; opacity: 0.5; }
      50% { height: 16px; opacity: 1; }
    }
    .animate-wave { animation: wave ease-in-out infinite; }
    @keyframes gentleBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(4px); }
    }
    .animate-gentle-bounce { animation: gentleBounce 2s ease-in-out infinite; }
    @keyframes etherealPulse {
      0%, 100% { opacity: 0.08; transform: scale(1); }
      50% { opacity: 0.14; transform: scale(1.02); }
    }
    .animate-ethereal-pulse { animation: etherealPulse 8s ease-in-out infinite; }
    @keyframes slowDrift {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.05); }
    }
    .animate-slow-drift { animation: slowDrift 12s ease-in-out infinite; }
    @keyframes emojiBounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.25); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    .animate-emoji-bounce { animation: emojiBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    html { scroll-snap-type: y proximity; scroll-behavior: smooth; }
    .snap-start { scroll-snap-align: start; }
    .snap-center { scroll-snap-align: center; }
  `}</style>
);

// ═══════════════════════════════════════════════════════════════════
// MODE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
const MODES = {
  genesis: {
    id: 'genesis',
    label: 'Genesis',
    hz: '432 Hz',
    color1: [1.0, 0.5, 0.2] as [number, number, number],
    color2: [1.0, 0.9, 0.8] as [number, number, number],
    bg: [0.02, 0.008, 0.004],
    tension: 0.15,
    friction: 0.85,
    n: 3.0,
    m: 5.0,
    shapeFn: 0,
  },
  revelation: {
    id: 'revelation',
    label: 'Revelation',
    hz: '528 Hz',
    color1: [0.0, 0.7, 0.6] as [number, number, number],
    color2: [0.8, 0.9, 1.0] as [number, number, number],
    bg: [0.0, 0.031, 0.039],
    tension: 0.2,
    friction: 0.8,
    n: 5.0,
    m: 7.0,
    shapeFn: 1,
  },
  ascension: {
    id: 'ascension',
    label: 'Ascension',
    hz: '963 Hz',
    color1: [0.5, 0.0, 1.0] as [number, number, number],
    color2: [1.0, 0.6, 0.2] as [number, number, number],
    bg: [0.039, 0.0, 0.059],
    tension: 0.1,
    friction: 0.9,
    n: 7.0,
    m: 11.0,
    shapeFn: 2,
  }
} as const;

type ModeId = keyof typeof MODES;

const QUIZ_QUESTIONS = [
  {
    question: "What does your body need most right now?",
    options: [
      { text: "Calm & grounding", icon: "🌿", weight: 'genesis' as ModeId },
      { text: "Clarity & focus", icon: "💎", weight: 'revelation' as ModeId },
      { text: "Energy & expansion", icon: "⚡", weight: 'ascension' as ModeId },
    ]
  },
  {
    question: "How would you describe your current state?",
    options: [
      { text: "Overwhelmed — I need to slow down", icon: "🌊", weight: 'genesis' as ModeId },
      { text: "Foggy — I need to cut through the noise", icon: "🔮", weight: 'revelation' as ModeId },
      { text: "Stagnant — I need to break free", icon: "🔥", weight: 'ascension' as ModeId },
    ]
  },
  {
    question: "When you close your eyes, what do you hear?",
    options: [
      { text: "A deep hum, like the earth breathing", icon: "🪨", weight: 'genesis' as ModeId },
      { text: "A clear tone, like a bell in still air", icon: "🔔", weight: 'revelation' as ModeId },
      { text: "A rising wave, like wind through a canyon", icon: "🌀", weight: 'ascension' as ModeId },
    ]
  }
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const ProductBottle = () => (
  <div className="relative w-full h-[50vh] md:h-[80vh] flex items-center justify-center">
    {/* Warm ambient glow behind product */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.12] blur-3xl"
      style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%)' }} />
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 1.2, ease: TRANSITION_EASE }}
      className="relative z-10"
    >
      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/images/calm-product.jpg"
          alt="Frequency Calm Dose - Functional Mushroom Blend"
          width={500}
          height={500}
          className="object-contain rounded-2xl"
          style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.5)) drop-shadow(0 15px 30px rgba(0,0,0,0.3))' }}
          sizes="(max-width: 768px) 100vw, 500px"
        />
      </motion.div>
    </motion.div>
    <div className="absolute bottom-[8%] w-72 h-12 bg-black/40 blur-[30px] rounded-[100%]" />
  </div>
);

const PurchaseWidget = () => {
  const [subType, setSubType] = useState<'sub'|'once'>('sub');
  return (
    <div className="mt-10 space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 shadow-lg backdrop-blur-md overflow-hidden">
        {/* Subscription Option */}
        <button 
          onClick={() => setSubType('sub')} 
          className={clsx(
            "w-full flex items-center justify-between px-5 py-4 rounded-lg transition-all duration-300 relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]",
            subType==='sub' ? "bg-white/10 shadow-inner border border-white/5" : "hover:bg-white/5 border border-transparent"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300", 
              subType==='sub' ? "border-[#D4AF37] bg-[#D4AF37] scale-110" : "border-white/30 group-hover:border-white/50"
            )}>
              {subType==='sub' && <div className="w-2 h-2 bg-black rounded-full" />}
            </div>
            <div className="text-left">
              <span className={clsx("block font-medium text-sm sm:text-base transition-colors", subType==='sub' ? "text-white" : "text-white/80")}>
                Subscribe & Save 15%
              </span>
              <span className="block text-xs text-white/50 mt-0.5">Delivered monthly • Cancel anytime</span>
            </div>
          </div>
          <div className="text-right">
             <span className="block font-serif font-medium text-lg text-white">$98.00</span>
             <span className="block text-xs text-white/40 line-through decoration-white/30">$115.00</span>
          </div>
          {subType === 'sub' && <div className="absolute inset-0 border border-[#D4AF37]/20 rounded-lg pointer-events-none" />}
        </button>

        {/* One-time Option */}
        <button 
          onClick={() => setSubType('once')} 
          className={clsx(
            "w-full flex items-center justify-between px-5 py-4 rounded-lg transition-all duration-300 mt-1 relative group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]",
            subType==='once' ? "bg-white/10 shadow-inner border border-white/5" : "hover:bg-white/5 border border-transparent"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300", 
              subType==='once' ? "border-[#D4AF37] bg-[#D4AF37] scale-110" : "border-white/30 group-hover:border-white/50"
            )}>
              {subType==='once' && <div className="w-2 h-2 bg-black rounded-full" />}
            </div>
            <div className="text-left">
              <span className={clsx("block font-medium text-sm sm:text-base transition-colors", subType==='once' ? "text-white" : "text-white/80")}>
                One-time Purchase
              </span>
            </div>
          </div>
          <span className="font-serif font-medium text-lg text-white">$115.00</span>
          {subType === 'once' && <div className="absolute inset-0 border border-[#D4AF37]/20 rounded-lg pointer-events-none" />}
        </button>
      </div>

      <button className="group relative w-full bg-[#FAFAFA] text-black py-5 px-8 rounded-full font-medium hover:bg-white transition-all duration-300 flex items-center justify-between shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] transform hover:-translate-y-0.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
        <span className="relative z-10 text-lg tracking-wide">Add to Cart</span>
        <span className="relative z-10 flex items-center gap-3 font-serif text-lg">
          {subType==='sub'?'$98.00':'$115.00'}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </button>

      <div className="flex items-center justify-center gap-6 opacity-60">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
           <span className="text-[10px] uppercase tracking-widest text-white">In Stock</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white">Free shipping over $100</p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function V12Page() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [modeId, setModeId] = useState<ModeId>('genesis');
  const [showMicPrompt, setShowMicPrompt] = useState(true);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<ModeId | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Use Global Audio Context
  const { isReady: audioReady, startAudio } = useAudio();

  // Text scroll transforms — fades out and drifts up with parallax
  const textOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const textY = useTransform(scrollY, [0, 400], [0, -180]);
  const bgOpacity = useTransform(scrollY, [1500, 2500], [0, 1]);

  // Scrolled state for nav
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleEnableAudio = useCallback(() => {
    startAudio();
    setShowMicPrompt(false);
  }, [startAudio]);

  const handleDismissPrompt = useCallback(() => {
    setShowMicPrompt(false);
  }, []);

  const handleQuizAnswer = useCallback((answerIndex: number, weight: ModeId) => {
    if (selectedOption !== null) return; // Prevent double clicks
    
    setSelectedOption(answerIndex);
    const newAnswers = [...quizAnswers, answerIndex];
    setQuizAnswers(newAnswers);

    // Delay for visual feedback
    setTimeout(() => {
      const nextStep = quizStep + 1;
      
      if (nextStep > QUIZ_QUESTIONS.length) {
        setIsCalculating(true);
        setSelectedOption(null);
        setQuizStep(nextStep); // Advance to "post-questions" state

        // Simulate calculation/tuning delay
        setTimeout(() => {
          const counts: Record<ModeId, number> = { genesis: 0, revelation: 0, ascension: 0 };
          newAnswers.forEach((ai, qi) => {
            if (QUIZ_QUESTIONS[qi]) counts[QUIZ_QUESTIONS[qi].options[ai].weight]++;
          });
          // Add current answer (since it's not in state yet fully if we used state, but we used local var)
          // Actually, we already pushed to newAnswers.
          
          // Simple majority
          const result = (Object.entries(counts) as [ModeId, number][]).sort((a, b) => b[1] - a[1])[0][0];
          setQuizResult(result);
          setModeId(result);
          setIsCalculating(false);
        }, 2000);
      } else {
        setQuizStep(nextStep);
        setSelectedOption(null);
      }
    }, 700); // 700ms delay to see the selection glow
  }, [quizStep, quizAnswers, selectedOption]);

  const startQuiz = useCallback(() => {
    setQuizStep(1);
    setQuizAnswers([]);
    setQuizResult(null);
    setSelectedOption(null);
    setIsCalculating(false);
  }, []);

  const controlPanelOpacity = useTransform(scrollY, [600, 900], [0, 1]);
  const quizHintOpacity = useTransform(scrollY, [2800, 3200], [1, 0]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      <FontStyles />

      {/* ── Mic Prompt Overlay ── */}
      <AnimatePresence>
        {showMicPrompt && !audioReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] max-w-none opacity-[0.18]"
                style={{
                  maskImage: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 40%, transparent 65%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 40%, transparent 65%)',
                }}>
                <Image
                  src="/images/mushroom-cluster.jpg"
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              {/* Warm ethereal glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[50vh] rounded-full opacity-[0.08]"
                style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.5) 0%, transparent 60%)' }} />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: 0.2, duration: 0.8, ease: TRANSITION_EASE }}
              className="relative z-10 flex flex-col items-center text-center px-4 sm:px-8 max-w-md"
            >
              <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-6 tracking-[0.15em]">
                Find Your Frequency
              </h2>
              <p className="text-white/70 text-base font-light leading-loose mb-12 max-w-sm">
                This experience reacts to your voice and the sounds around you. Enable your microphone to bring the field to life.
              </p>

              <button
                onClick={handleEnableAudio}
                className="group relative w-28 h-28 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-xl flex items-center justify-center hover:border-white/60 hover:bg-white/10 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label="Enable Audio Experience"
              >
                <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-white/60 group-hover:text-white transition-colors font-medium">Enable</span>
                </div>
              </button>

              <button
                onClick={handleDismissPrompt}
                className="text-white/50 hover:text-white/80 text-xs uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-sm p-1"
              >
                Continue without audio →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WebGL Canvas (GPGPU Particles) ── */}
      <div className="fixed inset-0 z-[2] pointer-events-none">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 10], fov: 60 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <Suspense fallback={null}>
            <GPGPUParticles 
              count={256} // 256x256 = 65,536 particles
              size={1.5}
              color1={MODES[modeId].color1}
              color2={MODES[modeId].color2}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Full-screen mushroom backdrop (BEHIND the WebGL canvas) ── */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        {/* Black base */}
        <div className="absolute inset-0 bg-black" />
        
        {/* Main mushroom — full viewport, centered, slowly breathing */}
        <div className="absolute top-1/2 left-1/2 animate-slow-drift w-[130vw] h-[130vh] max-w-none opacity-[0.35]"
            style={{
              maskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
            }}>
          <Image 
            src="/images/mushroom-cluster.jpg" 
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>

        {/* Ethereal glow behind mushroom */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.4) 0%, rgba(140,100,60,0.15) 35%, transparent 70%)' }} />
        
        {/* Secondary warm glow — lower */}
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vh] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.3) 0%, transparent 60%)' }} />

        {/* Smoke atmospheric layer — breathing */}
        <div className="absolute inset-0 w-full h-full animate-ethereal-pulse"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.4) 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          }}>
          <Image 
            src="/images/mushroom-smoke.jpg" 
            alt="" 
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>

        {/* Plant-dark side accents */}
        <div className="absolute left-0 top-0 h-full w-[25vw] opacity-[0.04]" 
          style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
          <Image src="/images/plant-dark.jpg" alt="" fill className="object-cover" sizes="25vw" />
        </div>
        <div className="absolute right-0 top-0 h-full w-[25vw] opacity-[0.04] scale-x-[-1]"
          style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
          <Image src="/images/plant-dark.jpg" alt="" fill className="object-cover" sizes="25vw" />
        </div>

        {/* Vignette overlay */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
      </div>

      {/* ── Dark gradient overlay for product section ── */}
      <motion.div style={{ opacity: bgOpacity }} className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/80" />
      </motion.div>

      {/* ── Navigation ── */}
      <nav className={clsx(
        "fixed top-0 left-0 w-full z-50 transition-all duration-500 flex justify-between items-center px-6 md:px-12",
        scrolled ? "bg-black/50 backdrop-blur-md border-b border-white/10 py-4" : "bg-transparent py-6"
      )}>
        <Link href="/" className="hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-sm p-1" aria-label="Main Menu"><Menu className="w-6 h-6" /></Link>
        <div className={clsx("absolute left-1/2 -translate-x-1/2 transition-opacity duration-700", scrolled ? "opacity-100" : "opacity-0")}>
          <span className="font-cinzel text-lg tracking-[0.25em] font-medium text-white/90">FREQUENCY</span>
        </div>
        <div className="flex gap-8 items-center">
          <button 
            onClick={handleEnableAudio} 
            className="relative focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-full p-1" 
            title="Enable microphone"
            aria-label="Enable microphone"
          >
            <WaveIcon active={audioReady} />
          </button>
          <button className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-sm p-1" aria-label="Cart">
            <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors cursor-pointer" />
          </button>
        </div>
      </nav>

      {/* ═══ SECTION 1: Hero — Lines morph into Field as you scroll ═══ */}
      <section className="relative h-[160vh] w-full snap-start">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none z-[5]">
          {/* Typography — "God is Frequency" — fades out and drifts up on scroll */}
          <motion.div
            className="relative z-10 text-center select-none"
            style={{ opacity: textOpacity, y: textY }}
          >
            <h1 className="flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.8, y: 0 }}
                transition={{ delay: 0.3, duration: 1.0, ease: TRANSITION_EASE }}
                className="text-3xl md:text-5xl tracking-[0.35em] uppercase text-white/90 font-cinzel block mb-4"
                style={{ fontWeight: 300 }}
              >
                God is
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 40, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.6, duration: 1.4, ease: TRANSITION_EASE }}
                className="font-playfair italic text-6xl sm:text-8xl md:text-[11rem] leading-[0.85] text-white tracking-tighter"
                style={{ textShadow: '0 0 80px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.1)' }}
              >
                Frequency
              </motion.span>
            </h1>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="absolute bottom-10 flex flex-col items-center gap-2 z-20"
            style={{ opacity: textOpacity } as any}
          >
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-cinzel">Scroll to Enter the Field</span>
            <ChevronDown className="w-4 h-4 text-white/30 animate-gentle-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 2: Field + Controls (Chladni Plate) ═══ */}
      <section className="relative z-[10] min-h-screen w-full flex flex-col justify-end pb-12 px-6 snap-start">
        <motion.div style={{ opacity: controlPanelOpacity }} className="max-w-4xl mx-auto w-full">
          <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex flex-wrap justify-center gap-4">
                {(Object.values(MODES) as (typeof MODES[ModeId])[]).map((m) => (
                  <GlassButton key={m.id} onClick={() => setModeId(m.id as ModeId)} active={modeId === m.id} className="px-6 py-4 min-w-[120px] group">
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-serif italic text-white">{m.hz}</span>
                      <span className="text-[9px] uppercase tracking-widest text-white/40 mt-1 group-hover:text-white/60 transition-colors">{m.label}</span>
                    </div>
                    {modeId === m.id && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />}
                  </GlassButton>
                ))}
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Activity className={`w-4 h-4 ${audioReady ? 'text-[#D4AF37] animate-pulse' : 'text-white/20'}`} />
                <span className="text-[10px] uppercase tracking-widest text-white/30">{audioReady ? 'Listening' : 'Tap mic to activate'}</span>
              </div>
            </div>
          </div>
        </motion.div>
        <div className="mt-12 text-center">
          <p className="text-[9px] text-white/30 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
        </div>
      </section>

      {/* ═══ SECTION 2.5: Mushroom Smoke Divider — Ethereal Transition ═══ */}
      <div className="h-[4vh]" aria-hidden="true" />
      <motion.section 
        initial={{ opacity: 0 }} 
        whileInView={{ opacity: 1 }} 
        viewport={{ once: true, margin: "-10%" }} 
        transition={{ duration: 1.2, ease: TRANSITION_EASE }}
        className="relative z-10 w-full overflow-hidden"
      >
        <div className="relative w-full aspect-[16/9] md:aspect-[16/6]">
          <Image
            src="/images/mushroom-smoke.jpg"
            alt=""
            fill
            className="object-cover object-center opacity-35"
            sizes="100vw"
          />
          {/* Ethereal center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[80%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.4) 0%, transparent 70%)' }} />
          <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black via-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black to-transparent" />
        </div>
      </motion.section>

      {/* ═══ SECTION 3: Find Your Frequency Quiz ═══ */}
      <div className="h-[6vh]" aria-hidden="true" />
      <section className="relative z-10 w-full min-h-screen flex items-center justify-center py-24 snap-start">
        <div className="max-w-2xl mx-auto px-6 w-full">
          <AnimatePresence mode="wait">
            {quizStep === 0 && (
              <motion.div
                key="quiz-intro"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-center"
              >
                {/* Full-width cinematic mushroom hero */}
                <div className="relative w-screen -mx-6 mb-10 overflow-hidden" style={{ maxWidth: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
                  <div className="relative w-full aspect-[16/8] md:aspect-[16/6] overflow-hidden">
                    <Image
                      src="/images/mushroom-cluster.jpg"
                      alt="Ethereal mushroom cluster glowing in a dark void"
                      fill
                      className="object-cover object-center"
                      sizes="100vw"
                    />
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black via-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />
                    <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black/60 to-transparent" />
                    <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/60 to-transparent" />
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60%] h-[60%] bg-white/[0.04] blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 inset-x-0 pb-12 pt-32 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col items-center">
                      <h2 className="font-cinzel text-3xl md:text-5xl text-white mb-6 tracking-[0.1em] drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
                        Find Your Frequency
                      </h2>
                      <p className="text-white/70 text-base leading-loose mb-10 max-w-lg mx-auto px-6 font-light">
                        Every body vibrates at its own frequency. Answer three questions to discover which resonance your system needs most.
                      </p>
                      <button
                        onClick={startQuiz}
                        className="group w-full sm:w-auto bg-white/5 border border-white/25 backdrop-blur-xl text-white px-10 py-4 rounded-full font-medium hover:bg-white/10 hover:border-white/40 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      >
                        <span className="flex items-center justify-center gap-3">
                          Begin the Ritual
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {quizStep >= 1 && quizStep <= QUIZ_QUESTIONS.length && (
              <motion.div
                key={`quiz-q${quizStep}`}
                initial={{ opacity: 0, x: 20, filter: 'blur(5px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(5px)' }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center w-full"
              >
                <div className="flex items-center justify-center gap-3 mb-12">
                  {QUIZ_QUESTIONS.map((_, i) => (
                    <motion.div 
                      key={i} 
                      className="h-[3px] sm:h-[2px] rounded-full"
                      initial={false}
                      animate={{
                        backgroundColor: i < quizStep ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.15)",
                        width: i === quizStep - 1 ? 64 : 48
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  ))}
                </div>

                <span className="text-xs uppercase tracking-[0.3em] text-white/50 font-cinzel block mb-8">
                  Question {quizStep} of {QUIZ_QUESTIONS.length}
                </span>

                <h3 className="font-playfair italic text-3xl md:text-4xl text-white mb-14 leading-relaxed tracking-tight min-h-[80px] flex items-center justify-center">
                  {QUIZ_QUESTIONS[quizStep - 1].question}
                </h3>

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  {QUIZ_QUESTIONS[quizStep - 1].options.map((opt, i) => {
                    const isSelected = selectedOption === i;
                    const isOtherSelected = selectedOption !== null && selectedOption !== i;
                    
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ 
                          opacity: isOtherSelected ? 0.4 : 1,
                          y: 0,
                          scale: isSelected ? 1.02 : 1,
                          borderColor: isSelected ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.1)",
                          backgroundColor: isSelected ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)"
                        }}
                        transition={{ duration: 0.3 }}
                        onClick={() => handleQuizAnswer(i, opt.weight)}
                        disabled={selectedOption !== null}
                        className={clsx(
                          "group w-full text-left backdrop-blur-xl rounded-2xl px-6 py-5 min-h-[64px] border relative overflow-hidden transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                          !isSelected && !isOtherSelected && "hover:bg-white/[0.06] hover:border-[#D4AF37]/30 hover:shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                        )}
                      >
                         {isSelected && (
                          <motion.div
                            layoutId="selection-glow"
                            className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/20 to-transparent opacity-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                        <div className="flex items-center gap-5 relative z-10">
                          <span className={clsx("text-2xl transition-transform duration-300", isSelected ? "scale-110" : "group-hover:scale-110")}>{opt.icon}</span>
                          <span className={clsx("text-sm sm:text-base transition-colors duration-300 font-light", isSelected ? "text-white font-medium" : "text-white/80 group-hover:text-white")}>
                            {opt.text}
                          </span>
                          {isSelected && (
                            <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="ml-auto text-[#D4AF37]"
                            >
                              <Check className="w-5 h-5" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {isCalculating && (
               <motion.div
                key="calculating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                transition={{ duration: 0.8 }}
                className="text-center py-20"
              >
                 <motion.div 
                  className="w-24 h-24 mx-auto mb-8 rounded-full border border-white/10 flex items-center justify-center relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                 >
                    <div className="absolute inset-0 border-t border-white/50 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-2 border-b border-[#D4AF37]/50 rounded-full animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                    <Sparkles className="w-8 h-8 text-white/40 animate-pulse" />
                 </motion.div>
                 <motion.h3 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-cinzel text-xl text-white tracking-[0.2em] animate-pulse"
                >
                   Calibrating...
                 </motion.h3>
              </motion.div>
            )}

            {!isCalculating && quizStep > QUIZ_QUESTIONS.length && quizResult && (
              <motion.div
                key="quiz-result"
                initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.2, ease: TRANSITION_EASE }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -180 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.3, duration: 1.0, type: "spring", bounce: 0.5 }}
                  className="mb-8 relative inline-block"
                >
                  <div className="absolute inset-0 bg-[#D4AF37]/20 blur-[40px] rounded-full animate-pulse" />
                  <span className="text-7xl relative z-10">
                    {quizResult === 'genesis' ? '🌿' : quizResult === 'revelation' ? '💎' : '⚡'}
                  </span>
                </motion.div>

                <span className="text-xs uppercase tracking-[0.3em] text-white/40 font-cinzel block mb-6">
                  Your Frequency
                </span>

                <h3 className="font-cinzel text-5xl md:text-6xl text-white mb-4 tracking-[0.1em] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {MODES[quizResult].hz}
                </h3>
                <p className="font-playfair italic text-2xl text-white/70 mb-8">
                  {MODES[quizResult].label}
                </p>

                <p className="text-white/60 text-lg font-light leading-loose max-w-lg mx-auto mb-12">
                  {quizResult === 'genesis' && "Your system craves grounding. The 432Hz frequency — the heartbeat of the Earth — will bring you back to center. This is the frequency of calm, of roots, of remembering what matters."}
                  {quizResult === 'revelation' && "Your mind needs clarity. The 528Hz frequency — the Love frequency — cuts through fog and restores natural harmony. This is the frequency of transformation and DNA repair."}
                  {quizResult === 'ascension' && "Your spirit is ready to expand. The 963Hz frequency — the Crown frequency — activates higher consciousness and opens the gate to your full potential."}
                </p>

                <p className="text-white/30 text-xs mb-12">The field above has shifted to your frequency. Look up.</p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5, duration: 0.8 }}
                  style={{ opacity: quizHintOpacity }}
                >
                  <ChevronDown className="w-5 h-5 text-white/25 animate-gentle-bounce mx-auto" />
                  <span className="text-[9px] uppercase tracking-widest text-white/20 font-cinzel mt-2 block">
                    Scroll to your remedy
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ═══ SECTION 4: The Sonic Infusion ═══ */}
      <div className="h-[4vh]" aria-hidden="true" />
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 1 }}
        className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/30 backdrop-blur-sm snap-center">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-8 tracking-[0.2em] uppercase">The Sonic Infusion</h2>
          <p className="font-playfair text-2xl md:text-4xl text-white/80 leading-relaxed italic mb-16 font-light">
            &quot;The Mushrooms don&apos;t Work for Us. We Work for Them.&quot;
          </p>
          <motion.div 
            className="grid md:grid-cols-3 gap-8 text-left"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-10%" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1, 
                transition: { staggerChildren: 0.2 } 
              }
            }}
          >
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: TRANSITION_EASE } } }}
              className="space-y-4"
            >
              <Waves className="w-8 h-8 text-mycelium-gold" />
              <h3 className="font-serif text-lg text-white">Grown as Medicine</h3>
              <p className="text-base font-light text-white/70 leading-relaxed">Fungi are sentient beings. We treat them with reverence, growing them in clean, high-vibration spaces.</p>
            </motion.div>
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: TRANSITION_EASE } } }}
              className="space-y-4"
            >
              <Disc className="w-8 h-8 text-mycelium-gold" />
              <h3 className="font-serif text-lg text-white">432Hz Infusion</h3>
              <p className="text-base font-light text-white/70 leading-relaxed">Every stage of cultivation is immersed in Solfeggio tones, chants, and nature sounds to harmonize the biological structure.</p>
            </motion.div>
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: TRANSITION_EASE } } }}
              className="space-y-4"
            >
              <Sprout className="w-8 h-8 text-mycelium-gold" />
              <h3 className="font-serif text-lg text-white">Nature & Nurture</h3>
              <p className="text-base font-light text-white/70 leading-relaxed">&quot;Same genetics, different frequency = different outcome.&quot; We refine unique strains through our in-house cultivation.</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══ SECTION 5: Product ═══ */}
      <div className="h-[4vh]" aria-hidden="true" />
      <section className="relative z-10 w-full min-h-screen snap-start">
        <div className="md:grid md:grid-cols-2 min-h-screen">
          <div className="sticky top-0 h-screen hidden md:flex items-center justify-center">
            <ProductBottle />
            {/* Ethereal glow accent near bottle */}
            <div className="absolute bottom-[15%] left-[15%] w-48 h-48 rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%)' }} />
          </div>
          <div className="md:hidden py-8 px-4"><ProductBottle /></div>
          <div className="px-6 py-16 md:py-32 md:px-16 flex flex-col justify-center max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className="flex text-[#D4AF37] gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">142 Reviews</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-playfair mb-8 leading-[1.05] text-white tracking-tight drop-shadow-2xl">
              {quizResult === 'revelation' ? 'Clarity Dose' : quizResult === 'ascension' ? 'Ascend Dose' : 'Calm Dose'}
              <span className="text-[#D4AF37]">.</span>
            </h2>

            <p className="text-lg md:text-xl text-white/80 leading-relaxed mb-8 font-light max-w-lg">
              {quizResult === 'revelation' 
                ? 'A precision-formulated nootropic blend to sharpen focus and dissolve mental fog.'
                : quizResult === 'ascension'
                ? 'An expansion-catalyst blend to unlock energy, creativity, and higher awareness.'
                : 'A wellness supplement formulated with functional mushroom fruiting bodies to support everyday calm and balance.'}
            </p>

            <div className="inline-block px-4 py-2 border border-white/10 rounded-full bg-white/5 mb-12 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-medium">
                Grown in <span className="text-white">{quizResult ? MODES[quizResult].hz : '432 Hz'}</span> sound chamber
              </p>
            </div>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-12">
              {["Anxiety Relief","Mental Clarity","Sleep Support","100% Organic"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-white/90 font-light">
                  <div className="w-5 h-5 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] bg-[#D4AF37]/5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  {item}
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 mb-10 pt-4">
              <Accordion title="Ingredients">
                <ul className="list-disc pl-4 space-y-2 text-sm text-white/70 font-light">
                  <li><strong className="text-white font-medium">Active:</strong> Lion&apos;s Mane (fruiting body), Reishi (fruiting body), Cordyceps (fruiting body)</li>
                  <li><strong className="text-white font-medium">Other:</strong> Vegan capsule (plant-based cellulose)</li>
                </ul>
              </Accordion>
              <Accordion title="Dosage Ritual">
                <p className="text-sm text-white/70 font-light leading-relaxed">
                  We recommend you take 1 a day, in the morning, for a <strong className="text-white font-medium">two-day on, two-day off protocol</strong> to maximize the long-term benefits.
                </p>
              </Accordion>
              <Accordion title="The Frequency Difference">
                <p className="text-sm text-white/70 font-light leading-relaxed">
                  Grown in 432Hz (The Miracle Tone). We imbue the biological structure with inherent harmonic stability.
                </p>
              </Accordion>
            </div>

            <PurchaseWidget />
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-16 md:py-24 border-t border-white/5 bg-black text-center">
        <div className="max-w-4xl mx-auto px-6 flex flex-col items-center gap-8">
          <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
             <span className="font-cinzel text-lg tracking-[0.2em] text-white">FREQUENCY</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs md:text-sm font-light text-white/60">
            <Link href="#" className="hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-sm px-1">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-sm px-1">Terms of Service</Link>
            <Link href="#" className="hover:text-[#D4AF37] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37] rounded-sm px-1">Contact Us</Link>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <p className="text-xs text-[#D4AF37]/60 font-serif italic">
              © 2026 Frequency. All rights reserved.
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              Designed by <span className="text-white/50">Empathy Labs</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
