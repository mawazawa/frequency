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
// BREATH LINE LANDSCAPE CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const BREATH_LINE_COUNT = 48;          // number of horizontal lines
const BREATH_POINTS_PER_LINE = 256;    // vertices per line (smoothness)
const BREATH_WIDTH = 14.0;             // horizontal span in world units
const BREATH_HEIGHT = 6.0;             // vertical span of all lines
const BREATH_DEPTH_RANGE = 2.0;        // z-spread for parallax

// ═══════════════════════════════════════════════════════════════════
// SHADERS — "The Breath" Hero Lines
// ═══════════════════════════════════════════════════════════════════
const breathVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uScroll;       // 0 = hero, 1 = compressed/gone
  uniform float uFadeIn;       // 0 = invisible, 1 = fully visible
  uniform float uAudioActive;  // 0 = ambient only, 1 = mic is live

  attribute float aLineIndex;  // which line (0-1 normalized)
  attribute float aPointT;     // position along line (0-1)

  varying float vAlpha;
  varying float vDisp;

  // ── Simplex-style noise (2D) ──
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute3(vec3 x) { return mod289v3(((x*34.0)+1.0)*x); }

  float snoise2(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289v2(i);
    vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0))
                               + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                             dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x_  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h   = abs(x_) - 0.5;
    vec3 ox  = floor(x_ + 0.5);
    vec3 a0  = x_ - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float x = position.x;
    float baseY = position.y;
    float z = position.z;

    float t = uTime;

    // ── Organic terrain shape (always present) ──
    // Multi-octave noise for the "sleeping body" hills
    float terrain = 0.0;
    terrain += snoise2(vec2(aPointT * 2.0 + 0.3, aLineIndex * 3.0)) * 1.2;
    terrain += snoise2(vec2(aPointT * 4.0 + 1.7, aLineIndex * 5.0 + 0.5)) * 0.5;
    terrain += snoise2(vec2(aPointT * 8.0 - 2.1, aLineIndex * 8.0 + 1.0)) * 0.2;

    // Shape envelope: taper to 0 at horizontal edges (elliptical body)
    float edgeFade = 1.0 - pow(abs(aPointT * 2.0 - 1.0), 2.4);
    // Also taper vertically (top and bottom lines are flatter)
    float vFade = 1.0 - pow(abs(aLineIndex * 2.0 - 1.0), 2.0);
    float envelope = edgeFade * vFade;

    terrain *= envelope;

    // ── Ambient breathing (slow sine undulation) ──
    float breath = sin(t * 0.8 + aPointT * 3.14159 * 2.0) * 0.08
                 + sin(t * 0.5 + aLineIndex * 6.28) * 0.05;
    breath *= envelope;

    // ── Audio-reactive ripples ──
    float dist = length(vec2(aPointT - 0.5, aLineIndex - 0.5)) * 2.0;

    // Bass: large slow waves from center
    float bassRipple = sin(dist * 6.0 - t * 3.0) * uBass * 0.8;
    // Voice/mid: faster surface ripples
    float midRipple = sin(dist * 12.0 - t * 5.0) * uMid * 0.5
                    + sin(dist * 18.0 - t * 7.0 + 1.0) * uMid * 0.25;
    // High: fine texture vibration
    float highRipple = snoise2(vec2(aPointT * 30.0 + t * 3.0, aLineIndex * 20.0)) * uHigh * 0.3;

    float audioDisp = (bassRipple + midRipple + highRipple) * envelope;

    // Total Y displacement
    float totalDisp = terrain * 0.7 + breath + audioDisp;

    // ── Scroll compression ──
    // As user scrolls, the landscape flattens and moves up/away
    float scrollFactor = 1.0 - uScroll;
    totalDisp *= scrollFactor;
    // Compress vertical spread
    float ySpread = mix(0.1, 1.0, scrollFactor);

    vec3 finalPos;
    finalPos.x = x;
    finalPos.y = baseY * ySpread + totalDisp;
    finalPos.z = z;

    // Move the whole form up as it compresses
    finalPos.y += uScroll * 3.0;

    vDisp = abs(totalDisp);
    // Alpha: fade at edges, fade with scroll, respect fadeIn
    vAlpha = envelope * 0.3 + 0.7;
    vAlpha *= uFadeIn;
    vAlpha *= scrollFactor;
    // Boost alpha slightly when audio is active and displacement is high
    vAlpha += vDisp * 0.3 * uAudioActive;
    vAlpha = clamp(vAlpha, 0.0, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

const breathFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vDisp;

  void main() {
    // Silver-white with slight brightness variation from displacement
    float brightness = 0.75 + vDisp * 0.5;
    brightness = min(brightness, 1.0);
    vec3 color = vec3(brightness, brightness, brightness * 1.02);
    gl_FragColor = vec4(color, vAlpha * 0.85);
  }
`;

// ═══════════════════════════════════════════════════════════════════
// SHADERS — Chladni Field
// ═══════════════════════════════════════════════════════════════════
const fieldVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uVolume;
  uniform float uScroll;
  uniform float uFieldReveal;
  uniform float uN;
  uniform float uM;
  uniform int uShapeFn;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying float vDisplacement;
  varying vec2 vUv;
  varying float vDist;

  float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
  float noise(vec2 x) {
    vec2 i = floor(x); vec2 f = fract(x);
    float a = hash(i); float b = hash(i + vec2(1,0));
    float c = hash(i + vec2(0,1)); float d = hash(i + vec2(1,1));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
  }

  float chladni(vec2 p, float n, float m, float a, float b) {
    float PI = 3.14159265;
    return a*sin(PI*n*p.x)*sin(PI*m*p.y) + b*sin(PI*m*p.x)*sin(PI*n*p.y);
  }

  void main() {
    vUv = uv;
    vec2 pos = uv * 2.0 - 1.0;
    vDist = length(pos);
    float t = uTime;
    float n = uN + uBass * 2.0;
    float m = uM + uMid * 3.0;
    float chladni1 = chladni(pos, n, m, 1.0, -1.0);
    float chladni2 = chladni(pos, n+2.0, m+1.0, 0.5, 0.5);
    float displacement = 0.0;

    if (uShapeFn == 0) {
      displacement = chladni1 * (0.5 + uVolume * 2.5);
      displacement += chladni2 * uBass * 0.5;
      displacement *= 1.0 + sin(t * 0.5) * 0.15;
    } else if (uShapeFn == 1) {
      float crystal = chladni(pos, floor(n), floor(m), 1.0, 1.0);
      vec2 grid = abs(fract(pos*(3.0+uBass))-0.5);
      float gridP = 1.0-max(grid.x,grid.y);
      displacement = mix(crystal, gridP, 0.5)*(0.5+uVolume*3.0);
      displacement *= cos(t*1.5+vDist*4.0);
      displacement += uMid*noise(pos*10.0+t)*1.5;
    } else {
      float turb = chladni1 + 0.5*chladni2;
      float n1 = noise(pos*4.0+t*0.5);
      displacement = (turb*0.6+n1*0.4)*(0.5+uVolume*4.0);
      displacement += sin(vDist*8.0-t)*uMid*2.0;
      displacement += uHigh*noise(pos*20.0+t*2.0)*1.5;
    }

    vec3 newPos = position;
    newPos.z += displacement;
    float horizonFactor = pow(uScroll, 2.5);
    float bandNoise = noise(pos.xy*5.0+t)*0.3*(1.0-horizonFactor);
    newPos.y *= mix(0.12, 1.0, horizonFactor);
    newPos.y += bandNoise;
    newPos.z *= mix(0.5, 1.0, uScroll);
    vDisplacement = abs(displacement);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    float ptSize = (2.0+uMid*4.0+vDisplacement*1.5)*(8.0/-mvPosition.z);
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
    if (length(gl_PointCoord-0.5)>0.5) discard;
    vec3 color = mix(uColor1, uColor2, smoothstep(0.0,1.5,vDisplacement));
    float alpha = 1.0-smoothstep(0.6,1.0,vDist);
    float glow = 1.0+uMid*1.5;
    float lineGlow = mix(2.0,1.0,uScroll);
    alpha *= uFieldReveal;
    gl_FragColor = vec4(color*glow*lineGlow, alpha);
  }
`;

// ═══════════════════════════════════════════════════════════════════
// SHADERS — Ether Background Particles
// ═══════════════════════════════════════════════════════════════════
const etherVertexShader = /* glsl */ `
  uniform float uTime; uniform float uScroll; uniform float uMid;
  attribute vec3 aRandom;
  void main() {
    vec3 pos = position;
    pos.x += sin(uTime*0.5*aRandom.x)*0.5;
    pos.y += cos(uTime*0.3*aRandom.y)*0.5;
    pos.z += uMid*aRandom.z*5.0;
    pos.y *= mix(0.08, 1.0, pow(uScroll, 2.0));
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
      active ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
             : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
      className
    )}>
    <div className="absolute inset-[1px] rounded-2xl border border-white/20 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    <div className="relative z-10">{children}</div>
  </button>
);

const ProductBottle = () => (
  <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center">
    <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 1, ease: "easeOut" }}
      className="relative z-10 w-64 md:w-80 aspect-[3/5] rounded-[40px] shadow-2xl overflow-hidden backdrop-blur-sm border border-white/20"
      style={{ background: "linear-gradient(135deg, rgba(40,40,40,0.95) 0%, rgba(20,20,20,1) 100%)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.1)" }}>
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
// BREATH LINE GEOMETRY BUILDER
// ═══════════════════════════════════════════════════════════════════
function buildBreathLines(): { geometry: THREE.BufferGeometry; lineStartIndices: number[] } {
  // Each line = BREATH_POINTS_PER_LINE vertices
  // Total vertices = BREATH_LINE_COUNT * BREATH_POINTS_PER_LINE
  const totalVerts = BREATH_LINE_COUNT * BREATH_POINTS_PER_LINE;
  const positions = new Float32Array(totalVerts * 3);
  const lineIndices = new Float32Array(totalVerts);   // aLineIndex: 0-1
  const pointTs = new Float32Array(totalVerts);        // aPointT: 0-1

  // For LineSegments we need pairs: (p0,p1), (p1,p2), ...
  // Total segments per line = BREATH_POINTS_PER_LINE - 1
  // Total indices = BREATH_LINE_COUNT * (BREATH_POINTS_PER_LINE - 1) * 2
  const segsPerLine = BREATH_POINTS_PER_LINE - 1;
  const totalIndices = BREATH_LINE_COUNT * segsPerLine * 2;
  const indices = new Uint32Array(totalIndices);

  const lineStartIndexArray: number[] = [];
  let idxPtr = 0;

  for (let l = 0; l < BREATH_LINE_COUNT; l++) {
    const lNorm = l / (BREATH_LINE_COUNT - 1);         // 0→1
    const baseY = (lNorm - 0.5) * BREATH_HEIGHT;       // centered
    const z = (Math.random() - 0.5) * BREATH_DEPTH_RANGE; // slight z variation per line
    const vertOffset = l * BREATH_POINTS_PER_LINE;

    lineStartIndexArray.push(vertOffset);

    for (let p = 0; p < BREATH_POINTS_PER_LINE; p++) {
      const pNorm = p / (BREATH_POINTS_PER_LINE - 1);  // 0→1
      const x = (pNorm - 0.5) * BREATH_WIDTH;
      const vi = vertOffset + p;

      positions[vi * 3]     = x;
      positions[vi * 3 + 1] = baseY;
      positions[vi * 3 + 2] = z;

      lineIndices[vi] = lNorm;
      pointTs[vi]     = pNorm;
    }

    // Index pairs for this line's segments
    for (let s = 0; s < segsPerLine; s++) {
      indices[idxPtr++] = vertOffset + s;
      indices[idxPtr++] = vertOffset + s + 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aLineIndex', new THREE.BufferAttribute(lineIndices, 1));
  geometry.setAttribute('aPointT', new THREE.BufferAttribute(pointTs, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return { geometry, lineStartIndices: lineStartIndexArray };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function V12Page() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [modeId, setModeId] = useState<ModeId>('genesis');
  const [showMicPrompt, setShowMicPrompt] = useState(true);
  const { isReady: audioReady, startAudio, getFrequencyData } = useMicAudio();

  const sceneRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    breathMaterial?: THREE.ShaderMaterial;
    breathLines?: THREE.LineSegments;
    fieldMaterial?: THREE.ShaderMaterial;
    fieldPoints?: THREE.Points;
    etherMaterial?: THREE.ShaderMaterial;
    etherPoints?: THREE.Points;
  }>({});

  const physicsRef = useRef({
    bass: new Spring(0), mid: new Spring(0), high: new Spring(0), vol: new Spring(0),
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
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── 1. "The Breath" — Line Landscape ──
    const { geometry: breathGeo } = buildBreathLines();
    const breathMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:        { value: 0 },
        uBass:        { value: 0 },
        uMid:         { value: 0 },
        uHigh:        { value: 0 },
        uScroll:      { value: 0 },
        uFadeIn:      { value: 0 },
        uAudioActive: { value: 0 },
      },
      vertexShader: breathVertexShader,
      fragmentShader: breathFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const breathLines = new THREE.LineSegments(breathGeo, breathMat);
    scene.add(breathLines);

    // ── 2. Chladni Field ──
    const fieldGeo = new THREE.PlaneGeometry(8, 8, 220, 220);
    const fieldMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
        uVolume: { value: 0 }, uScroll: { value: 0 }, uFieldReveal: { value: 0 },
        uN: { value: MODES.genesis.n }, uM: { value: MODES.genesis.m },
        uShapeMix: { value: 0 }, uShapeFn: { value: 0 },
        uColor1: { value: new THREE.Vector3(...MODES.genesis.color1) },
        uColor2: { value: new THREE.Vector3(...MODES.genesis.color2) },
      },
      vertexShader: fieldVertexShader,
      fragmentShader: fieldFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const fieldPoints = new THREE.Points(fieldGeo, fieldMat);
    fieldPoints.rotation.x = -0.2;
    scene.add(fieldPoints);

    // ── 3. Ether Background Particles ──
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
      uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uMid: { value: 0 }, uColor: { value: new THREE.Vector3(...MODES.genesis.color2) } },
      vertexShader: etherVertexShader, fragmentShader: etherFragmentShader,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const etherPoints = new THREE.Points(etherGeo, etherMat);
    scene.add(etherPoints);

    sceneRef.current = { renderer, scene, camera, breathMaterial: breathMat, breathLines, fieldMaterial: fieldMat, fieldPoints, etherMaterial: etherMat, etherPoints };
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

      // ── Phase logic ──
      // Breath fade in over first 2s
      const breathFadeIn = Math.min(elapsed / 2.0, 1.0);
      // Scroll phases
      const breathScroll = smoothstep(0.0, 1.0, scroll);      // breath compresses 0→1vh
      const fieldReveal  = smoothstep(0.5, 1.2, scroll);       // field fades in
      const fieldScroll  = smoothstep(0.5, 1.5, scroll);       // field horizon unfold

      // ── Update Breath Lines ──
      if (s.breathMaterial) {
        const bu = s.breathMaterial.uniforms;
        bu.uTime.value = elapsed;
        bu.uBass.value = bass;
        bu.uMid.value = effectiveMid;
        bu.uHigh.value = high;
        bu.uScroll.value = breathScroll;
        bu.uFadeIn.value = breathFadeIn;
        bu.uAudioActive.value = audioReady ? 1.0 : 0.0;
      }
      if (s.breathLines) {
        s.breathLines.visible = breathScroll < 0.99;
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

      // ── Background color ──
      if (s.scene && s.scene.background instanceof THREE.Color) {
        // Stay black during breath, transition to mode bg as field reveals
        const bgMix = fieldReveal;
        s.scene.background.setRGB(br * bgMix, bgv * bgMix, bb * bgMix);
      }

      // ── Camera ──
      if (s.camera) {
        s.camera.position.z = 7.0 - fieldScroll * 1.5;
        s.camera.rotation.x = -fieldScroll * 0.35;
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
    setShowMicPrompt(false);
  }, [startAudio]);

  const handleDismissPrompt = useCallback(() => {
    setShowMicPrompt(false);
  }, []);

  const controlPanelOpacity = useTransform(scrollY, [600, 900], [0, 1]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 overflow-x-hidden">
      <FontStyles />

      {/* ── Mic Prompt Overlay ── */}
      <AnimatePresence>
        {showMicPrompt && !audioReady && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            {/* Mushroom imagery behind the prompt */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img src="/images/mushroom-cluster.jpg" alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[600px] opacity-[0.12] object-contain" />
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

      {/* ── WebGL Canvas ── */}
      <div ref={canvasContainerRef} className="fixed inset-0 z-0" />

      {/* ── Dark mushroom imagery (ambient background layers) ── */}
      <div className="fixed inset-0 z-[0] pointer-events-none overflow-hidden">
        {/* Left edge: plant/moss */}
        <img src="/images/plant-dark.jpg" alt="" className="absolute left-0 top-0 h-full w-[30vw] object-cover opacity-[0.06] mask-image-gradient-r" 
          style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
        {/* Right edge: mushroom smoke (flipped) */}
        <img src="/images/mushroom-smoke.jpg" alt="" className="absolute right-0 top-0 h-full w-[30vw] object-cover opacity-[0.06] scale-x-[-1]"
          style={{ maskImage: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />
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
            <WaveIcon active={audioReady} />
          </button>
          <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors cursor-pointer" />
        </div>
      </nav>

      {/* ═══ SECTION 1: "The Breath" Hero ═══ */}
      <section className="relative h-[200vh] w-full">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center pointer-events-none">
          {/* Typography overlay — clean text over the breathing lines */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 1.5, ease: "easeOut" }}
            className="relative z-10 text-center select-none"
          >
            <h1 className="flex flex-col items-center">
              <span className="text-4xl md:text-6xl font-light tracking-[0.15em] uppercase text-white/70 font-cinzel block mb-3">
                God is
              </span>
              <span className="font-playfair italic text-6xl md:text-9xl text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]">
                Frequency
              </span>
            </h1>
          </motion.div>

          {/* Mic button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 1 }}
            className="absolute bottom-32 z-20 pointer-events-auto"
          >
            <GlassButton onClick={handleEnableAudio} active={audioReady} className="w-20 h-20 rounded-full flex items-center justify-center">
              <WaveIcon active={audioReady} />
            </GlassButton>
            <div className="mt-4 text-center">
              <span className="text-[10px] uppercase tracking-[0.4em] text-gray-500">
                {audioReady ? 'Listening' : 'Find your Frequency'}
              </span>
            </div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 4, duration: 1 }}
            className="absolute bottom-8 flex flex-col items-center gap-2 z-20"
          >
            <span className="text-[10px] uppercase tracking-widest text-white/25 font-cinzel">Scroll to Enter the Field</span>
            <ChevronDown className="w-4 h-4 text-white/25 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ═══ SECTION 2: Field + Controls (Chladni Plate) ═══ */}
      <section className="relative z-10 min-h-screen w-full flex flex-col justify-end pb-12 px-6">
        <motion.div style={{ opacity: controlPanelOpacity }} className="max-w-4xl mx-auto w-full">
          <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
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

      {/* ── Mushroom Hero Image (between field and infusion) ── */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 w-full py-16 md:py-24 flex items-center justify-center"
      >
        <div className="relative w-[80vw] max-w-[500px] aspect-square">
          <img src="/images/mushroom-cluster.jpg" alt="Frequency Mushroom Cluster" className="w-full h-full object-contain opacity-90" />
          {/* Glow behind the mushroom */}
          <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full -z-10" />
        </div>
      </motion.section>

      {/* ═══ SECTION 3: The Sonic Infusion ═══ */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 1 }}
        className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/30 backdrop-blur-sm">
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
          <div className="sticky top-0 h-screen hidden md:flex items-center justify-center"><ProductBottle /></div>
          <div className="md:hidden py-12"><ProductBottle /></div>
          <div className="px-6 py-24 md:py-32 md:px-16 flex flex-col justify-center max-w-2xl mx-auto backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6 text-sm font-medium">
              <div className="flex text-mycelium-gold">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}</div>
              <span className="text-white/60 border-b border-white/20 pb-0.5">142 Reviews</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.1] text-white">Calm Dose<span className="text-mycelium-gold">.</span></h2>
            <p className="text-lg text-white/70 leading-relaxed mb-6 font-light">A wellness supplement formulated with functional mushroom fruiting bodies to support everyday calm and balance.</p>
            <p className="text-sm text-white/50 leading-relaxed mb-10 font-mono">Grown in a 432Hz sound chamber. This is not just a supplement—it is biological resonance.</p>
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

      <footer className="relative z-10 py-16 text-center border-t border-white/5">
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em]">created for Frequency by Empathy Labs</p>
      </footer>
    </div>
  );
}
