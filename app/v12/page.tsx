"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Activity } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';
import { useMicAudio } from '@/hooks/useMicAudio';
import { useTrailerAudio } from '@/hooks/useTrailerAudio';

// ── Extracted modules ──
import { MODES, type ModeId, Spring, smoothstep, QUIZ_QUESTIONS } from './config';
import {
  unifiedVertexShader, unifiedFragmentShader,
  etherVertexShader, etherFragmentShader,
} from './shaders/unified';
import {
  FontStyles, WaveIcon, GlassButton, ProductBottle,
  Accordion, PurchaseWidget, SonicInfusionSection,
} from './components/UIComponents';
import TrailerIntro from './components/TrailerIntro';

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function V12Page() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [modeId, setModeId] = useState<ModeId>('genesis');
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<ModeId | null>(null);

  // ── Intro phase state machine ──
  // 'waiting' → user sees play/skip screen
  // 'playing' → trailer audio is playing with subtitles
  // 'done'    → trailer finished or skipped, main experience active
  const [introPhase, setIntroPhase] = useState<'waiting' | 'playing' | 'done'>('waiting');

  // ── Audio hooks ──
  const micAudio = useMicAudio();
  const trailerAudio = useTrailerAudio();

  // When trailer ends, transition to 'done' and enable mic
  useEffect(() => {
    if (introPhase === 'playing' && trailerAudio.isEnded) {
      setIntroPhase('done');
    }
  }, [introPhase, trailerAudio.isEnded]);

  // Use trailer audio during playback, mic audio after
  const getActiveFrequencyData = useCallback(() => {
    if (introPhase === 'playing' && trailerAudio.isPlaying) {
      return trailerAudio.getFrequencyData();
    }
    return micAudio.getFrequencyData();
  }, [introPhase, trailerAudio, micAudio]);

  const audioIsActive = introPhase === 'playing' ? trailerAudio.isPlaying : micAudio.isReady;

  // ── Intro handlers ──
  const handlePlay = useCallback(async () => {
    setIntroPhase('playing');
    trailerAudio.startTrailer();
  }, [trailerAudio]);

  const handleIntroDone = useCallback(() => {
    trailerAudio.skipTrailer();
    setIntroPhase('done');
  }, [trailerAudio]);

  const handleEnableAudio = useCallback(() => {
    micAudio.startAudio();
  }, [micAudio]);

  // Text scroll transforms
  const textOpacity = useTransform(scrollY, [0, 150], [1, 0]);
  const textY = useTransform(scrollY, [0, 400], [0, -120]);
  const textClip = useTransform(scrollY, [0, 200], ["inset(0% 0 0 0)", "inset(100% 0 0 0)"]);

  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    composer?: EffectComposer;
    bloomPass?: UnrealBloomPass;
    fieldMaterial?: THREE.ShaderMaterial;
    fieldPoints?: THREE.Points;
    etherMaterial?: THREE.ShaderMaterial;
    etherPoints?: THREE.Points;
  }>({});

  const physicsRef = useRef({
    bass: new Spring(0), mid: new Spring(0), high: new Spring(0), vol: new Spring(0),
    morph: new Spring(0),
    n: new Spring(MODES.genesis.n), m: new Spring(MODES.genesis.m),
    color1r: new Spring(MODES.genesis.color1[0]), color1g: new Spring(MODES.genesis.color1[1]), color1b: new Spring(MODES.genesis.color1[2]),
    color2r: new Spring(MODES.genesis.color2[0]), color2g: new Spring(MODES.genesis.color2[1]), color2b: new Spring(MODES.genesis.color2[2]),
    bgr: new Spring(MODES.genesis.bg[0]), bgg: new Spring(MODES.genesis.bg[1]), bgb: new Spring(MODES.genesis.bg[2]),
  });

  const stateRef = useRef({ modeId: 'genesis' as ModeId, startTime: 0, disposed: false });

  const bgOpacity = useTransform(scrollY, [1500, 2500], [0, 1]);

  // ─── Three.js Setup ───
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 1.5));
    container.appendChild(renderer.domElement);

    // ── UNIFIED PARTICLE SYSTEM ──
    const fieldGeo = new THREE.PlaneGeometry(8, 8, isMobile ? 120 : 220, isMobile ? 120 : 220);
    const fieldMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:        { value: 0 },
        uBass:        { value: 0 },
        uMid:         { value: 0 },
        uHigh:        { value: 0 },
        uVolume:      { value: 0 },
        uMorph:       { value: 0 },
        uFadeIn:      { value: 0 },
        uAudioActive: { value: 0 },
        uN:           { value: MODES.genesis.n },
        uM:           { value: MODES.genesis.m },
        uShapeFn:     { value: 0 },
        uColor1:      { value: new THREE.Vector3(...MODES.genesis.color1) },
        uColor2:      { value: new THREE.Vector3(...MODES.genesis.color2) },
      },
      vertexShader: unifiedVertexShader,
      fragmentShader: unifiedFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const fieldPoints = new THREE.Points(fieldGeo, fieldMat);
    fieldPoints.rotation.x = -0.2;
    scene.add(fieldPoints);

    // ── Ether Background Particles ──
    const etherCount = 3000;
    const etherPos = new Float32Array(etherCount * 3);
    const etherRnd = new Float32Array(etherCount * 3);
    for (let i = 0; i < etherCount; i++) {
      etherPos[i*3]=(Math.random()-0.5)*14; etherPos[i*3+1]=(Math.random()-0.5)*10; etherPos[i*3+2]=(Math.random()-0.5)*6;
      etherRnd[i*3]=Math.random(); etherRnd[i*3+1]=Math.random(); etherRnd[i*3+2]=Math.random();
    }
    const etherGeo = new THREE.BufferGeometry();
    etherGeo.setAttribute('position', new THREE.BufferAttribute(etherPos, 3));
    etherGeo.setAttribute('aRandom', new THREE.BufferAttribute(etherRnd, 3));
    const etherMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:  { value: 0 },
        uMorph: { value: 0 },
        uMid:   { value: 0 },
        uColor: { value: new THREE.Vector3(...MODES.genesis.color2) },
      },
      vertexShader: etherVertexShader,
      fragmentShader: etherFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const etherPoints = new THREE.Points(etherGeo, etherMat);
    scene.add(etherPoints);

    // ── Post-processing: UnrealBloomPass ──
    const w = window.innerWidth;
    const h = window.innerHeight;
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.18, 0.4, 0.85);
    composer.addPass(bloomPass);

    sceneRef.current = { renderer, scene, camera, composer, bloomPass, fieldMaterial: fieldMat, fieldPoints, etherMaterial: etherMat, etherPoints };
    stateRef.current.startTime = performance.now();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (sceneRef.current.composer) {
        sceneRef.current.composer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      stateRef.current.disposed = true;
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, []);

  // ─── Animation Loop ───
  useEffect(() => {
    let frameId: number;

    const animate = () => {
      if (stateRef.current.disposed) return;
      const s = sceneRef.current;
      if (!s.renderer || !s.scene || !s.camera) return;

      const elapsed = (performance.now() - stateRef.current.startTime) * 0.001;
      const scroll = window.scrollY / window.innerHeight;

      const mode = MODES[stateRef.current.modeId];
      const p = physicsRef.current;

      // ── Audio (from whichever source is active) ──
      const audio = getActiveFrequencyData();
      const tension = mode.tension;
      const friction = mode.friction;
      const bass = p.bass.update(audio.bass, tension, friction);
      const mid  = p.mid.update(audio.mid, tension, friction);
      const high = p.high.update(audio.high, tension, friction);
      const vol  = p.vol.update((audio.bass + audio.mid + audio.high) / 3, tension, friction);

      const ambientVol = Math.sin(elapsed * 1.5) * 0.04 + 0.07;
      const ambientMid = Math.cos(elapsed * 1.2) * 0.04;
      const effectiveVol = Math.max(vol, ambientVol);
      const effectiveMid = audioIsActive ? mid : Math.max(mid, ambientMid + 0.05);

      // ── Morph: scroll-driven, spring-smoothed ──
      const morphTarget = smoothstep(0.3, 0.7, scroll);
      const morph = p.morph.update(morphTarget, 0.12, 0.82);

      // ── Smooth mode transitions via springs ──
      const sn  = p.n.update(mode.n, 0.08, 0.85);
      const sm  = p.m.update(mode.m, 0.08, 0.85);
      const c1r = p.color1r.update(mode.color1[0], 0.04, 0.88);
      const c1g = p.color1g.update(mode.color1[1], 0.04, 0.88);
      const c1b = p.color1b.update(mode.color1[2], 0.04, 0.88);
      const c2r = p.color2r.update(mode.color2[0], 0.04, 0.88);
      const c2g = p.color2g.update(mode.color2[1], 0.04, 0.88);
      const c2b = p.color2b.update(mode.color2[2], 0.04, 0.88);
      const br  = p.bgr.update(mode.bg[0], 0.04, 0.88);
      const bgv = p.bgg.update(mode.bg[1], 0.04, 0.88);
      const bb  = p.bgb.update(mode.bg[2], 0.04, 0.88);

      // ── Fade in over first 2s ──
      const fadeIn = Math.min(elapsed / 2.0, 1.0);

      // ── Update Unified Field ──
      if (s.fieldMaterial) {
        const fu = s.fieldMaterial.uniforms;
        fu.uTime.value = elapsed;
        fu.uBass.value = bass;
        fu.uMid.value = effectiveMid;
        fu.uHigh.value = high;
        fu.uVolume.value = effectiveVol;
        fu.uMorph.value = morph;
        fu.uFadeIn.value = fadeIn;
        fu.uAudioActive.value = audioIsActive ? 1.0 : 0.0;
        fu.uN.value = sn;
        fu.uM.value = sm;
        fu.uShapeFn.value = mode.shapeFn;
        fu.uColor1.value.set(c1r, c1g, c1b);
        fu.uColor2.value.set(c2r, c2g, c2b);
      }

      // ── Update Ether ──
      if (s.etherMaterial) {
        s.etherMaterial.uniforms.uTime.value = elapsed;
        s.etherMaterial.uniforms.uMorph.value = morph;
        s.etherMaterial.uniforms.uMid.value = effectiveMid;
        s.etherMaterial.uniforms.uColor.value.set(c2r, c2g, c2b);
      }

      // ── Background color ──
      if (s.scene && s.scene.background instanceof THREE.Color) {
        s.scene.background.setRGB(br * morph, bgv * morph, bb * morph);
      }

      // ── Camera ──
      if (s.camera) {
        s.camera.position.z = 7.0 - morph * 1.5;
        s.camera.rotation.x = -morph * 0.35;
      }

      if (s.bloomPass) {
        s.bloomPass.strength = 0.15 + vol * 0.15;
      }

      if (s.composer) {
        s.composer.render();
      } else {
        s.renderer.render(s.scene, s.camera);
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [audioIsActive, getActiveFrequencyData]);

  // Sync modeId to ref
  useEffect(() => { stateRef.current.modeId = modeId; }, [modeId]);

  // Scrolled state for nav
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleQuizAnswer = useCallback((answerIndex: number, weight: ModeId) => {
    const newAnswers = [...quizAnswers, answerIndex];
    setQuizAnswers(newAnswers);
    const nextStep = quizStep + 1;

    if (nextStep > QUIZ_QUESTIONS.length) {
      const counts: Record<ModeId, number> = { genesis: 0, revelation: 0, ascension: 0 };
      quizAnswers.forEach((ai, qi) => {
        if (QUIZ_QUESTIONS[qi]) counts[QUIZ_QUESTIONS[qi].options[ai].weight]++;
      });
      counts[weight]++;

      const result = (Object.entries(counts) as [ModeId, number][]).sort((a, b) => b[1] - a[1])[0][0];
      setQuizResult(result);
      setModeId(result);
    }
    setQuizStep(nextStep);
  }, [quizStep, quizAnswers]);

  const startQuiz = useCallback(() => {
    setQuizStep(1);
    setQuizAnswers([]);
    setQuizResult(null);
  }, []);

  const controlPanelOpacity = useTransform(scrollY, [600, 900], [0, 1]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-x-hidden">
      <FontStyles />

      {/* ── Trailer Intro Overlay ── */}
      <TrailerIntro
        phase={introPhase}
        onPlay={handlePlay}
        onDone={handleIntroDone}
        trailerAudio={trailerAudio}
      />

      {/* ── WebGL Canvas (behind all content, above ambient imagery) ── */}
      <div ref={canvasContainerRef} className="fixed inset-0 z-[2] pointer-events-none" />

      {/* ── Dark mushroom imagery (ambient background layers) ── */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full w-[30vw] opacity-[0.06] relative"
          style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        >
          <Image
            src="/images/plant-dark.jpg"
            alt=""
            fill
            sizes="30vw"
            className="object-cover"
          />
        </div>
        <div
          className="absolute right-0 top-0 h-full w-[30vw] opacity-[0.06] scale-x-[-1] relative"
          style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        >
          <Image
            src="/images/mushroom-smoke.jpg"
            alt=""
            fill
            sizes="30vw"
            className="object-cover"
          />
        </div>
      </div>

      {/* ── Dark gradient overlay for product section ── */}
      <motion.div style={{ opacity: bgOpacity }} className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black/70" />
      </motion.div>

      {/* ── Navigation ── */}
      <nav className={clsx(
        "fixed top-0 left-0 w-full z-50 transition-all duration-500 flex justify-between items-center px-6 md:px-12",
        scrolled ? "bg-black/50 backdrop-blur-md border-b border-white/10 py-4" : "bg-transparent py-6"
      )}>
        <Link href="/" className="hover:text-white/70 transition-colors"><Menu className="w-6 h-6" /></Link>
        <div className={clsx("absolute left-1/2 -translate-x-1/2 transition-opacity duration-700", scrolled ? "opacity-100" : "opacity-0")}>
          <span className="font-cinzel text-lg tracking-[0.2em] font-bold">FREQUENCY</span>
        </div>
        <div className="flex gap-8 items-center">
          <button onClick={handleEnableAudio} className="relative" title="Enable microphone">
            <WaveIcon active={micAudio.isReady} />
          </button>
          <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors cursor-pointer" />
        </div>
      </nav>

      {/* ═══ SECTION 1: Hero — Lines morph into Field as you scroll ═══ */}
      <section className="relative h-[200vh] w-full">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none z-[5]">
          <motion.div
            className="relative z-10 text-center select-none"
            style={{ opacity: textOpacity, y: textY, clipPath: textClip }}
          >
            <motion.h1
              className="flex flex-col items-center"
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ delay: 3.5, duration: 4, ease: "easeInOut", repeat: Infinity }}
            >
              <span className="flex items-center justify-center gap-[0.3em] mb-3">
                {["God", "is"].map((word, wi) => (
                  <motion.span
                    key={word}
                    initial={{ opacity: 0, y: 15, letterSpacing: '0.3em' }}
                    animate={{ opacity: 0.7, y: 0, letterSpacing: '0.15em' }}
                    transition={{ delay: 1.0 + wi * 0.2, duration: 1.5, ease: "easeOut" }}
                    className="text-4xl md:text-6xl font-light uppercase text-white font-cinzel"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <span className="flex items-center justify-center">
                {"Frequency".split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, filter: 'blur(20px)', y: 40 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    transition={{ delay: 2.0 + i * 0.07, duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
                    className="font-playfair italic text-[10vw] sm:text-6xl md:text-[10rem] leading-none metal-text drop-shadow-[0_0_60px_rgba(255,255,255,0.3)]"
                  >
                    {char}
                  </motion.span>
                ))}
              </span>
            </motion.h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4.5, duration: 1 }}
            className="absolute bottom-10 flex flex-col items-center gap-2 z-20"
            style={{ opacity: textOpacity } as any}
          >
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-cinzel">Scroll to Enter the Field</span>
            <ChevronDown className="w-4 h-4 text-white/30 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 2: Field + Controls (Chladni Plate) ═══ */}
      <section className="relative z-[10] min-h-screen w-full flex flex-col justify-end pb-12 px-6">
        <motion.div style={{ opacity: controlPanelOpacity }} className="max-w-4xl mx-auto w-full">
          <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-[32px] p-8 shadow-celestial relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex flex-wrap justify-center gap-4">
                {(Object.values(MODES) as (typeof MODES[ModeId])[]).map((m) => (
                  <GlassButton key={m.id} onClick={() => setModeId(m.id as ModeId)} active={modeId === m.id} className="px-6 py-4 min-w-[120px]">
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-serif italic text-white">{m.hz}</span>
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">{m.label}</span>
                    </div>
                    {modeId === m.id && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />}
                  </GlassButton>
                ))}
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Activity className={`w-4 h-4 ${micAudio.isReady ? 'text-white animate-pulse' : 'text-gray-600'}`} />
                <span className="text-[10px] uppercase tracking-widest text-gray-500">{micAudio.isReady ? 'Listening' : 'Tap mic to activate'}</span>
              </div>
            </div>
          </div>
        </motion.div>
        <div className="mt-12 text-center">
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
        </div>
      </section>

      {/* ═══ SECTION 2.5: Mushroom Smoke Divider ═══ */}
      <section className="relative z-10 w-full overflow-hidden">
        <motion.div
          className="relative w-full aspect-[16/6] md:aspect-[16/4]"
          initial={{ scale: 1.0 }}
          whileInView={{ scale: 1.15 }}
          transition={{ duration: 2, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          <Image
            src="/images/mushroom-smoke.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center opacity-60"
          />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-black to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black/80 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/80 to-transparent" />
        </motion.div>
      </section>

      {/* ═══ SECTION 3: Find Your Frequency Quiz ═══ */}
      <section className="relative z-10 w-full min-h-screen flex items-center justify-center py-24">
        <div className="max-w-2xl mx-auto px-6 w-full">
          <AnimatePresence mode="wait">
            {quizStep === 0 && (
              <motion.div
                key="quiz-intro"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
                className="text-center"
              >
                <div className="relative w-screen -mx-6 mb-16 overflow-hidden" style={{ maxWidth: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
                  <div className="relative w-full aspect-[16/10] md:aspect-[16/7] overflow-hidden">
                    <Image
                      src="/images/mushroom-cluster.jpg"
                      alt=""
                      fill
                      sizes="100vw"
                      className="object-cover object-center"
                    />
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black via-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent" />
                    <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-black/60 to-transparent" />
                    <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-black/60 to-transparent" />
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60%] h-[60%] bg-white/[0.04] blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 inset-x-0 pb-12 pt-32 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col items-center">
                      <h2 className="font-cinzel text-3xl md:text-5xl text-white mb-4 tracking-wide drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
                        Find Your Frequency
                      </h2>
                      <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-md mx-auto px-6">
                        Every body vibrates at its own frequency. Answer three questions to discover which resonance your system needs most.
                      </p>
                      <button
                        onClick={startQuiz}
                        className="group bg-white/5 border border-white/25 backdrop-blur-xl text-white px-10 py-4 rounded-full font-medium hover:bg-white/10 hover:border-white/40 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                      >
                        <span className="flex items-center gap-3">
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
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-3 mb-12">
                  {QUIZ_QUESTIONS.map((_, i) => (
                    <div key={i} className={clsx(
                      "h-[2px] w-12 rounded-full transition-all duration-500",
                      i < quizStep ? "bg-white/80" : i === quizStep - 1 ? "bg-white/60" : "bg-white/15"
                    )} />
                  ))}
                </div>

                <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-cinzel block mb-6">
                  Question {quizStep} of {QUIZ_QUESTIONS.length}
                </span>

                <h3 className="font-playfair italic text-2xl md:text-3xl text-white mb-12 leading-relaxed">
                  {QUIZ_QUESTIONS[quizStep - 1].question}
                </h3>

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  {QUIZ_QUESTIONS[quizStep - 1].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(i, opt.weight)}
                      className="group w-full text-left bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-6 py-5 hover:bg-white/[0.08] hover:border-white/25 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="text-white/80 group-hover:text-white transition-colors font-light">{opt.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {quizStep > QUIZ_QUESTIONS.length && quizResult && (
              <motion.div
                key="quiz-result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
                  className="mb-8"
                >
                  <span className="text-6xl">
                    {quizResult === 'genesis' ? '🌿' : quizResult === 'revelation' ? '💎' : '⚡'}
                  </span>
                </motion.div>

                <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-cinzel block mb-4">
                  Your Frequency
                </span>

                <h3 className="font-cinzel text-4xl md:text-5xl text-white mb-3 tracking-wide">
                  {MODES[quizResult].hz}
                </h3>
                <p className="font-playfair italic text-xl text-white/60 mb-6">
                  {MODES[quizResult].label}
                </p>

                <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto mb-10">
                  {quizResult === 'genesis' && "Your system craves grounding. The 432Hz frequency — the heartbeat of the Earth — will bring you back to center. This is the frequency of calm, of roots, of remembering what matters."}
                  {quizResult === 'revelation' && "Your mind needs clarity. The 528Hz frequency — the Love frequency — cuts through fog and restores natural harmony. This is the frequency of transformation and DNA repair."}
                  {quizResult === 'ascension' && "Your spirit is ready to expand. The 963Hz frequency — the Crown frequency — activates higher consciousness and opens the gate to your full potential."}
                </p>

                <p className="text-white/30 text-xs mb-12">The field above has shifted to your frequency. Look up.</p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5, duration: 0.8 }}
                >
                  <ChevronDown className="w-5 h-5 text-white/25 animate-bounce mx-auto" />
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
      <SonicInfusionSection />

      {/* ═══ SECTION 5: Product ═══ */}
      <section className="relative z-10 w-full min-h-screen">
        <div className="md:grid md:grid-cols-2 min-h-screen">
          <div className="sticky top-0 h-screen hidden md:flex items-center justify-center">
            <ProductBottle />
            <div
              className="absolute bottom-[8%] left-[10%] w-32 h-32 opacity-[0.15] blur-[1px] relative rounded-2xl overflow-hidden"
              style={{ maskImage: 'radial-gradient(circle, black 40%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 70%)' }}
            >
              <Image
                src="/images/mushroom-cluster.jpg"
                alt=""
                fill
                sizes="128px"
                className="object-cover"
              />
            </div>
          </div>
          <div className="md:hidden py-20 px-6"><ProductBottle /></div>
          <div className="px-6 py-24 md:py-32 md:px-16 flex flex-col justify-center max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6 text-sm font-medium">
              <div className="flex text-mycelium-gold">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}</div>
              <span className="text-white/60 border-b border-white/20 pb-0.5">142 Reviews</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.1] text-white">
              {quizResult === 'revelation' ? 'Clarity Dose' : quizResult === 'ascension' ? 'Ascend Dose' : 'Calm Dose'}
              <span className="text-mycelium-gold">.</span>
            </h2>
            <p className="text-lg text-white/70 leading-relaxed mb-6 font-light">
              {quizResult === 'revelation'
                ? 'A precision-formulated nootropic blend to sharpen focus and dissolve mental fog.'
                : quizResult === 'ascension'
                ? 'An expansion-catalyst blend to unlock energy, creativity, and higher awareness.'
                : 'A wellness supplement formulated with functional mushroom fruiting bodies to support everyday calm and balance.'}
            </p>
            <p className="text-sm text-white/50 leading-relaxed mb-10 font-mono">
              Grown in a {quizResult ? MODES[quizResult].hz : '432 Hz'} sound chamber. This is not just a supplement—it is biological resonance.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {["Anxiety Relief","Mental Clarity","Sleep Support","100% Organic"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <div className="w-5 h-5 rounded-full bg-mycelium-gold/10 flex items-center justify-center text-mycelium-gold"><Check className="w-3 h-3" /></div>
                  {item}
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 mb-8">
              <Accordion title="Ingredients">
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Active:</strong> Lion&apos;s Mane (fruiting body), Reishi (fruiting body), Cordyceps (fruiting body)</li>
                  <li><strong>Other:</strong> Vegan capsule (plant-based cellulose)</li>
                </ul>
              </Accordion>
              <Accordion title="Dosage Ritual">We recommend you take 1 a day, in the morning, for a <strong>two-day on and two-days off protocol</strong> to maximize the long-term benefits.</Accordion>
              <Accordion title="The Frequency Difference">Grown in 432Hz (The Miracle Tone). We imbue the biological structure with inherent harmonic stability.</Accordion>
            </div>
            <PurchaseWidget />
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-16 text-center border-t border-white/5">
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
      </footer>
    </div>
  );
}
