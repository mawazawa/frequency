"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Waves, Disc, Sprout, Activity } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import clsx from 'clsx';
import Link from 'next/link';
import { useMicAudio } from '@/hooks/useMicAudio';

// ═══════════════════════════════════════════════════════════════════
// FONTS & STYLES
// ═══════════════════════════════════════════════════════════════════
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600&family=Inter:wght@200;300;400&display=swap');
    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-playfair { font-family: 'Playfair Display', serif; }
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
    // Chladni params: n, m for the standing wave equation
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
  val: number;
  target: number;
  vel: number;
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
// SHADERS
// ═══════════════════════════════════════════════════════════════════

// --- Silver Intro Particles (God Is → Lines) ---
const introVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;        // 0=text, 1=lines
  uniform float uDissolve;     // 0=visible, 1=dissolved into field
  uniform float uParticleSize;

  attribute vec3 linePosition;
  attribute float randomOffset;

  varying float vAlpha;
  varying float vShimmer;
  varying float vDistToTarget;

  // Curl noise helpers
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 curlNoise(vec3 p) {
    float e = 0.1;
    float n1, n2;
    vec3 curl;
    n1 = snoise(p + vec3(0, e, 0));
    n2 = snoise(p - vec3(0, e, 0));
    float a = (n1 - n2) / (2.0 * e);
    n1 = snoise(p + vec3(0, 0, e));
    n2 = snoise(p - vec3(0, 0, e));
    float b = (n1 - n2) / (2.0 * e);
    curl.x = a - b;
    n1 = snoise(p + vec3(0, 0, e));
    n2 = snoise(p - vec3(0, 0, e));
    a = (n1 - n2) / (2.0 * e);
    n1 = snoise(p + vec3(e, 0, 0));
    n2 = snoise(p - vec3(e, 0, 0));
    b = (n1 - n2) / (2.0 * e);
    curl.y = a - b;
    n1 = snoise(p + vec3(e, 0, 0));
    n2 = snoise(p - vec3(e, 0, 0));
    a = (n1 - n2) / (2.0 * e);
    n1 = snoise(p + vec3(0, e, 0));
    n2 = snoise(p - vec3(0, e, 0));
    b = (n1 - n2) / (2.0 * e);
    curl.z = a - b;
    return curl;
  }

  void main() {
    float morph = smoothstep(0.0, 1.0, uMorph);
    vec3 targetPos = mix(position, linePosition, morph);

    // Curl noise for organic motion
    vec3 curl = curlNoise(targetPos * 0.3 + uTime * 0.15) * 0.3;
    targetPos += curl * morph;

    // Line vibration
    if (morph > 0.3) {
      float wave = sin(targetPos.x * 2.0 + uTime * 2.0 + randomOffset * 10.0);
      targetPos.z += wave * 0.12 * morph;
      targetPos.y += cos(targetPos.x * 5.0 + uTime) * 0.03 * morph;
    }

    // Dissolve: scatter outward
    if (uDissolve > 0.0) {
      vec3 scatter = curlNoise(targetPos * 0.5 + uTime * 0.3) * uDissolve * 4.0;
      targetPos += scatter;
    }

    // Distance to target for particle size modulation
    vDistToTarget = length(targetPos - mix(position, linePosition, morph));

    vec4 mvPosition = modelViewMatrix * vec4(targetPos, 1.0);
    // Bigger when moving, smaller when settled
    float sizeBoost = 1.0 + vDistToTarget * 2.0;
    gl_PointSize = uParticleSize * sizeBoost * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vShimmer = sin(uTime * 3.0 + randomOffset * 20.0);
    vAlpha = 1.0 - uDissolve;
  }
`;

const introFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vShimmer;
  varying float vDistToTarget;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    float brightness = 0.7 + 0.5 * vShimmer;
    vec3 finalColor = uColor * brightness;
    // Glow when in motion
    finalColor += vec3(0.1, 0.12, 0.15) * vDistToTarget;
    float edgeFade = 1.0 - smoothstep(0.3, 0.5, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(finalColor, uOpacity * vAlpha * edgeFade);
  }
`;

// --- Chladni Field (Enhanced with real equation + curl noise + frequency bands) ---
const fieldVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uScroll;      // 0=flat band, 1=full 3D
  uniform float uFieldReveal; // 0=hidden, 1=visible (fades in)

  // Chladni parameters (interpolated between modes)
  uniform float uN;
  uniform float uM;
  uniform float uShapeMix;   // For blending between shape functions
  uniform int uShapeFn;

  // Colors
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying float vDisplacement;
  varying vec2 vUv;
  varying float vDist;

  float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
  float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Real Chladni plate equation:
  // z = a * sin(π*n*x) * sin(π*m*y) + b * sin(π*m*x) * sin(π*n*y)
  float chladni(vec2 p, float n, float m, float a, float b) {
    float PI = 3.14159265;
    return a * sin(PI * n * p.x) * sin(PI * m * p.y)
         + b * sin(PI * m * p.x) * sin(PI * n * p.y);
  }

  void main() {
    vUv = uv;
    vec2 pos = uv * 2.0 - 1.0;
    vDist = length(pos);
    float PI = 3.14159265;
    float t = uTime;

    // Audio-driven Chladni parameters
    float n = uN + uBass * 2.0;
    float m = uM + uMid * 3.0;

    // --- Primary Chladni pattern ---
    float chladni1 = chladni(pos, n, m, 1.0, -1.0);

    // Second harmonic overlay for complexity
    float chladni2 = chladni(pos, n + 2.0, m + 1.0, 0.5, 0.5);

    // Blend based on shape function
    float displacement = 0.0;

    if (uShapeFn == 0) {
      // Genesis: pure Chladni interference
      displacement = chladni1 * (0.5 + uVolume * 2.5);
      displacement += chladni2 * uBass * 0.5;
      // Animate the nodal lines
      displacement *= 1.0 + sin(t * 0.5) * 0.15;
    }
    else if (uShapeFn == 1) {
      // Revelation: geometric crystalline
      float crystal = chladni(pos, floor(n), floor(m), 1.0, 1.0);
      vec2 grid = abs(fract(pos * (3.0 + uBass)) - 0.5);
      float gridPattern = 1.0 - max(grid.x, grid.y);
      displacement = mix(crystal, gridPattern, 0.5) * (0.5 + uVolume * 3.0);
      displacement *= cos(t * 1.5 + vDist * 4.0);
      displacement += uMid * noise(pos * 10.0 + t) * 1.5;
    }
    else {
      // Ascension: turbulent organic
      float turb = chladni1 + 0.5 * chladni2;
      float n1 = noise(pos * 4.0 + t * 0.5);
      displacement = (turb * 0.6 + n1 * 0.4) * (0.5 + uVolume * 4.0);
      displacement += sin(vDist * 8.0 - t) * uMid * 2.0;
      // High freq adds sparkle
      displacement += uHigh * noise(pos * 20.0 + t * 2.0) * 1.5;
    }

    vec3 newPos = position;
    newPos.z += displacement;

    // Horizon reveal: flat band → 3D field
    float horizonFactor = pow(uScroll, 2.5);
    float bandNoise = noise(pos.xy * 5.0 + t) * 0.3 * (1.0 - horizonFactor);
    newPos.y *= mix(0.12, 1.0, horizonFactor);
    newPos.y += bandNoise;
    newPos.z *= mix(0.5, 1.0, uScroll);

    vDisplacement = abs(displacement);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    float ptSize = (2.0 + uMid * 4.0 + vDisplacement * 1.5) * (8.0 / -mvPosition.z);
    gl_PointSize = ptSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fieldFragmentShader = /* glsl */ `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uScroll;
  uniform float uMid;
  uniform float uFieldReveal;

  varying float vDisplacement;
  varying float vDist;

  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 1.5, vDisplacement));
    float alpha = 1.0 - smoothstep(0.6, 1.0, vDist);
    float glow = 1.0 + uMid * 1.5;
    float lineGlow = mix(2.0, 1.0, uScroll);
    alpha *= uFieldReveal;
    gl_FragColor = vec4(color * glow * lineGlow, alpha);
  }
`;

// --- Ether Background Particles ---
const etherVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uMid;
  attribute vec3 aRandom;

  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * 0.5 * aRandom.x) * 0.5;
    pos.y += cos(uTime * 0.3 * aRandom.y) * 0.5;
    pos.z += uMid * aRandom.z * 5.0;
    pos.y *= mix(0.08, 1.0, pow(uScroll, 2.0));
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.5 + aRandom.z + uMid * 2.0) * (6.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const etherFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
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

const lerp3 = (a: number[], b: number[], t: number) =>
  a.map((v, i) => v + (b[i] - v) * t);

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const WaveIcon = ({ active }: { active: boolean }) => (
  <div className="flex items-center justify-center gap-[3px] w-6 h-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`w-1 bg-white rounded-full transition-all duration-300 ${active ? 'animate-wave' : 'h-1 opacity-50'}`}
        style={{ height: active ? undefined : '4px', animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }}
      />
    ))}
  </div>
);

const GlassButton = ({ onClick, children, className = '', active = false }: {
  onClick?: () => void; children: React.ReactNode; className?: string; active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={clsx(
      "relative group overflow-hidden backdrop-blur-xl border transition-all duration-300 rounded-2xl",
      active
        ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
      className
    )}
  >
    <div className="absolute inset-[1px] rounded-2xl border border-white/20 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    <div className="relative z-10">{children}</div>
  </button>
);

const ProductBottle = () => (
  <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative z-10 w-64 md:w-80 aspect-[3/5] rounded-[40px] shadow-2xl overflow-hidden backdrop-blur-sm border border-white/20"
      style={{
        background: "linear-gradient(135deg, rgba(40,40,40,0.95) 0%, rgba(20,20,20,1) 100%)",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.1)"
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-16 bg-[#111] border-b border-white/10 z-20" />
      <div className="absolute inset-4 top-24 border border-white/10 rounded-[20px] p-6 flex flex-col justify-between">
        <div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-mycelium-gold to-transparent opacity-50 mb-4" />
          <h2 className="text-mycelium-gold font-serif text-3xl text-center tracking-wide">CALM DOSE</h2>
          <p className="text-white/40 text-[10px] text-center uppercase tracking-[0.2em] mt-2">Functional Mushroom Blend</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-white/30 font-mono border-t border-white/5 pt-2">
            <span>BATCH: 004</span><span>180MG</span>
          </div>
          <div className="w-full h-32 opacity-20 relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-mycelium-gold blur-[60px]" />
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
    </motion.div>
    <div className="absolute bottom-[10%] w-64 h-8 bg-black/20 blur-[20px] rounded-[100%]" />
  </div>
);

const Accordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
        <span className="font-sans font-medium text-sm text-white/80 group-hover:text-white transition-colors">{title}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
  const [subType, setSubType] = useState<'sub' | 'once'>('sub');
  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-lg p-1 shadow-sm backdrop-blur-md">
        <button onClick={() => setSubType('sub')} className={clsx(
          "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300",
          subType === 'sub' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'sub' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
              {subType === 'sub' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
            </div>
            <div className="text-left">
              <span className="block font-medium text-sm text-white">Subscribe & Save 15%</span>
              <span className="block text-xs text-white/50">Delivered monthly • Cancel anytime</span>
            </div>
          </div>
          <span className="font-serif font-medium text-white">$98.00</span>
        </button>
        <button onClick={() => setSubType('once')} className={clsx(
          "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1",
          subType === 'once' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5"
        )}>
          <div className="flex items-center gap-3">
            <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'once' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
              {subType === 'once' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
            </div>
            <div className="text-left"><span className="block font-medium text-sm text-white">One-time Purchase</span></div>
          </div>
          <span className="font-serif font-medium text-white">$115.00</span>
        </button>
      </div>
      <button className="w-full bg-white text-black py-4 px-6 rounded-full font-medium hover:bg-white/90 transition-all flex items-center justify-between group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        <span>Add to Cart</span>
        <span className="flex items-center gap-2">
          {subType === 'sub' ? '$98.00' : '$115.00'}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </span>
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
  const { isReady: audioReady, startAudio, getFrequencyData } = useMicAudio();

  // Refs for Three.js objects
  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    introMaterial?: THREE.ShaderMaterial;
    fieldMaterial?: THREE.ShaderMaterial;
    etherMaterial?: THREE.ShaderMaterial;
    introPoints?: THREE.Points;
    fieldPoints?: THREE.Points;
    etherPoints?: THREE.Points;
  }>({});

  const physicsRef = useRef({
    bass: new Spring(0),
    mid: new Spring(0),
    high: new Spring(0),
    vol: new Spring(0),
    // Smooth mode transition
    n: new Spring(MODES.genesis.n),
    m: new Spring(MODES.genesis.m),
    color1r: new Spring(MODES.genesis.color1[0]),
    color1g: new Spring(MODES.genesis.color1[1]),
    color1b: new Spring(MODES.genesis.color1[2]),
    color2r: new Spring(MODES.genesis.color2[0]),
    color2g: new Spring(MODES.genesis.color2[1]),
    color2b: new Spring(MODES.genesis.color2[2]),
    bgr: new Spring(MODES.genesis.bg[0]),
    bgg: new Spring(MODES.genesis.bg[1]),
    bgb: new Spring(MODES.genesis.bg[2]),
  });

  const stateRef = useRef({
    modeId: 'genesis' as ModeId,
    startTime: 0,
    disposed: false,
  });

  // Background opacity for product section
  const bgOpacity = useTransform(scrollY, [1500, 2500], [0, 1]);

  // ─── Three.js Setup ───
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(...MODES.genesis.bg);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── 1. Intro Particles ("God Is" → Lines) ──
    const generateTextPositions = (text: string): Float32Array => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return new Float32Array(0);
      canvas.width = 1024;
      canvas.height = 512;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 80px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const positions: number[] = [];
      for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) {
          if (data[(y * canvas.width + x) * 4] > 50) {
            positions.push(
              (x / canvas.width - 0.5) * 16.0,
              -(y / canvas.height - 0.5) * 8.0,
              0
            );
          }
        }
      }
      return new Float32Array(positions);
    };

    const textPositions = generateTextPositions("God is");
    const introCount = textPositions.length / 3;

    const linePositions = new Float32Array(introCount * 3);
    const randomOffsets = new Float32Array(introCount);
    for (let i = 0; i < introCount; i++) {
      const lineIndex = i % 24;
      linePositions[i * 3] = (Math.random() - 0.5) * 20.0;
      linePositions[i * 3 + 1] = -2.5 + lineIndex * 0.2;
      linePositions[i * 3 + 2] = (Math.random() - 0.5) * 5.0;
      randomOffsets[i] = Math.random();
    }

    const introGeo = new THREE.BufferGeometry();
    introGeo.setAttribute('position', new THREE.BufferAttribute(textPositions, 3));
    introGeo.setAttribute('linePosition', new THREE.BufferAttribute(linePositions, 3));
    introGeo.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1));

    const introMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uDissolve: { value: 0 },
        uParticleSize: { value: 0.04 },
        uColor: { value: new THREE.Color(0xdddddd) },
        uOpacity: { value: 1.0 },
      },
      vertexShader: introVertexShader,
      fragmentShader: introFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const introPoints = new THREE.Points(introGeo, introMat);
    scene.add(introPoints);

    // ── 2. Chladni Field ──
    const fieldGeo = new THREE.PlaneGeometry(8, 8, 220, 220);
    const fieldMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uVolume: { value: 0 },
        uScroll: { value: 0 },
        uFieldReveal: { value: 0 },
        uN: { value: MODES.genesis.n },
        uM: { value: MODES.genesis.m },
        uShapeMix: { value: 0 },
        uShapeFn: { value: 0 },
        uColor1: { value: new THREE.Vector3(...MODES.genesis.color1) },
        uColor2: { value: new THREE.Vector3(...MODES.genesis.color2) },
      },
      vertexShader: fieldVertexShader,
      fragmentShader: fieldFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const fieldPoints = new THREE.Points(fieldGeo, fieldMat);
    fieldPoints.rotation.x = -0.2;
    scene.add(fieldPoints);

    // ── 3. Ether Background Particles ──
    const etherCount = 3000;
    const etherPos = new Float32Array(etherCount * 3);
    const etherRnd = new Float32Array(etherCount * 3);
    for (let i = 0; i < etherCount; i++) {
      etherPos[i * 3] = (Math.random() - 0.5) * 14;
      etherPos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      etherPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      etherRnd[i * 3] = Math.random();
      etherRnd[i * 3 + 1] = Math.random();
      etherRnd[i * 3 + 2] = Math.random();
    }
    const etherGeo = new THREE.BufferGeometry();
    etherGeo.setAttribute('position', new THREE.BufferAttribute(etherPos, 3));
    etherGeo.setAttribute('aRandom', new THREE.BufferAttribute(etherRnd, 3));
    const etherMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uMid: { value: 0 },
        uColor: { value: new THREE.Vector3(...MODES.genesis.color2) },
      },
      vertexShader: etherVertexShader,
      fragmentShader: etherFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const etherPoints = new THREE.Points(etherGeo, etherMat);
    scene.add(etherPoints);

    // Store refs
    sceneRef.current = {
      renderer, scene, camera,
      introMaterial: introMat,
      fieldMaterial: fieldMat,
      etherMaterial: etherMat,
      introPoints, fieldPoints, etherPoints,
    };
    stateRef.current.startTime = performance.now();

    // Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
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

      // ── Audio ──
      const audio = getFrequencyData();
      const targetBass = audio.bass;
      const targetMid = audio.mid;
      const targetHigh = audio.high;
      const targetVol = (audio.bass + audio.mid + audio.high) / 3;

      const tension = mode.tension;
      const friction = mode.friction;
      const bass = p.bass.update(targetBass, tension, friction);
      const mid = p.mid.update(targetMid, tension, friction);
      const high = p.high.update(targetHigh, tension, friction);
      const vol = p.vol.update(targetVol, tension, friction);

      // Ambient animation when no audio
      const ambientVol = Math.sin(elapsed * 1.5) * 0.04 + 0.07;
      const ambientMid = Math.cos(elapsed * 1.2) * 0.04;
      const effectiveVol = Math.max(vol, ambientVol);
      const effectiveMid = audioReady ? mid : Math.max(mid, ambientMid + 0.05);

      // ── Smooth mode transitions via springs ──
      const sn = p.n.update(mode.n, 0.08, 0.85);
      const sm = p.m.update(mode.m, 0.08, 0.85);
      const c1r = p.color1r.update(mode.color1[0], 0.04, 0.88);
      const c1g = p.color1g.update(mode.color1[1], 0.04, 0.88);
      const c1b = p.color1b.update(mode.color1[2], 0.04, 0.88);
      const c2r = p.color2r.update(mode.color2[0], 0.04, 0.88);
      const c2g = p.color2g.update(mode.color2[1], 0.04, 0.88);
      const c2b = p.color2b.update(mode.color2[2], 0.04, 0.88);
      const br = p.bgr.update(mode.bg[0], 0.04, 0.88);
      const bg = p.bgg.update(mode.bg[1], 0.04, 0.88);
      const bb = p.bgb.update(mode.bg[2], 0.04, 0.88);

      // ── Phase Logic ──
      // Phase 1: Text visible (0-2.5s or until scroll)
      // Phase 2: Morph to lines (2.5s+ or scroll > 0)
      // Phase 3: Lines dissolve, field reveals (scroll > 0.3)
      let morph = 0;
      let dissolve = 0;
      let fieldReveal = 0;
      let fieldScroll = 0;

      // Auto morph after 2.5s
      if (elapsed > 2.5) {
        morph = Math.min((elapsed - 2.5) * 0.5, 1.0);
      }
      // Scroll accelerates/overrides
      if (scroll > 0.05) {
        morph = 1.0;
      }
      if (scroll > 0.3) {
        dissolve = smoothstep(0.3, 0.8, scroll);
        fieldReveal = smoothstep(0.3, 1.0, scroll);
        fieldScroll = smoothstep(0.3, 1.2, scroll);
      }

      // ── Update Intro ──
      if (s.introMaterial) {
        s.introMaterial.uniforms.uTime.value = elapsed;
        s.introMaterial.uniforms.uMorph.value = morph;
        s.introMaterial.uniforms.uDissolve.value = dissolve;
        s.introMaterial.uniforms.uOpacity.value = 1.0 - dissolve * 0.8;
      }
      // Hide intro particles once fully dissolved
      if (s.introPoints) {
        s.introPoints.visible = dissolve < 0.99;
      }

      // ── Update Field ──
      if (s.fieldMaterial) {
        const fu = s.fieldMaterial.uniforms;
        fu.uTime.value = elapsed;
        fu.uBass.value = bass;
        fu.uMid.value = effectiveMid;
        fu.uHigh.value = high;
        fu.uVolume.value = effectiveVol;
        fu.uScroll.value = fieldScroll;
        fu.uFieldReveal.value = fieldReveal;
        fu.uN.value = sn;
        fu.uM.value = sm;
        fu.uShapeFn.value = mode.shapeFn;
        fu.uColor1.value.set(c1r, c1g, c1b);
        fu.uColor2.value.set(c2r, c2g, c2b);
      }

      // ── Update Ether ──
      if (s.etherMaterial) {
        s.etherMaterial.uniforms.uTime.value = elapsed;
        s.etherMaterial.uniforms.uScroll.value = fieldScroll;
        s.etherMaterial.uniforms.uMid.value = effectiveMid;
        s.etherMaterial.uniforms.uColor.value.set(c2r, c2g, c2b);
      }

      // ── Background ──
      if (s.scene && s.scene.background instanceof THREE.Color) {
        s.scene.background.setRGB(br, bg, bb);
      }

      // ── Camera ──
      if (s.camera) {
        // Drift in during intro
        const introDrift = Math.min(elapsed * 0.15, 1.0);
        s.camera.position.z = 8.0 - introDrift * 1.5 - fieldScroll * 1.5;
        s.camera.rotation.x = -fieldScroll * 0.35;
      }

      s.renderer.render(s.scene, s.camera);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [audioReady, getFrequencyData]);

  // Sync modeId to ref
  useEffect(() => {
    stateRef.current.modeId = modeId;
  }, [modeId]);

  // Scrolled state for nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleEnableAudio = useCallback(() => { startAudio(); }, [startAudio]);

  // Normalized scroll for control panel visibility
  const controlPanelOpacity = useTransform(scrollY, [600, 900], [0, 1]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-x-hidden">
      <FontStyles />

      {/* ── WebGL Canvas ── */}
      <div ref={canvasContainerRef} className="fixed inset-0 z-0" />

      {/* ── Forest Background (fades in for product section) ── */}
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
            <WaveIcon active={audioReady} />
          </button>
          <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors cursor-pointer" />
        </div>
      </nav>

      {/* ═══ SECTION 1: Cinematic Intro ═══ */}
      <section className="relative h-[200vh] w-full">
        {/* Sticky hero container */}
        <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none">
          {/* The 3D particles handle the "God Is" text */}
          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5, duration: 1 }}
            className="absolute bottom-12 flex flex-col items-center gap-2 z-20"
          >
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-cinzel">Begin the Ritual</span>
            <ChevronDown className="w-4 h-4 text-white/30 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 2: Field + Controls (Chladni Plate) ═══ */}
      <section className="relative z-10 min-h-screen w-full flex flex-col justify-end pb-12 px-6">
        {/* Glass Control Panel */}
        <motion.div
          style={{ opacity: controlPanelOpacity }}
          className="max-w-4xl mx-auto w-full"
        >
          <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex flex-wrap justify-center gap-4">
                {(Object.values(MODES) as (typeof MODES[ModeId])[]).map((m) => (
                  <GlassButton
                    key={m.id}
                    onClick={() => setModeId(m.id as ModeId)}
                    active={modeId === m.id}
                    className="px-6 py-4 min-w-[120px]"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-serif italic text-white">{m.hz}</span>
                      <span className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">{m.label}</span>
                    </div>
                    {modeId === m.id && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
                    )}
                  </GlassButton>
                ))}
              </div>
              <div className="hidden md:flex items-center gap-3">
                <Activity className={`w-4 h-4 ${audioReady ? 'text-white animate-pulse' : 'text-gray-600'}`} />
                <span className="text-[10px] uppercase tracking-widest text-gray-500">
                  {audioReady ? 'Listening' : 'Tap mic to activate'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-12 text-center">
          <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
        </div>
      </section>

      {/* ═══ SECTION 3: The Sonic Infusion (Process) ═══ */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1 }}
        className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/30 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-8 tracking-wide">The Sonic Infusion</h2>
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

      {/* ═══ SECTION 4: Product ═══ */}
      <section className="relative z-10 w-full min-h-screen">
        <div className="md:grid md:grid-cols-2 min-h-screen">
          {/* Left: Product Visual */}
          <div className="sticky top-0 h-screen hidden md:flex items-center justify-center">
            <ProductBottle />
          </div>
          {/* Mobile */}
          <div className="md:hidden py-12"><ProductBottle /></div>

          {/* Right: Pitch & Purchase */}
          <div className="px-6 py-24 md:py-32 md:px-16 flex flex-col justify-center max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6 text-sm font-medium">
              <div className="flex text-mycelium-gold">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <span className="text-white/60 border-b border-white/20 pb-0.5">142 Reviews</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.1] text-white">
              Calm Dose<span className="text-mycelium-gold">.</span>
            </h2>
            <p className="text-lg text-white/70 leading-relaxed mb-6 font-light">
              A wellness supplement formulated with functional mushroom fruiting bodies to support everyday calm and balance.
            </p>
            <p className="text-sm text-white/50 leading-relaxed mb-10 font-mono">
              Grown in a 432Hz sound chamber. This is not just a supplement—it is biological resonance.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {["Anxiety Relief", "Mental Clarity", "Sleep Support", "100% Organic"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <div className="w-5 h-5 rounded-full bg-[#E6F5EC] flex items-center justify-center text-[#009E60]">
                    <Check className="w-3 h-3" />
                  </div>
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
              <Accordion title="Dosage Ritual">
                We recommend you take 1 a day, in the morning, for a <strong>two-day on and two-days off protocol</strong> to maximize the long-term benefits.
              </Accordion>
              <Accordion title="The Frequency Difference">
                Grown in 432Hz (The Miracle Tone). We imbue the biological structure with inherent harmonic stability.
              </Accordion>
            </div>
            <PurchaseWidget />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-16 text-center border-t border-white/5">
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">
          created for Frequency by Empathy Labs
        </p>
      </footer>
    </div>
  );
}
