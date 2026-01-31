'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── palette ─── */
const navy = '#1a2744';
const gold = '#d4a017';
const bg = '#f8f9fb';

/* ═══════════════════════════════════════════════════════════════════
   LIGHT-MODE PARTICLE FIELD — Liquid Justice aesthetic
   Slow, silver/navy particles drifting with curl noise.
   ═══════════════════════════════════════════════════════════════════ */

const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aPhase;
  attribute float aScale;
  varying float vAlpha;
  varying float vPhase;

  // simplex helpers
  vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  vec3 curlNoise(vec3 p){
    const float e=0.1;
    vec3 dx=vec3(e,0,0), dy=vec3(0,e,0), dz=vec3(0,0,e);
    float x=snoise(p+dy).x-snoise(p-dy).x - snoise(p+dz).x+snoise(p-dz).x;
    float y=snoise(p+dz).x-snoise(p-dz).x - snoise(p+dx).x+snoise(p-dx).x;
    float z=snoise(p+dx).x-snoise(p-dx).x - snoise(p+dy).x+snoise(p-dy).x;
    return normalize(vec3(x,y,z))/(2.0*e);
  }

  void main(){
    vec3 pos = position;
    float t = uTime * 0.08 + aPhase * 6.28;

    // Gentle curl displacement
    vec3 curl = curlNoise(pos * 0.3 + t * 0.5) * 0.6;
    pos += curl;

    // Slow vertical drift
    pos.y += sin(t * 0.5 + aPhase * 3.14) * 0.15;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * (8.0 / -mv.z);

    // Fade based on depth & phase
    vAlpha = smoothstep(-12.0, -2.0, mv.z) * (0.3 + 0.4 * sin(t * 0.7));
    vPhase = aPhase;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vPhase;
  uniform vec3 uColor;

  void main(){
    float r = distance(gl_PointCoord, vec2(0.5));
    if(r > 0.5) discard;
    float soft = 1.0 - smoothstep(0.2, 0.5, r);
    // Mix between silver and a faint navy
    vec3 col = mix(uColor, vec3(0.75, 0.78, 0.85), vPhase);
    gl_FragColor = vec4(col, soft * vAlpha * 0.45);
  }
`;

function LightParticles() {
  const count = 800;
  const meshRef = useRef<THREE.Points>(null!);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Spread in a wide, shallow volume
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
      phases[i] = Math.random();
      scales[i] = 0.5 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 3.0 },
        uColor: { value: new THREE.Vector3(0.10, 0.15, 0.27) }, // navy tint
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    return { geometry: geo, material: mat };
  }, []);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points ref={meshRef} geometry={geometry} material={material} />;
}

function ParticleCanvas() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}
        style={{ background: 'transparent' }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <LightParticles />
        </Suspense>
      </Canvas>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const textClass = size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative">
        <span className={textClass} style={{ color: gold }}>⚖️</span>
      </div>
      <span className={`${textClass} font-semibold tracking-tight`} style={{ color: navy }}>
        Justice<span className="font-light">OS</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full ml-0.5 -translate-y-2" style={{ background: gold }} />
      </span>
    </div>
  );
}

type CalloutVariant = 'warning' | 'tip' | 'important' | 'success' | 'key';

const calloutStyles: Record<CalloutVariant, { border: string; bg: string; icon: string }> = {
  warning:   { border: '#f59e0b', bg: '#fffbeb', icon: '⚠️' },
  tip:       { border: '#3b82f6', bg: '#eff6ff', icon: '💡' },
  important: { border: '#ef4444', bg: '#fef2f2', icon: '🚨' },
  success:   { border: '#22c55e', bg: '#f0fdf4', icon: '✅' },
  key:       { border: '#8b5cf6', bg: '#f5f3ff', icon: '🔑' },
};

function Callout({ variant, title, children }: { variant: CalloutVariant; title?: string; children: React.ReactNode }) {
  const s = calloutStyles[variant];
  return (
    <div className="rounded-lg p-4 my-4 text-sm leading-relaxed" style={{ borderLeft: `4px solid ${s.border}`, background: s.bg }}>
      {title && <p className="font-semibold mb-1">{s.icon} {title}</p>}
      {!title && <span className="mr-1">{s.icon}</span>}
      {children}
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg my-3 overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-medium text-sm hover:bg-gray-50 transition-colors"
        style={{ color: navy }}
      >
        {title}
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      <div className={`transition-all duration-300 ${open ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-4 pb-4 text-sm leading-relaxed text-gray-700">{children}</div>
      </div>
    </div>
  );
}

interface TimelineEvent {
  date: string;
  text: string;
  color: string;
}

function VerticalTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-6 my-6">
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200" />
      {events.map((e, i) => (
        <div key={i} className="relative mb-6 last:mb-0">
          <div className="absolute -left-3.5 top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: e.color }} />
          <div className="ml-4">
            <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: e.color }}>{e.date}</p>
            <p className="text-sm text-gray-700 leading-snug">{e.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DecisionTree() {
  return (
    <div className="my-6 overflow-x-auto">
      <div className="flex flex-col items-center min-w-[340px]">
        <div className="px-5 py-3 rounded-lg text-white text-sm font-semibold text-center" style={{ background: navy }}>
          Do you own &amp; live in the home?
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <div className="flex gap-12 items-start">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-green-600 mb-1">YES</span>
            <div className="w-px h-4 bg-gray-300" />
            <div className="px-4 py-2 rounded-lg border text-sm text-center" style={{ borderColor: '#22c55e', background: '#f0fdf4' }}>
              Is there only <strong>ONE</strong> renter<br/>in the same dwelling?
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div className="flex gap-8 items-start">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-green-600 mb-1">YES</span>
                <div className="w-px h-4 bg-gray-300" />
                <div className="px-4 py-2 rounded-lg text-white text-xs text-center font-semibold" style={{ background: '#22c55e' }}>
                  🎉 LODGER<br/>Simple route<br/>§ 1946.5
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-red-500 mb-1">NO</span>
                <div className="w-px h-4 bg-gray-300" />
                <div className="px-4 py-2 rounded-lg text-white text-xs text-center font-semibold" style={{ background: '#ef4444' }}>
                  ⚖️ TENANT<br/>Unlawful Detainer<br/>required
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-red-500 mb-1">NO</span>
            <div className="w-px h-4 bg-gray-300" />
            <div className="px-4 py-2 rounded-lg text-white text-xs text-center font-semibold" style={{ background: '#ef4444' }}>
              ⚖️ TENANT<br/>Unlawful Detainer<br/>required
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessBar() {
  const steps = [
    { label: 'Serve 30-Day Notice', day: 'Day 1', pct: 0 },
    { label: 'Notice Expires', day: 'Day 30', pct: 38 },
    { label: 'File UD', day: 'Day 31', pct: 42 },
    { label: 'Serve Complaint', day: 'Day 35', pct: 48 },
    { label: 'Response Due', day: '~Day 49', pct: 62 },
    { label: 'Trial', day: '~Day 60', pct: 78 },
    { label: 'Sheriff Lockout', day: '~Day 70', pct: 100 },
  ];
  return (
    <div className="my-6 overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="relative h-3 rounded-full bg-gray-200 mx-4">
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: '100%', background: `linear-gradient(90deg, ${navy}, #3b6db5)` }} />
        </div>
        <div className="relative mt-1 mx-4 h-28">
          {steps.map((s, i) => (
            <div key={i} className="absolute flex flex-col items-center" style={{ left: `${s.pct}%`, transform: 'translateX(-50%)' }}>
              <div className="w-3 h-3 rounded-full border-2 border-white -mt-4" style={{ background: i === steps.length - 1 ? '#22c55e' : navy }} />
              <p className="text-[10px] font-bold mt-1 whitespace-nowrap" style={{ color: navy }}>{s.day}</p>
              <p className="text-[10px] text-gray-500 text-center whitespace-nowrap leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckItem({ children, phase }: { children: React.ReactNode; phase?: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} className="mt-0.5 w-4 h-4 rounded accent-[#1a2744]" />
      <span className={`text-sm leading-snug ${checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
        {phase && <span className="text-xs font-semibold uppercase tracking-wide mr-1.5" style={{ color: gold }}>{phase}</span>}
        {children}
      </span>
    </label>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 font-semibold text-white text-xs uppercase tracking-wide" style={{ background: navy }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-gray-700 border-b border-gray-100">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2 hover:opacity-70 transition-opacity" style={{ color: '#2563eb' }}>{children}</a>;
}

function SectionHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <h2 id={id} className="text-xl font-bold mt-12 mb-4 pt-4 scroll-mt-20 flex items-baseline gap-3" style={{ color: navy, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <span className="text-sm font-bold px-2 py-0.5 rounded text-white shrink-0" style={{ background: navy }}>{number}</span>
      {title}
    </h2>
  );
}

/* ── TOC Data ── */
const tocSections = [
  { id: 'timeline', label: 'Timeline of Events' },
  { id: 'lodger-vs-tenant', label: '1. Lodger vs. Tenant' },
  { id: 'lodger-route', label: '2. The Lodger Route' },
  { id: 'tenant-route', label: '3. Unlawful Detainer' },
  { id: 'serving-notice', label: '4. Serving the Notice' },
  { id: 'without-lawyer', label: '5. Without a Lawyer?' },
  { id: 'his-restraining-order', label: '6. His RO Claim' },
  { id: 'your-restraining-order', label: '7. File YOUR RO' },
  { id: 'property-damage', label: '8. Property Damage' },
  { id: 'safety', label: '9. Safety Planning' },
  { id: 'action-plan', label: '10. Action Plan' },
  { id: 'resources', label: '11. Resources & Links' },
];

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */

export default function StacyReport() {
  const [activeId, setActiveId] = useState('');
  const [tocOpen, setTocOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    tocSections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setTocOpen(false);
  }

  const timelineEvents: TimelineEvent[] = [
    { date: 'Aug 5, 2025', text: 'Harris Silver joins Topanga Homesharing group — looking for "long term situation… roommate situation"', color: '#6b7280' },
    { date: 'Oct 23, 2025', text: 'Stacy posts room available: "$2k/month in the PO tract, over an acre and a half, women committed to community living. Starting 11/1"', color: '#3b82f6' },
    { date: 'Oct 27, 2025', text: 'Stacy deletes ~20 messages in quick succession (possibly removing early Harris interactions)', color: '#f59e0b' },
    { date: '~Nov 1, 2025', text: 'Harris moves in (based on listing start date)', color: '#8b5cf6' },
    { date: 'Nov 7, 2025', text: 'Harris comments snarkily on another listing: "60k a year for this boring bathtub-less box?"', color: '#6b7280' },
    { date: 'Jan 25, 2026', text: 'Scott Vineberg creates "Housemate Support 26" WhatsApp group for Stacy', color: '#3b82f6' },
    { date: 'Jan 28, 2026', text: '"Today his attitude changed and he promised me he was leaving"', color: '#22c55e' },
    { date: 'Jan 29, 2026', text: '"He has finally started looking for a new place" — asks about unlawful detainer process', color: '#f59e0b' },
    { date: 'Jan 30, 2026', text: '"He completely destroyed a gate… broke the slats… blaming me for his inability to find a place"', color: '#ef4444' },
    { date: 'Jan 30, 2026', text: '"He told me he issued a restraining order on ME" — had to call police again', color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen" style={{ background: bg, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'rgba(248,249,251,0.85)', borderColor: '#e5e7eb' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#e0e7ff', color: navy }}>Case Research Report</span>
            <button onClick={() => setTocOpen(!tocOpen)} className="lg:hidden p-2 rounded-md hover:bg-gray-100" aria-label="Table of contents">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={navy}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ═══ HERO with particles ═══ */}
      <section className="relative overflow-hidden" style={{ minHeight: '340px' }}>
        <ParticleCanvas />
        <div className="relative z-10 max-w-5xl mx-auto px-4 flex items-center" style={{ minHeight: '340px' }}>
          <div className="py-12">
            {/* Product badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border" style={{ borderColor: gold, color: gold }}>
                AI Legal Research
              </span>
              <span className="text-[10px] text-gray-400">by</span>
              <Logo size="sm" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4" style={{ color: navy }}>
              Removing a Housemate<br className="hidden sm:block" />
              <span className="relative">
                from Your Home
                <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full opacity-30" style={{ background: gold }} />
              </span>
              <span className="text-gray-400 text-2xl sm:text-3xl md:text-4xl font-light block sm:inline"> in Topanga, CA</span>
            </h1>
            <p className="text-sm text-gray-500 max-w-lg mb-6">
              Comprehensive legal research report covering California lodger law, unlawful detainer procedures, restraining orders, and a step-by-step action plan — compiled and analyzed by JusticeOS.ai.
            </p>
            <div className="flex flex-wrap gap-3 text-[11px]">
              {['Lodger vs. Tenant Analysis', 'Unlawful Detainer Guide', 'Restraining Order Strategy', 'Safety Plan'].map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-gray-200 text-gray-600 font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Fade to content */}
        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: `linear-gradient(transparent, ${bg})` }} />
      </section>

      <div className="max-w-5xl mx-auto px-4 flex gap-8 relative">
        {/* ── Sidebar TOC (desktop) ── */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-20 py-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contents</p>
            <ul className="space-y-1">
              {tocSections.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollTo(s.id)}
                    className={`block w-full text-left text-xs py-1.5 px-2.5 rounded transition-all duration-200 ${activeId === s.id ? 'font-semibold text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                    style={activeId === s.id ? { background: navy } : {}}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
            {/* JusticeOS CTA in sidebar */}
            <div className="mt-6 p-3 rounded-lg border text-center" style={{ borderColor: `${gold}40`, background: `${gold}08` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: gold }}>Powered by</p>
              <p className="text-xs font-semibold" style={{ color: navy }}>JusticeOS.ai</p>
              <p className="text-[10px] text-gray-500 mt-1">AI-powered legal case management</p>
            </div>
          </nav>
        </aside>

        {/* ── Mobile TOC ── */}
        {tocOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setTocOpen(false)} />
            <nav className="absolute left-0 top-14 bottom-0 w-64 bg-white shadow-xl p-4 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Contents</p>
              <ul className="space-y-1">
                {tocSections.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className={`block w-full text-left text-sm py-2 px-3 rounded ${activeId === s.id ? 'font-semibold text-white' : 'text-gray-600'}`}
                      style={activeId === s.id ? { background: navy } : {}}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}

        {/* ═══ Main Content ═══ */}
        <main ref={mainRef} className="flex-1 max-w-[800px] py-8 pb-20">

          <Callout variant="warning" title="Disclaimer">
            <span>This is legal research and information, <strong>NOT legal advice</strong>. Every situation is different. Consider consulting with a California landlord-tenant attorney for advice specific to your situation. Many offer free or low-cost consultations.</span>
          </Callout>

          {/* ── Timeline ── */}
          <h2 id="timeline" className="text-xl font-bold mt-10 mb-4 pt-4 scroll-mt-20" style={{ color: navy }}>
            📅 Timeline of Events
          </h2>
          <p className="text-sm text-gray-600 mb-4">Evidence compiled from WhatsApp chat logs and analyzed by JusticeOS:</p>
          <VerticalTimeline events={timelineEvents} />

          {/* ── Section 1: Lodger vs Tenant ── */}
          <SectionHeading id="lodger-vs-tenant" number="01" title="The Big Question: Lodger vs. Tenant" />
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            This is the <strong>single most important thing</strong> to figure out, because it changes everything about the process.
          </p>

          <Accordion title="What is a &quot;Lodger&quot;?" defaultOpen={true}>
            <p className="mb-3">Under <ExtLink href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.5.&lawCode=CIV">California Civil Code § 1946.5</ExtLink>, a &quot;lodger&quot; is someone who:</p>
            <ul className="list-disc ml-5 space-y-1 mb-3">
              <li>Rents a room within a dwelling unit</li>
              <li>The <strong>owner personally lives in</strong> the same dwelling</li>
              <li>The owner retains access to all areas of the home</li>
              <li>There is only <strong>one</strong> lodger (this is key!)</li>
            </ul>
          </Accordion>

          <h3 className="font-semibold text-base mt-6 mb-2" style={{ color: navy }}>Why This Matters</h3>
          <div className="grid sm:grid-cols-2 gap-4 my-4">
            <div className="rounded-lg p-4 border-2" style={{ borderColor: '#22c55e', background: '#f0fdf4' }}>
              <p className="font-semibold text-sm mb-2" style={{ color: '#16a34a' }}>✅ If LODGER</p>
              <ul className="text-xs space-y-1.5 text-gray-700">
                <li>No formal eviction process needed</li>
                <li>After notice expires → he&apos;s a <strong>trespasser</strong></li>
                <li>Police can remove him (Penal Code § 602.3)</li>
                <li>No court filing required</li>
              </ul>
            </div>
            <div className="rounded-lg p-4 border-2" style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
              <p className="font-semibold text-sm mb-2" style={{ color: '#dc2626' }}>⚖️ If TENANT</p>
              <ul className="text-xs space-y-1.5 text-gray-700">
                <li>Full unlawful detainer court process</li>
                <li>Takes 5–8+ weeks</li>
                <li>Self-help eviction is <strong>illegal</strong></li>
                <li>Filing fees ~$385–$435</li>
              </ul>
            </div>
          </div>

          <Callout variant="success">
            <span>Based on your situation — you own the home, you live there, Harris rents a room — he is very likely a <strong>single lodger</strong> under California law. This is good news.</span>
          </Callout>

          <Callout variant="important" title='The "Other Renter" Issue'>
            <span>
              Stacy mentioned &quot;my other renter&quot; on Jan 30. Under <ExtLink href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.5.&lawCode=CIV">Civil Code § 1946.5</ExtLink>, the lodger exception applies <strong>ONLY</strong> when there is a single lodger. If there are two renters in the same dwelling unit, the lodger route likely does <strong>not</strong> apply.<br /><br />
              <strong>However</strong> — if the other renter is in a completely separate unit (guest house / ADU on the 1.5-acre property), courts may treat them as separate dwelling units and Harris could still qualify as a lodger.
            </span>
          </Callout>

          <Callout variant="key" title="Key Question for Stacy">
            <span>Does the other renter share the same dwelling unit as you and Harris, or are they in a separate structure? This answer determines whether the simpler lodger route is available.</span>
          </Callout>

          <h3 className="font-semibold text-base mt-6 mb-3" style={{ color: navy }}>Decision Tree: Lodger or Tenant?</h3>
          <DecisionTree />

          <Callout variant="tip" title="AB 474 Status Update">
            <span>
              California AB 474 was originally introduced in 2025 to repeal the lodger law, but was <strong>amended</strong> to address a different topic, <strong>vetoed by Governor Newsom</strong> on Oct 1, 2025, and stricken from file on Jan 22, 2026. The lodger law (§ 1946.5) remains <strong>fully in effect</strong>. (<ExtLink href="https://leginfo.legislature.ca.gov/faces/billStatusClient.xhtml?bill_id=202520260AB474">AB 474 bill status</ExtLink>)
            </span>
          </Callout>

          {/* ── Section 2: Lodger Route ── */}
          <SectionHeading id="lodger-route" number="02" title="Option A: The Lodger Route (Simpler)" />

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Step 1: Give Written 30-Day Notice</h3>
              <p className="text-sm text-gray-700 mb-3">
                Give Harris a written 30-day notice to terminate his tenancy (30 days since he&apos;s been there less than a year).
              </p>
              <p className="text-sm text-gray-700 mb-2">The notice should include:</p>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1 mb-3">
                <li>His full name</li>
                <li>Address of the property</li>
                <li>Clear statement terminating his right to occupy</li>
                <li>Date notice is served & date he must vacate</li>
                <li>Your signature</li>
              </ul>
              <Accordion title="Sample Notice Language">
                <div className="bg-gray-50 rounded p-3 text-xs italic text-gray-600 border border-gray-200">
                  &quot;Dear [Harris&apos;s full name], This letter serves as notice that your right to occupy the room at [address], Topanga, CA [zip] is hereby terminated. You must vacate the premises no later than [date — 30 days from service]. This notice is given pursuant to California Civil Code §§ 1946 and 1946.5.&quot;
                </div>
              </Accordion>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Step 2: Serve the Notice</h3>
              <p className="text-sm text-gray-700">See <button onClick={() => scrollTo('serving-notice')} className="underline" style={{ color: '#2563eb' }}>Section 4</button> for proper service methods.</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Step 3: After 30 Days Expire</h3>
              <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1.5">
                <li>Under <ExtLink href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.5.&lawCode=CIV">Civil Code § 1946.5</ExtLink>, he becomes a <strong>trespasser</strong></li>
                <li>Call LASD Malibu/Lost Hills Station</li>
                <li>Explain: single lodger, owner-occupied, notice expired</li>
                <li>Reference <strong>Civil Code § 1946.5</strong> and <strong>Penal Code § 602.3</strong></li>
                <li>Have notice and proof of service ready</li>
              </ul>
            </div>
          </div>

          <Callout variant="tip" title="If Police Won't Help">
            <span>Some officers don&apos;t know the lodger law. Ask for a supervisor and show them the text of <ExtLink href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.5.&lawCode=CIV">Civil Code § 1946.5</ExtLink>. If they still won&apos;t act, proceed with the formal unlawful detainer (Option B).</span>
          </Callout>

          {/* ── Section 3: Tenant Route ── */}
          <SectionHeading id="tenant-route" number="03" title="Option B: Unlawful Detainer (Formal Eviction)" />

          <p className="text-sm text-gray-700 mb-4">If the lodger route doesn&apos;t apply, here&apos;s the full court process.</p>

          <h3 className="font-semibold text-sm mb-3" style={{ color: navy }}>Timeline Overview (~5–8 weeks total)</h3>
          <ProcessBar />

          <Accordion title="Step-by-Step Unlawful Detainer Process" defaultOpen={true}>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: gold }}>Step 1: Serve 30-Day Notice</p>
                <p>Since Harris has lived there <strong>less than 1 year</strong>, only 30 days needed (not 60). Under <ExtLink href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.1.&lawCode=CIV">Civil Code § 1946.1(c)</ExtLink>. No reason required for terminating month-to-month.</p>
              </div>
              <Callout variant="tip" title="Just Cause Not Required">
                <span>The Tenant Protection Act (AB 1482) requires &quot;just cause&quot; for evictions, but single-family homes owned by individuals are generally <strong>exempt</strong>. Additionally, &quot;just cause&quot; only applies after 12+ months — Harris has been there ~6 weeks.</span>
              </Callout>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: gold }}>Step 2: File the Unlawful Detainer</p>
                <p className="mb-2">Forms needed:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>UD-100</strong> — Complaint—Unlawful Detainer (<ExtLink href="https://courts.ca.gov/sites/default/files/courts/default/2024-11/ud100.pdf">Download</ExtLink>)</li>
                  <li><strong>SUM-130</strong> — Summons</li>
                  <li><strong>CM-010</strong> — Civil Case Cover Sheet</li>
                  <li><strong>LACIV 109</strong> — Notice of Case Assignment (LA County)</li>
                </ul>
                <p className="mt-2">Filing fee: <strong>~$385–$435</strong>. Fee waiver available (form FW-001).</p>
                <p className="mt-1">File at: <strong>Santa Monica Courthouse</strong> — 1725 Main St, Santa Monica, CA 90401</p>
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: gold }}>Step 3: Serve the Complaint</p>
                <p>Must be served by someone <strong>other than you</strong>, over 18. Options: process server ($50–150), Sheriff (~$40), or any adult.</p>
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: gold }}>Step 4: Wait for Response</p>
                <p>Harris has <strong>10 business days</strong> to respond (AB 2347, effective Jan 2026). No response → request default judgment. Response filed → trial set within 20 days.</p>
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: gold }}>Step 5: Trial &amp; Judgment</p>
                <p>Bring all evidence: notice, proof of service, lease, police reports, damage photos, threatening communications.</p>
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide mb-1" style={{ color: gold }}>Step 6: Sheriff Lockout</p>
                <p>Writ of Possession → Sheriff posts 5-day notice → lockout if he still won&apos;t leave. <strong>Only law enforcement can do this.</strong></p>
              </div>
            </div>
          </Accordion>

          {/* ── Section 4: Serving Notice ── */}
          <SectionHeading id="serving-notice" number="04" title="Serving the Notice Properly" />

          <Callout variant="important" title="Critical">
            <span>If you serve the notice wrong, the <strong>entire process can be thrown out</strong>. Proper service is everything.</span>
          </Callout>

          <h3 className="font-semibold text-sm mb-2 mt-4" style={{ color: navy }}>Methods of Service (in order of preference)</h3>
          <div className="space-y-3 my-4">
            {[
              { num: '1', title: 'Personal Service (best)', desc: 'Hand the notice directly to Harris. Have a witness present or use a process server.' },
              { num: '2', title: 'Substituted Service', desc: 'If Harris avoids you, leave with a responsible adult at the home AND mail a copy.' },
              { num: '3', title: 'Post and Mail (last resort)', desc: 'Post in a conspicuous place on the property AND mail a copy. Adds extra days to notice period.' },
            ].map(m => (
              <div key={m.num} className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ background: navy }}>{m.num}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: navy }}>{m.title}</p>
                  <p className="text-sm text-gray-600">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Callout variant="tip" title="Document Everything">
            <span>Photo/video of service, keep a copy with date and method noted, have a witness sign a declaration of service, fill out a Proof of Service form.</span>
          </Callout>

          {/* ── Section 5: Without a Lawyer ── */}
          <SectionHeading id="without-lawyer" number="05" title="Can You Do This Without a Lawyer?" />
          <p className="text-sm text-gray-700 mb-4">
            <strong>Yes</strong> — you can represent yourself (&quot;pro per&quot;). Many landlords handle unlawful detainers without an attorney.
          </p>

          <Accordion title="Free & Low-Cost Legal Resources">
            <ul className="space-y-3">
              <li><strong>LA County Superior Court Self-Help Center</strong> — <ExtLink href="https://selfhelp.courts.ca.gov/eviction">selfhelp.courts.ca.gov</ExtLink> — Santa Monica Courthouse has an on-site center</li>
              <li><strong>Legal Aid Foundation of Los Angeles</strong> — <ExtLink href="https://lafla.org">lafla.org</ExtLink> — free legal help for qualifying individuals</li>
              <li><strong>LA County Bar Association</strong> — (213) 243-1525 — $35 initial 30-minute consultation</li>
            </ul>
          </Accordion>

          {/* JusticeOS Product CTA */}
          <div className="my-6 rounded-xl p-5 border-2 relative overflow-hidden" style={{ borderColor: `${gold}50`, background: `linear-gradient(135deg, ${gold}08, ${navy}06)` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5" style={{ background: gold, transform: 'translate(30%, -30%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: gold }}>⚖️</span>
                <span className="text-sm font-bold" style={{ color: navy }}>JusticeOS.ai</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${gold}20`, color: gold }}>RECOMMENDED</span>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: navy }}>AI-Powered Legal Case Management for Self-Represented Litigants</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                JusticeOS.ai provides guided form preparation, deadline tracking, document management, and AI-powered legal research — built specifically for people navigating the court system without an attorney. This report was generated using JusticeOS research tools.
              </p>
            </div>
          </div>

          <h3 className="font-semibold text-sm mb-2 mt-5" style={{ color: navy }}>Cost Breakdown (Self-Represented)</h3>
          <DataTable
            headers={['Item', 'Approximate Cost']}
            rows={[
              ['Filing fee (limited civil UD)', '$385–$435'],
              ['Process server', '$50–$150'],
              ['Sheriff lockout fee', '~$40'],
              ['Copies / postage', '~$20'],
              ['JusticeOS.ai case management', 'Included'],
              ['Total estimate', '$500–$650'],
            ]}
          />

          <Callout variant="warning" title="When You SHOULD Get a Lawyer">
            <ul className="list-disc ml-4 space-y-1 mt-1">
              <li>Harris files a response and contests the eviction</li>
              <li>He claims retaliation, discrimination, etc.</li>
              <li>You&apos;re unsure about lodger vs. tenant distinction</li>
              <li>He actually has filed a restraining order</li>
            </ul>
          </Callout>

          {/* ── Section 6: His RO Claim ── */}
          <SectionHeading id="his-restraining-order" number="06" title='His "Restraining Order" Claim — How to Verify' />

          <p className="text-sm text-gray-700 mb-4">Harris claims he filed a restraining order against you. Here&apos;s how to find out if that&apos;s true:</p>

          <div className="space-y-3 my-4">
            {[
              { title: 'LA County Court Case Search', desc: <>Go to <ExtLink href="https://lacc.lacourt.org">lacc.lacourt.org</ExtLink> and search by your name (respondent) or his name (petitioner).</> },
              { title: 'Call the Clerk\'s Office', desc: <>Santa Monica Courthouse: <strong>(310) 260-3762</strong>. Ask about any RO cases with you as respondent.</> },
              { title: 'Check for Service', desc: <>If an RO has been filed, you <strong>must be formally served</strong>. No papers served = no active restraining order.</> },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-gray-50">
                <span className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style={{ background: navy }}>{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: navy }}>{item.title}</p>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Callout variant="warning" title="AI-Generated Legal Communications">
            <span>
              Harris has been sending nonstop &quot;legal emails&quot; that appear to be <strong>generated by ChatGPT</strong>. AI-generated legal documents frequently contain <strong>fabricated case citations</strong> and misstatements of law. Courts have sanctioned parties for citing AI-fabricated cases. Do not be intimidated by the volume or complexity — they carry no more legal weight than any other letter.
            </span>
          </Callout>

          <Callout variant="success" title="Most Likely Scenario">
            <span>Given that you haven&apos;t been served with court papers, he probably hasn&apos;t filed anything, or the judge denied the temporary order, or he&apos;s bluffing entirely.</span>
          </Callout>

          {/* ── Section 7: Your RO ── */}
          <SectionHeading id="your-restraining-order" number="07" title="Filing YOUR OWN Restraining Order" />

          <p className="text-sm text-gray-700 mb-4">
            Given his behavior — getting in your face, threatening you, destroying property — <strong>you</strong> may be the one who should file.
          </p>

          <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Type: Civil Harassment Restraining Order</h3>
          <p className="text-sm text-gray-700 mb-3">(Correct type since you&apos;re housemates, not family/romantic partners)</p>

          <Accordion title="Forms Needed" defaultOpen>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>CH-100</strong> — Request for Civil Harassment Restraining Orders (<ExtLink href="https://selfhelp.courts.ca.gov/jcc-form/CH-100">Download</ExtLink>) — <em>Updated Jan 1, 2026</em></li>
              <li><strong>CH-109</strong> — Notice of Court Hearing</li>
              <li><strong>CH-110</strong> — Temporary Restraining Order</li>
              <li><strong>CLETS-001</strong> — Confidential CLETS Information</li>
            </ul>
          </Accordion>

          <Accordion title="Process (5 Steps)" defaultOpen>
            <ol className="list-decimal ml-5 space-y-2">
              <li><strong>Fill out forms</strong> — Describe ALL incidents: getting in face, threats, gate destruction, harassing emails, police calls</li>
              <li><strong>File with court</strong> — Filing fee may be <strong>waived</strong> if you allege violence/threats (item 13a on CH-100)</li>
              <li><strong>Judge reviews</strong> — Usually same/next day. If granted, you get a TRO immediately</li>
              <li><strong>Serve Harris</strong> — Sheriff can do this</li>
              <li><strong>Court hearing</strong> — Within ~21 days. If granted, order can last up to <strong>5 years</strong></li>
            </ol>
          </Accordion>

          <Callout variant="success" title="Why This Could Be Your Best Move">
            <span>
              A restraining order with a <strong>move-out order</strong> can get Harris out <strong>faster</strong> than unlawful detainer. The TRO can be granted in <strong>1–2 days</strong> and include an order to leave immediately.
            </span>
          </Callout>

          {/* ── Section 8: Property Damage ── */}
          <SectionHeading id="property-damage" number="08" title="Property Damage — What You Can Do" />

          <p className="text-sm text-gray-700 mb-4">Harris destroyed a gate. You have several options:</p>

          <div className="grid sm:grid-cols-3 gap-4 my-4">
            {[
              { title: '🚔 Criminal Route', items: ['Penal Code § 594 (Vandalism)', 'Under $400 = misdemeanor', '$400+ = misdemeanor or felony', 'File police report: (310) 456-6652'], bg: '#fef2f2', border: '#ef4444' },
              { title: '⚖️ Civil Route', items: ['Include in UD complaint', 'Or file small claims (up to $10k)', 'Filing fee: $30–$75'], bg: '#eff6ff', border: '#3b82f6' },
              { title: '🛡️ In Your RO', items: ['Evidence of threatening behavior', 'Request restitution / payment', 'Strengthens your case'], bg: '#f0fdf4', border: '#22c55e' },
            ].map((card, i) => (
              <div key={i} className="rounded-lg p-4 text-xs" style={{ background: card.bg, borderLeft: `3px solid ${card.border}` }}>
                <p className="font-semibold text-sm mb-2">{card.title}</p>
                <ul className="space-y-1 text-gray-700">
                  {card.items.map((item, j) => <li key={j}>• {item}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <Callout variant="tip" title="Documentation Tips">
            <ul className="list-disc ml-4 space-y-1 mt-1">
              <li>Photograph all damage</li>
              <li>Get 2+ written repair estimates</li>
              <li>Save all communications (emails, texts)</li>
              <li>Keep an incident log with dates/times</li>
              <li>Save all police report numbers</li>
            </ul>
          </Callout>

          {/* ── Section 9: Safety ── */}
          <SectionHeading id="safety" number="09" title="Safety Planning" />

          <Callout variant="important" title="This is the most important section">
            <span>You&apos;re living with someone who may be unpredictable. Your safety comes first.</span>
          </Callout>

          <Accordion title="Immediate Safety Measures" defaultOpen>
            <ul className="space-y-2">
              {[
                'Keep your phone charged and on you at all times',
                'Save LASD non-emergency: (310) 456-6652',
                '911 is always an option — if you feel threatened, call immediately',
                'Tell trusted friends/family/neighbors + establish a code word',
                'Install a security camera (even a cheap one — evidence is crucial)',
                'Lock your bedroom door — install a lock today if needed',
                'Keep important documents somewhere safe he can\'t access',
                'Don\'t engage in arguments — stay calm, walk away, document afterward',
              ].map((item, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-green-500 mt-0.5">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Accordion>

          <Accordion title="When You Serve the Notice">
            <ul className="space-y-1.5">
              <li>⚠️ Do <strong>NOT</strong> serve the notice yourself — use a process server</li>
              <li>⚠️ Do <strong>NOT</strong> be alone when it&apos;s served — be out or have someone with you</li>
              <li>⚠️ Have someone check on you in the hours/days after — he may escalate</li>
              <li>💡 Consider filing the restraining order <strong>FIRST</strong> — a TRO adds protection</li>
            </ul>
          </Accordion>

          <Accordion title="If He Threatens You">
            <ul className="space-y-1.5">
              <li>🚨 <strong>Call 911 immediately</strong> — criminal threats are a crime (<ExtLink href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=422.&lawCode=PEN">Penal Code § 422</ExtLink>)</li>
              <li>Do not try to physically confront him</li>
              <li>Lock yourself in a room with your phone if needed</li>
              <li>After police respond, get the report number and a copy</li>
            </ul>
          </Accordion>

          <div className="rounded-lg p-4 my-4" style={{ background: '#f5f3ff', borderLeft: '4px solid #8b5cf6' }}>
            <p className="font-semibold text-sm mb-2">📞 Safety Resources</p>
            <ul className="text-sm space-y-1 text-gray-700">
              <li><strong>Peace Over Violence</strong> (LA area): (310) 392-8381</li>
              <li><strong>National DV Hotline</strong>: 1-800-799-7233</li>
              <li><strong>LA County 211</strong>: Dial 211 for local services</li>
            </ul>
          </div>

          {/* ── Section 10: Action Plan ── */}
          <SectionHeading id="action-plan" number="10" title="Step-by-Step Action Plan" />

          <div className="space-y-6 my-4">
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#ef4444' }}>📌 This Week (Immediate)</div>
              <div className="p-4 space-y-0.5">
                <CheckItem>Document everything — photograph gate damage, save all emails/comms, write timeline with dates</CheckItem>
                <CheckItem>File a police report for property damage — call (310) 456-6652</CheckItem>
                <CheckItem>Check for restraining orders — search your name at <span className="underline text-blue-600">lacc.lacourt.org</span></CheckItem>
                <CheckItem>Install a security camera</CheckItem>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#f59e0b' }}>📋 Week 1–2</div>
              <div className="p-4 space-y-0.5">
                <CheckItem>File for a Civil Harassment Restraining Order (CH-100) at Santa Monica Courthouse — request move-out + stay-away orders</CheckItem>
                <CheckItem>If TRO granted, have the Sheriff serve Harris</CheckItem>
                <CheckItem>Simultaneously prepare and serve the 30-Day Notice — use a process server</CheckItem>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#3b82f6' }}>⏳ Week 2–5 (Waiting Period)</div>
              <div className="p-4 space-y-0.5">
                <CheckItem>Continue documenting any incidents</CheckItem>
                <CheckItem>Attend the restraining order hearing (~21 days after filing)</CheckItem>
                <CheckItem>If RO orders him to leave, eviction may become unnecessary</CheckItem>
                <CheckItem>Prepare unlawful detainer forms (UD-100, etc.) as backup</CheckItem>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" style={{ background: '#22c55e' }}>✅ After 30 Days (If Still There)</div>
              <div className="p-4 space-y-0.5">
                <CheckItem><strong>Lodger route:</strong> Call LASD, show proof of notice, request trespasser removal under Civil Code § 1946.5</CheckItem>
                <CheckItem><strong>If that fails:</strong> File unlawful detainer complaint at Santa Monica Courthouse</CheckItem>
                <CheckItem>Serve the complaint via process server</CheckItem>
                <CheckItem>Wait for response → trial → Sheriff handles lockout</CheckItem>
              </div>
            </div>
          </div>

          {/* ── Section 11: Resources ── */}
          <SectionHeading id="resources" number="11" title="Resources & Links" />

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Court Forms</h3>
              <ul className="text-sm space-y-1.5">
                <li>📄 <ExtLink href="https://courts.ca.gov/sites/default/files/courts/default/2024-11/ud100.pdf">UD-100 — Unlawful Detainer Complaint</ExtLink></li>
                <li>📄 <ExtLink href="https://selfhelp.courts.ca.gov/jcc-form/CH-100">CH-100 — Request for Civil Harassment Restraining Order</ExtLink></li>
                <li>📄 <ExtLink href="https://www.courts.ca.gov/forms.htm">All California Judicial Council Forms</ExtLink></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Self-Help Guides</h3>
              <ul className="text-sm space-y-1.5">
                <li>📖 <ExtLink href="https://selfhelp.courts.ca.gov/eviction">California Courts — Eviction Self-Help</ExtLink></li>
                <li>📖 <ExtLink href="https://selfhelp.courts.ca.gov/CH-restraining-order/fill-forms">Civil Harassment Restraining Order Guide</ExtLink></li>
                <li>📖 <ExtLink href="https://selfhelp.courts.ca.gov/CH-restraining-order/process">Restraining Order Process Overview</ExtLink></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>LA County Resources</h3>
              <ul className="text-sm space-y-1.5">
                <li>🏛️ <ExtLink href="https://lacc.lacourt.org/">LA County Case Search</ExtLink></li>
                <li>🏛️ <ExtLink href="https://portal-lasc.journaltech.com">LA County e-Filing Portal</ExtLink></li>
                <li>🏛️ <ExtLink href="https://dcba.lacounty.gov/portfolio/eviction/">LA County Consumer Affairs — Eviction Info</ExtLink></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Filing Location</h3>
              <div className="rounded-lg p-4 bg-gray-50 text-sm">
                <p className="font-semibold">Santa Monica Courthouse (West District)</p>
                <p className="text-gray-600">1725 Main Street, Santa Monica, CA 90401</p>
                <p className="mt-1"><ExtLink href="https://www.google.com/maps/search/?api=1&query=1725+Main+Street+Santa+Monica+CA+90401">📍 Open in Google Maps</ExtLink></p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Legal Help</h3>
              <ul className="text-sm space-y-1.5">
                <li>⚖️ <ExtLink href="https://www.lacba.org/need-legal-help/lawyer-referral-information-service">LA County Bar Association</ExtLink> — (213) 243-1525 ($35 consultation)</li>
                <li>⚖️ <ExtLink href="https://lafla.org">Legal Aid Foundation of LA</ExtLink></li>
                <li>⚖️ <ExtLink href="https://selfhelp.courts.ca.gov">California Courts Self-Help Center</ExtLink></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: navy }}>Emergency &amp; Safety</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-lg p-3 text-sm" style={{ background: '#fef2f2', borderLeft: '3px solid #ef4444' }}>
                  <p className="font-semibold">🚨 Emergency: 911</p>
                  <p className="text-gray-600 text-xs mt-0.5">LASD Malibu/Lost Hills: (310) 456-6652</p>
                </div>
                <div className="rounded-lg p-3 text-sm" style={{ background: '#f5f3ff', borderLeft: '3px solid #8b5cf6' }}>
                  <p className="font-semibold">📞 Peace Over Violence</p>
                  <p className="text-gray-600 text-xs mt-0.5">(310) 392-8381 | DV Hotline: 1-800-799-7233</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Law Reference Table ── */}
          <h3 className="font-semibold text-base mt-10 mb-3" style={{ color: navy }}>Key California Laws Referenced</h3>
          <div className="overflow-x-auto my-4 rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-white text-xs uppercase tracking-wide" style={{ background: navy }}>Code</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-white text-xs uppercase tracking-wide" style={{ background: navy }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { code: 'Civil Code § 1946', desc: 'Notice requirements for termination of tenancy', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.&lawCode=CIV' },
                  { code: 'Civil Code § 1946.1', desc: '30-day vs. 60-day notice (based on length)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.1.&lawCode=CIV' },
                  { code: 'Civil Code § 1946.5', desc: 'Single lodger in owner-occupied dwelling', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.5.&lawCode=CIV' },
                  { code: 'CCP § 1161', desc: 'Unlawful detainer grounds', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1161.&lawCode=CCP' },
                  { code: 'CCP § 1162', desc: 'Service of notices', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1162.&lawCode=CCP' },
                  { code: 'CCP § 527.6', desc: 'Civil harassment restraining orders', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=527.6.&lawCode=CCP' },
                  { code: 'Penal Code § 422', desc: 'Criminal threats', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=422.&lawCode=PEN' },
                  { code: 'Penal Code § 594', desc: 'Vandalism / property damage', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=594.&lawCode=PEN' },
                  { code: 'Penal Code § 602.3', desc: 'Trespassing (lodger after notice expires)', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=602.3.&lawCode=PEN' },
                ].map((law, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-4 py-2 border-b border-gray-100 font-mono text-xs">
                      <a href={law.url} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70" style={{ color: '#2563eb' }}>{law.code}</a>
                    </td>
                    <td className="px-4 py-2 border-b border-gray-100 text-gray-700">{law.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          <footer className="mt-16 pt-8 border-t border-gray-200">
            {/* JusticeOS outro */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-3">
                <span style={{ color: gold }}>⚖️</span>
                <span className="text-lg font-semibold" style={{ color: navy }}>
                  Justice<span className="font-light">OS</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full ml-0.5 -translate-y-2" style={{ background: gold }} />
                </span>
              </div>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-2">
                AI-powered legal case management for self-represented litigants. Research, forms, deadlines — all in one place.
              </p>
              <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                This report is <strong>NOT legal advice</strong>. Consult a licensed attorney for advice specific to your situation.
              </p>
            </div>

            <div className="text-center space-y-1.5">
              <p className="text-xs text-gray-500">Research compiled January 31, 2026</p>
              <p className="text-xs text-gray-400">
                Laws and procedures can change — verify current information with the court or an attorney before taking action.
              </p>
              <p className="text-[10px] text-gray-300 mt-4 pt-4 border-t border-gray-100">
                Powered by <span className="font-medium">Empathy Labs</span>
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* ── Print styles ── */}
      <style jsx global>{`
        @media print {
          header, aside, nav, button[aria-label="Table of contents"], canvas { display: none !important; }
          section:first-of-type { min-height: auto !important; }
          main { max-width: 100% !important; padding: 0 !important; }
          .max-h-0 { max-height: none !important; opacity: 1 !important; }
          body { font-size: 11pt; color: #000; }
          a { color: #000; text-decoration: underline; }
          a::after { content: " (" attr(href) ")"; font-size: 8pt; }
          .rounded-lg, .rounded-xl { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
