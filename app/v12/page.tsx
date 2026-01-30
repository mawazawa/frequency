"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Waves, Disc, Sprout, Activity } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useMicAudio } from '@/hooks/useMicAudio';
import { useAmbientSound } from '@/hooks/useAmbientSound';

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
    color1: [1.0, 0.5, 0.2],
    color2: [1.0, 0.9, 0.8],
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
    color1: [0.0, 0.7, 0.6],
    color2: [0.8, 0.9, 1.0],
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
    color1: [0.5, 0.0, 1.0],
    color2: [1.0, 0.6, 0.2],
    bg: [0.039, 0.0, 0.059],
    tension: 0.1,
    friction: 0.9,
    n: 7.0,
    m: 11.0,
    shapeFn: 2,
  }
} as const;

type ModeId = keyof typeof MODES;

// ═══════════════════════════════════════════════════════════════════
// SPRING PHYSICS
// ═══════════════════════════════════════════════════════════════════
class Spring {
  val: number; target: number; vel: number;
  constructor(v: number) { this.val = v; this.target = v; this.vel = 0; }
  update(target: number, tension: number, friction: number) {
    this.target = target;
    this.vel += (this.target - this.val) * tension;
    this.vel *= friction;
    this.val += this.vel;
    return this.val;
  }
}

// ═══════════════════════════════════════════════════════════════════
// UNIFIED SHADER — Single particle system: Lines → Chladni Field
// ═══════════════════════════════════════════════════════════════════
const unifiedVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uMorph;        // 0 = lines, 1 = full Chladni field
  uniform float uFadeIn;       // 0→1 over first 2s
  uniform float uAudioActive;
  uniform float uN;
  uniform float uM;
  uniform int uShapeFn;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying float vDisplacement;
  varying vec2 vUv;
  varying float vDist;
  varying float vMorph;
  varying float vEnvelope;

  // ── Hash noise ──
  float hash(vec2 p) {
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));
  }
  float noise(vec2 x) {
    vec2 i = floor(x); vec2 f = fract(x);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }

  // ── Chladni pattern ──
  float chladni(vec2 p, float n, float m, float a, float b) {
    float PI = 3.14159265;
    return a*sin(PI*n*p.x)*sin(PI*m*p.y) + b*sin(PI*m*p.x)*sin(PI*n*p.y);
  }

  void main() {
    vUv = uv;
    vMorph = uMorph;
    vec2 pos = uv * 2.0 - 1.0;  // -1 to 1
    vDist = length(pos);
    float t = uTime;

    // ── Shape envelope (tapers edges for organic form) ──
    float edgeFadeX = 1.0 - pow(abs(pos.x), 2.4);
    float edgeFadeY = 1.0 - pow(abs(pos.y), 2.0);
    float envelope = edgeFadeX * edgeFadeY;
    vEnvelope = envelope;

    // ════════════════════════════════════════════
    // LINE DISPLACEMENT (morph = 0)
    // Terrain hills + breathing + audio ripples
    // Applied to Y axis for landscape silhouette
    // ════════════════════════════════════════════

    // Multi-octave terrain (static landscape shape)
    float terrain = 0.0;
    terrain += noise(pos * 2.0 + vec2(0.3, 0.0)) * 1.2;
    terrain += noise(pos * 4.0 + vec2(1.7, 0.5)) * 0.5;
    terrain += noise(pos * 8.0 + vec2(-2.1, 1.0)) * 0.2;
    terrain *= envelope;

    // Gentle breathing undulation
    float breath = sin(t * 0.8 + pos.x * 6.28) * 0.08
                 + sin(t * 0.5 + pos.y * 6.28) * 0.05;
    breath *= envelope;

    // Audio-reactive ripples in line mode
    float dist = length(pos);
    float bassRipple = sin(dist * 6.0 - t * 3.0) * uBass * 0.8;
    float midRipple  = sin(dist * 12.0 - t * 5.0) * uMid * 0.5
                     + sin(dist * 18.0 - t * 7.0 + 1.0) * uMid * 0.25;
    float highRipple = noise(vec2(pos.x * 30.0 + t * 3.0, pos.y * 20.0)) * uHigh * 0.3;
    float audioLine = (bassRipple + midRipple + highRipple) * envelope;

    float lineDisp = terrain * 0.7 + breath + audioLine;

    // ════════════════════════════════════════════
    // FIELD DISPLACEMENT (morph = 1)
    // Chladni plate with full audio reactivity
    // Applied to Z axis for 3D plate
    // ════════════════════════════════════════════

    float n = uN + uBass * 2.0;
    float m = uM + uMid * 3.0;
    float chladni1 = chladni(pos, n, m, 1.0, -1.0);
    float chladni2 = chladni(pos, n + 2.0, m + 1.0, 0.5, 0.5);
    float fieldDisp = 0.0;

    if (uShapeFn == 0) {
      // Genesis: warm, organic
      fieldDisp = chladni1 * (0.5 + uVolume * 2.5);
      fieldDisp += chladni2 * uBass * 0.5;
      fieldDisp *= 1.0 + sin(t * 0.5) * 0.15;
    } else if (uShapeFn == 1) {
      // Revelation: crystalline, geometric
      float crystal = chladni(pos, floor(n), floor(m), 1.0, 1.0);
      vec2 grid = abs(fract(pos * (3.0 + uBass)) - 0.5);
      float gridP = 1.0 - max(grid.x, grid.y);
      fieldDisp = mix(crystal, gridP, 0.5) * (0.5 + uVolume * 3.0);
      fieldDisp *= cos(t * 1.5 + vDist * 4.0);
      fieldDisp += uMid * noise(pos * 10.0 + t) * 1.5;
    } else {
      // Ascension: turbulent, expansive
      float turb = chladni1 + 0.5 * chladni2;
      float n1 = noise(pos * 4.0 + t * 0.5);
      fieldDisp = (turb * 0.6 + n1 * 0.4) * (0.5 + uVolume * 4.0);
      fieldDisp += sin(vDist * 8.0 - t) * uMid * 2.0;
      fieldDisp += uHigh * noise(pos * 20.0 + t * 2.0) * 1.5;
    }

    // ════════════════════════════════════════════
    // MORPH: blend and position
    // ════════════════════════════════════════════

    vec3 newPos = position;

    // Y compression: tight bands at morph=0, full spread at morph=1
    float yScale = mix(0.08, 1.0, uMorph);
    newPos.y *= yScale;

    // Line displacement → Y (terrain shape, fades out with morph)
    newPos.y += lineDisp * (1.0 - uMorph);

    // Field displacement → Z (Chladni plate, fades in with morph)
    newPos.z += fieldDisp * uMorph;

    // Subtle band noise during transition (keeps visual interest)
    float bandNoise = noise(pos * 5.0 + t) * 0.3 * uMorph * (1.0 - uMorph) * 4.0; // peaks at morph=0.5
    newPos.y += bandNoise;

    // Track total displacement magnitude for coloring
    float totalDisp = abs(lineDisp * (1.0 - uMorph)) + abs(fieldDisp * uMorph);
    vDisplacement = totalDisp;

    // ── Point size ──
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    // Lines: small tight points; Field: larger reactive points
    float lineSize = 1.8 + uMid * 1.0;
    float fieldSize = 2.0 + uMid * 4.0 + vDisplacement * 1.5;
    float baseSize = mix(lineSize, fieldSize, uMorph);
    gl_PointSize = baseSize * (8.0 / -mvPosition.z);

    // Fade in
    gl_PointSize *= uFadeIn;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const unifiedFragmentShader = /* glsl */ `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uMid;
  uniform float uFadeIn;
  uniform float uAudioActive;
  uniform float uCenterClearing;

  varying float vDisplacement;
  varying float vDist;
  varying float vMorph;
  varying float vEnvelope;

  void main() {
    // Circular point shape
    if (length(gl_PointCoord - 0.5) > 0.5) discard;

    // ── Line color: silver/white with displacement brightness ──
    float brightness = 0.75 + vDisplacement * 0.5;
    brightness = min(brightness, 1.0);
    vec3 lineColor = vec3(brightness, brightness, brightness * 1.02);
    float lineGlow = 1.8; // bright luminous lines

    // ── Field color: mode-specific with audio glow ──
    vec3 fieldColor = mix(uColor1, uColor2, smoothstep(0.0, 1.5, vDisplacement));
    float fieldGlow = 1.0 + uMid * 1.5;

    // ── Blend by morph ──
    vec3 color = mix(lineColor * lineGlow, fieldColor * fieldGlow, vMorph);

    // ── Alpha ──
    float edgeAlpha = 1.0 - smoothstep(0.6, 1.0, vDist);
    // Lines: semi-transparent, slightly boosted by displacement
    float lineAlpha = (vEnvelope * 0.3 + 0.7) * 0.85;
    lineAlpha += vDisplacement * 0.3 * uAudioActive;
    // Field: full opacity with edge falloff
    float fieldAlpha = 1.0;
    float alpha = mix(lineAlpha, fieldAlpha, vMorph) * edgeAlpha;
    alpha *= uFadeIn;

    // ── Center clearing: fade particles near center to reveal mushroom behind ──
    float centerDist = vDist;
    float clearingRadius = 0.25 * uCenterClearing;
    float clearingFade = smoothstep(clearingRadius, clearingRadius + 0.2, centerDist);
    alpha *= mix(1.0, clearingFade, uCenterClearing);

    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

// ═══════════════════════════════════════════════════════════════════
// SHADERS — Ether Background Particles
// ═══════════════════════════════════════════════════════════════════
const etherVertexShader = /* glsl */ `
  uniform float uTime; uniform float uMorph; uniform float uMid;
  attribute vec3 aRandom;
  void main() {
    vec3 pos = position;
    pos.x += sin(uTime*0.5*aRandom.x)*0.5;
    pos.y += cos(uTime*0.3*aRandom.y)*0.5;
    pos.z += uMid*aRandom.z*5.0;
    pos.y *= mix(0.08, 1.0, pow(uMorph, 2.0));
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.5+aRandom.z+uMid*2.0)*(6.0/-mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const etherFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    if (length(gl_PointCoord-0.5)>0.5) discard;
    gl_FragColor = vec4(uColor, 0.35);
  }
`;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════
const WaveIcon = ({ active }: { active: boolean }) => (
  <div className="flex items-center justify-center gap-[3px] w-6 h-6">
    {[1,2,3,4,5].map(i => (
      <div key={i}
        className={`w-1 bg-white rounded-full transition-all duration-300 ${active ? 'animate-wave' : 'h-1 opacity-50'}`}
        style={{ height: active ? undefined : '4px', animationDelay: `${i*0.1}s`, animationDuration: '0.8s' }}
      />
    ))}
  </div>
);

const GlassButton = ({ onClick, children, className = '', active = false }: {
  onClick?: () => void; children: React.ReactNode; className?: string; active?: boolean;
}) => (
  <button onClick={onClick}
    className={clsx(
      "relative group overflow-hidden backdrop-blur-xl border transition-all duration-300 rounded-2xl",
      active ? "bg-white/10 border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.12)]"
             : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-[#D4AF37]/20",
      className
    )}>
    <div className="absolute inset-[1px] rounded-2xl border border-white/20 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]" />
    <div className="relative z-10">{children}</div>
  </button>
);

const ProductBottle = () => (
  <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center">
    {/* Warm ambient glow behind product */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-[0.08]"
      style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%)' }} />
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative z-10"
    >
      <Image
        src="/images/calm-product.jpg"
        alt="Frequency Calm Dose - Functional Mushroom Blend"
        width={500}
        height={500}
        className="object-contain rounded-2xl"
        style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.4)) drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
        priority
      />
    </motion.div>
    <div className="absolute bottom-[8%] w-72 h-10 bg-black/25 blur-[25px] rounded-[100%]" />
  </div>
);

const Accordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
        <span className={clsx("font-sans font-medium text-sm transition-colors", isOpen ? "text-mycelium-gold" : "text-white/80 group-hover:text-white")}>{title}</span>
        <ChevronDown className={clsx("w-4 h-4 transition-transform", isOpen ? "rotate-180 text-mycelium-gold" : "text-white/40")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4 pb-2 text-white/60 text-sm leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PurchaseWidget = () => {
  const [subType, setSubType] = useState<'sub'|'once'>('sub');
  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-lg p-1 shadow-sm backdrop-blur-md">
        <button onClick={() => setSubType('sub')} className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300", subType==='sub' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5")}>
          <div className="flex items-center gap-3">
            <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType==='sub' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
              {subType==='sub' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
            </div>
            <div className="text-left">
              <span className="block font-medium text-sm text-white">Subscribe & Save 15%</span>
              <span className="block text-xs text-white/50">Delivered monthly • Cancel anytime</span>
            </div>
          </div>
          <span className="font-serif font-medium text-white">$98.00</span>
        </button>
        <button onClick={() => setSubType('once')} className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1", subType==='once' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5")}>
          <div className="flex items-center gap-3">
            <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType==='once' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
              {subType==='once' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
            </div>
            <div className="text-left"><span className="block font-medium text-sm text-white">One-time Purchase</span></div>
          </div>
          <span className="font-serif font-medium text-white">$115.00</span>
        </button>
      </div>
      <button className="w-full bg-white text-black py-4 px-6 rounded-full font-medium hover:bg-white/90 transition-all flex items-center justify-between group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        <span>Add to Cart</span>
        <span className="flex items-center gap-2">{subType==='sub'?'$98.00':'$115.00'}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
      </button>
      <p className="text-center text-xs text-white/40">Free shipping on orders over $100. 30-day money back guarantee.</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function V12Page() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [modeId, setModeId] = useState<ModeId>('genesis');
  const [showMicPrompt, setShowMicPrompt] = useState(true);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<ModeId | null>(null);
  const { isReady: audioReady, startAudio, getFrequencyData } = useMicAudio();
  const { startAmbient } = useAmbientSound();

  // Text scroll transforms — fades out and drifts up with parallax
  const textOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const textY = useTransform(scrollY, [0, 400], [0, -180]);

  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    fieldMaterial?: THREE.ShaderMaterial;
    fieldPoints?: THREE.Points;
    etherMaterial?: THREE.ShaderMaterial;
    etherPoints?: THREE.Points;
  }>({});

  const physicsRef = useRef({
    bass: new Spring(0), mid: new Spring(0), high: new Spring(0), vol: new Spring(0),
    morph: new Spring(0), clearing: new Spring(0),
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

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── UNIFIED PARTICLE SYSTEM ──
    // Single PlaneGeometry 220×220 that morphs from lines to Chladni field
    const fieldGeo = new THREE.PlaneGeometry(8, 8, 220, 220);
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
        uCenterClearing: { value: 0 },
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

    sceneRef.current = { renderer, scene, camera, fieldMaterial: fieldMat, fieldPoints, etherMaterial: etherMat, etherPoints };
    stateRef.current.startTime = performance.now();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      stateRef.current.disposed = true;
      window.removeEventListener('resize', handleResize);
      fieldGeo.dispose();
      fieldMat.dispose();
      etherGeo.dispose();
      etherMat.dispose();
      scene.clear();
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

      // ── Audio ──
      const audio = getFrequencyData();
      const tension = mode.tension;
      const friction = mode.friction;
      const bass = p.bass.update(audio.bass, tension, friction);
      const mid  = p.mid.update(audio.mid, tension, friction);
      const high = p.high.update(audio.high, tension, friction);
      const vol  = p.vol.update((audio.bass + audio.mid + audio.high) / 3, tension, friction);

      const ambientVol = Math.sin(elapsed * 1.5) * 0.04 + 0.07;
      const ambientMid = Math.cos(elapsed * 1.2) * 0.04;
      const effectiveVol = Math.max(vol, ambientVol);
      const effectiveMid = audioReady ? mid : Math.max(mid, ambientMid + 0.05);

      // ── Morph: scroll-driven, spring-smoothed ──
      // Lines at scroll 0-0.3, morphing 0.3-0.7, full field 0.7+
      const morphTarget = smoothstep(0.3, 0.7, scroll);
      const morph = p.morph.update(morphTarget, 0.12, 0.82);

      // ── Center clearing: visible during hero (scroll 0-0.5), fades as field takes over ──
      const clearingTarget = 1.0 - smoothstep(0.0, 0.6, scroll);
      const clearing = p.clearing.update(clearingTarget, 0.08, 0.88);

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
        fu.uAudioActive.value = audioReady ? 1.0 : 0.0;
        fu.uN.value = sn;
        fu.uM.value = sm;
        fu.uShapeFn.value = mode.shapeFn;
        fu.uColor1.value.set(c1r, c1g, c1b);
        fu.uColor2.value.set(c2r, c2g, c2b);
        fu.uCenterClearing.value = clearing;
      }

      // ── Update Ether ──
      if (s.etherMaterial) {
        s.etherMaterial.uniforms.uTime.value = elapsed;
        s.etherMaterial.uniforms.uMorph.value = morph;
        s.etherMaterial.uniforms.uMid.value = effectiveMid;
        s.etherMaterial.uniforms.uColor.value.set(c2r, c2g, c2b);
      }

      // ── Background is transparent (alpha renderer) — mushroom shows through ──

      // ── Camera: straight-on for lines, tilted down for field ──
      if (s.camera) {
        s.camera.position.z = 7.0 - morph * 1.5;
        s.camera.rotation.x = -morph * 0.35;
      }

      s.renderer.render(s.scene, s.camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [audioReady, getFrequencyData]);

  // Sync modeId to ref
  useEffect(() => { stateRef.current.modeId = modeId; }, [modeId]);

  // Scrolled state for nav
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const handleEnableAudio = useCallback(() => {
    startAudio();
    startAmbient();
    setShowMicPrompt(false);
  }, [startAudio, startAmbient]);

  const handleDismissPrompt = useCallback(() => {
    setShowMicPrompt(false);
  }, []);

  const quizQuestions = [
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

  const handleQuizAnswer = useCallback((answerIndex: number, weight: ModeId) => {
    const newAnswers = [...quizAnswers, answerIndex];
    setQuizAnswers(newAnswers);
    const nextStep = quizStep + 1;
    
    if (nextStep > quizQuestions.length) {
      const counts: Record<ModeId, number> = { genesis: 0, revelation: 0, ascension: 0 };
      quizAnswers.forEach((ai, qi) => {
        if (quizQuestions[qi]) counts[quizQuestions[qi].options[ai].weight]++;
      });
      counts[weight]++;
      
      const result = (Object.entries(counts) as [ModeId, number][]).sort((a, b) => b[1] - a[1])[0][0];
      setQuizResult(result);
      setModeId(result);
    }
    setQuizStep(nextStep);
  }, [quizStep, quizAnswers, quizQuestions]);

  const startQuiz = useCallback(() => {
    setQuizStep(1);
    setQuizAnswers([]);
    setQuizResult(null);
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
              <img src="/images/mushroom-cluster.jpg" alt="" decoding="async" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] max-w-none object-cover opacity-[0.18]"
                style={{
                  maskImage: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 40%, transparent 65%)',
                  WebkitMaskImage: 'radial-gradient(ellipse 55% 50% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 40%, transparent 65%)',
                }} />
              {/* Warm ethereal glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[50vh] rounded-full opacity-[0.08]"
                style={{ background: 'radial-gradient(ellipse, rgba(200,160,100,0.5) 0%, transparent 60%)' }} />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
            >
              <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-4 tracking-wide">
                Find Your Frequency
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-xs">
                This experience reacts to your voice and the sounds around you. Enable your microphone to bring the field to life.
              </p>

              <button
                onClick={handleEnableAudio}
                className="group relative w-28 h-28 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-xl flex items-center justify-center hover:border-white/60 hover:bg-white/10 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] mb-6"
              >
                <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-20" />
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/50 group-hover:text-white/80 transition-colors">Enable</span>
                </div>
              </button>

              <button
                onClick={handleDismissPrompt}
                className="text-white/30 hover:text-white/60 text-xs uppercase tracking-[0.2em] transition-colors"
              >
                Continue without audio →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WebGL Canvas (behind all content, above ambient imagery) ── */}
      <div ref={canvasContainerRef} className="fixed inset-0 z-[2] pointer-events-none" />

      {/* ── Full-screen mushroom backdrop (BEHIND the WebGL canvas) ── */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        {/* Black base */}
        <div className="absolute inset-0 bg-black" />
        
        {/* Main mushroom — full viewport, centered, slowly breathing */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/images/mushroom-cluster.jpg" 
            alt="" 
            decoding="async"
            className="absolute top-1/2 left-1/2 animate-slow-drift w-[130vw] h-[130vh] max-w-none object-cover opacity-[0.35]"
            style={{
              maskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 70%)',
            }}
          />
        </div>

        {/* Ethereal glow behind mushroom */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[60vh] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(ellipse, rgba(200,160,100,0.4) 0%, rgba(140,100,60,0.15) 35%, transparent 70%)' }} />
        
        {/* Secondary warm glow — lower */}
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vh] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(ellipse, rgba(255,200,120,0.5) 0%, transparent 60%)' }} />

        {/* Smoke atmospheric layer — breathing */}
        <img 
          src="/images/mushroom-smoke.jpg" 
          alt="" 
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover animate-ethereal-pulse"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.4) 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          }}
        />

        {/* Plant-dark side accents */}
        <img src="/images/plant-dark.jpg" alt="" loading="lazy" decoding="async" className="absolute left-0 top-0 h-full w-[25vw] object-cover opacity-[0.04]" 
          style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />
        <img src="/images/plant-dark.jpg" alt="" loading="lazy" decoding="async" className="absolute right-0 top-0 h-full w-[25vw] object-cover opacity-[0.04] scale-x-[-1]"
          style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, transparent 100%)' }} />

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
        <Link href="/" className="hover:text-white/70 transition-colors"><Menu className="w-6 h-6" /></Link>
        <div className={clsx("absolute left-1/2 -translate-x-1/2 transition-opacity duration-700", scrolled ? "opacity-100" : "opacity-0")}>
          <span className="font-cinzel text-lg tracking-[0.2em] font-bold">FREQUENCY</span>
        </div>
        <div className="flex gap-8 items-center">
          <button onClick={handleEnableAudio} className="relative" title="Enable microphone">
            <WaveIcon active={audioReady} />
          </button>
          <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors cursor-pointer" />
        </div>
      </nav>

      {/* ═══ SECTION 1: Hero — Lines morph into Field as you scroll ═══ */}
      <section className="relative h-[160vh] w-full">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none z-[5]">
          {/* Typography — "God is Frequency" — fades out and drifts up on scroll */}
          <motion.div
            className="relative z-10 text-center select-none"
            style={{ opacity: textOpacity, y: textY }}
          >
            <h1 className="flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
                className="text-4xl md:text-6xl tracking-[0.2em] uppercase text-white font-cinzel block mb-3"
                style={{ fontWeight: 300 }}
              >
                God is
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 30, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 1.2, duration: 1.5, ease: "easeOut" }}
                className="font-playfair italic text-7xl md:text-[10rem] leading-none text-white"
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
      <section className="relative z-[10] min-h-screen w-full flex flex-col justify-end pb-12 px-6">
        <motion.div style={{ opacity: controlPanelOpacity }} className="max-w-4xl mx-auto w-full">
          <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]" />
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
                <Activity className={`w-4 h-4 ${audioReady ? 'text-white animate-pulse' : 'text-gray-600'}`} />
                <span className="text-[10px] uppercase tracking-widest text-gray-500">{audioReady ? 'Listening' : 'Tap mic to activate'}</span>
              </div>
            </div>
          </div>
        </motion.div>
        <div className="mt-12 text-center">
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
        </div>
      </section>

      {/* ═══ SECTION 2.5: Mushroom Smoke Divider — Ethereal Transition ═══ */}
      <div className="h-[4vh]" aria-hidden="true" />
      <motion.section 
        initial={{ opacity: 0 }} 
        whileInView={{ opacity: 1 }} 
        viewport={{ once: true, margin: "-10%" }} 
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="relative z-10 w-full overflow-hidden"
      >
        <div className="relative w-full aspect-[16/9] md:aspect-[16/6]">
          <img
            src="/images/mushroom-smoke.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-35"
          />
          {/* Ethereal center glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[80%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(200,170,120,0.5) 0%, transparent 70%)' }} />
          <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black via-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-black to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-black to-transparent" />
        </div>
      </motion.section>

      {/* ═══ SECTION 3: Find Your Frequency Quiz ═══ */}
      <div className="h-[6vh]" aria-hidden="true" />
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
                {/* Full-width cinematic mushroom hero */}
                <div className="relative w-screen -mx-6 mb-10 overflow-hidden" style={{ maxWidth: '100vw', marginLeft: 'calc(-50vw + 50%)' }}>
                  <div className="relative w-full aspect-[16/8] md:aspect-[16/6] overflow-hidden">
                    <img 
                      src="/images/mushroom-cluster.jpg" 
                      alt="" 
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover object-center"
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
                        className="group w-full sm:w-auto bg-white/5 border border-white/25 backdrop-blur-xl text-white px-10 py-4 rounded-full font-medium hover:bg-white/10 hover:border-white/40 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
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

            {quizStep >= 1 && quizStep <= quizQuestions.length && (
              <motion.div
                key={`quiz-q${quizStep}`}
                initial={{ opacity: 0, x: 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.98 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-3 mb-12">
                  {quizQuestions.map((_, i) => (
                    <div key={i} className={clsx(
                      "h-[3px] sm:h-[2px] w-14 sm:w-12 rounded-full transition-all duration-500",
                      i < quizStep ? "bg-white/80" : i === quizStep - 1 ? "bg-white/60" : "bg-white/20 sm:bg-white/15"
                    )} />
                  ))}
                </div>

                <span className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-cinzel block mb-6">
                  Question {quizStep} of {quizQuestions.length}
                </span>

                <h3 className="font-playfair italic text-2xl md:text-3xl text-white mb-12 leading-relaxed">
                  {quizQuestions[quizStep - 1].question}
                </h3>

                <div className="flex flex-col gap-4 max-w-md mx-auto">
                  {quizQuestions[quizStep - 1].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(i, opt.weight)}
                      className="group w-full text-left bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-6 py-5 min-h-[56px] sm:min-h-0 hover:bg-white/[0.06] hover:border-[#D4AF37]/20 transition-all duration-300 hover:shadow-[0_0_20px_rgba(212,175,55,0.08)] hover:scale-[1.01]"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl sm:text-2xl">{opt.icon}</span>
                        <span className="text-base sm:text-base text-white/80 group-hover:text-white transition-colors font-light">{opt.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {quizStep > quizQuestions.length && quizResult && (
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
                  <span className="text-6xl inline-block animate-emoji-bounce">
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
        className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-8 tracking-wide uppercase">The Sonic Infusion</h2>
          <p className="font-playfair text-xl md:text-3xl text-white/80 leading-relaxed italic mb-12">
            &quot;The Mushrooms don&apos;t Work for Us. We Work for Them.&quot;
          </p>
          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="space-y-3">
              <Waves className="w-8 h-8 text-mycelium-gold" />
              <h3 className="font-serif text-lg text-white">Grown as Medicine</h3>
              <p className="text-sm text-white/60 leading-relaxed">Fungi are sentient beings. We treat them with reverence, growing them in clean, high-vibration spaces.</p>
            </div>
            <div className="space-y-3">
              <Disc className="w-8 h-8 text-mycelium-gold" />
              <h3 className="font-serif text-lg text-white">432Hz Infusion</h3>
              <p className="text-sm text-white/60 leading-relaxed">Every stage of cultivation is immersed in Solfeggio tones, chants, and nature sounds to harmonize the biological structure.</p>
            </div>
            <div className="space-y-3">
              <Sprout className="w-8 h-8 text-mycelium-gold" />
              <h3 className="font-serif text-lg text-white">Nature & Nurture</h3>
              <p className="text-sm text-white/60 leading-relaxed">&quot;Same genetics, different frequency = different outcome.&quot; We refine unique strains through our in-house cultivation.</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══ SECTION 5: Product ═══ */}
      <div className="h-[4vh]" aria-hidden="true" />
      <section className="relative z-10 w-full min-h-screen">
        <div className="md:grid md:grid-cols-2 min-h-screen">
          <div className="sticky top-0 h-screen hidden md:flex items-center justify-center">
            <ProductBottle />
            {/* Ethereal glow accent near bottle */}
            <div className="absolute bottom-[15%] left-[15%] w-48 h-48 rounded-full opacity-[0.06]"
              style={{ background: 'radial-gradient(circle, rgba(200,160,100,0.6) 0%, transparent 70%)' }} />
          </div>
          <div className="md:hidden py-8 px-4"><ProductBottle /></div>
          <div className="px-6 py-24 md:py-32 md:px-16 flex flex-col justify-center max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6 text-sm font-medium">
              <div className="flex text-mycelium-gold">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}</div>
              <span className="text-white/60 border-b border-white/20 pb-0.5">142 Reviews</span>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-serif mb-6 leading-[1.1] text-white">
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
                  <div className="w-5 h-5 rounded-full bg-[#E6F5EC] flex items-center justify-center text-[#009E60]"><Check className="w-3 h-3" /></div>
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

      <footer className="relative z-10 py-20 text-center">
        <div className="w-full h-px bg-white/5 mb-12" />
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
      </footer>
    </div>
  );
}
