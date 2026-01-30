"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Activity, ChevronDown, Mic, Volume2 } from 'lucide-react';
import * as THREE from 'three';
import Link from 'next/link';

// --- Configuration ---
const MODES = {
  genesis: {
    id: 'genesis',
    label: 'Genesis',
    hz: '432 Hz',
    color1: new THREE.Vector3(1.0, 0.5, 0.2), 
    color2: new THREE.Vector3(1.0, 0.9, 0.8),
    bg: 0x050201,
    tension: 0.15,
    friction: 0.85, 
    shapeFn: 0 
  },
  revelation: {
    id: 'revelation',
    label: 'Revelation',
    hz: '528 Hz',
    color1: new THREE.Vector3(0.0, 0.7, 0.6), 
    color2: new THREE.Vector3(0.8, 0.9, 1.0),
    bg: 0x00080a,
    tension: 0.2, 
    friction: 0.8, 
    shapeFn: 1 
  },
  ascension: {
    id: 'ascension',
    label: 'Ascension',
    hz: '963 Hz',
    color1: new THREE.Vector3(0.5, 0.0, 1.0), 
    color2: new THREE.Vector3(1.0, 0.6, 0.2), 
    bg: 0x0a000f,
    tension: 0.1, 
    friction: 0.9, 
    shapeFn: 2 
  }
};

// --- Shaders ---
const vertexShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uVoice; 
  uniform float uVolume;
  uniform float uScroll;
  uniform int uShapeFn;
  
  varying float vDisplacement;
  varying vec2 vUv;
  varying float vDist;

  // Noise function
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

  void main() {
    vUv = uv;
    vec2 pos = uv * 2.0 - 1.0;
    vDist = length(pos);
    float PI = 3.14159;
    float displacement = 0.0;
    
    if (uShapeFn == 0) { 
        float n = 3.0 + uBass * 1.5;
        float m = 3.0 + uVoice * 4.0; 
        float wave = cos(n * pos.x * PI) * cos(m * pos.y * PI) - cos(m * pos.x * PI) * cos(n * pos.y * PI);
        displacement = wave * (uVolume * 3.0 + uVoice * 4.0);
    } 
    else if (uShapeFn == 1) { 
        vec2 grid = abs(fract(pos * (3.0 + uBass)) - 0.5);
        displacement = (1.0 - max(grid.x, grid.y)) * (uVolume * 4.0);
        displacement *= cos(uTime * 2.0 + length(pos) * 5.0);
        displacement += uVoice * 3.0 * noise(pos * 10.0);
    } 
    else { 
        float n = noise(pos * 4.0 + uTime * 0.5);
        displacement = n * uVolume * 6.0;
        displacement += sin(length(pos) * 8.0 - uTime) * uVoice * 4.0; 
    }

    vec3 newPos = position;
    newPos.z += displacement;
    
    float horizonFactor = pow(uScroll, 2.5); 
    float bandNoise = noise(pos.xy * 5.0 + uTime) * 0.3 * (1.0 - horizonFactor);
    newPos.y *= mix(0.15, 1.0, horizonFactor); 
    newPos.y += bandNoise; 
    newPos.z *= mix(0.6, 1.0, uScroll); 

    vDisplacement = abs(displacement);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = (2.5 + uVoice * 5.0) * (8.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uScroll;
  uniform float uVoice;
  
  varying float vDisplacement;
  varying float vDist;

  void main() {
    if(length(gl_PointCoord - 0.5) > 0.5) discard;

    vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 1.5, vDisplacement));
    float alpha = 1.0 - smoothstep(0.6, 1.0, vDist);
    float glow = 1.0 + uVoice * 2.0;
    float lineGlow = mix(2.0, 1.0, uScroll);
    
    gl_FragColor = vec4(color * glow * lineGlow, alpha);
  }
`;

const etherVertex = `
  uniform float uTime;
  uniform float uScroll;
  uniform float uVoice;
  attribute vec3 aRandom;
  
  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * 0.5 * aRandom.x) * 0.5;
    pos.y += cos(uTime * 0.3 * aRandom.y) * 0.5;
    pos.z += uVoice * aRandom.z * 5.0;
    pos.y *= mix(0.08, 1.0, pow(uScroll, 2.0));

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.5 + aRandom.z + uVoice * 2.0) * (6.0 / -mvPosition.z); 
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const etherFragment = `
  uniform vec3 uColor2;
  void main() {
    if(length(gl_PointCoord - 0.5) > 0.5) discard;
    gl_FragColor = vec4(uColor2, 0.4); 
  }
`;

class Spring {
    val: number;
    target: number;
    vel: number;
    constructor(val: number) {
        this.val = val;
        this.target = val;
        this.vel = 0;
    }
    update(target: number, tension: number, friction: number) {
        this.target = target;
        const force = (this.target - this.val) * tension;
        this.vel += force;
        this.vel *= friction;
        this.val += this.vel;
        return this.val;
    }
}

const WaveIcon = ({ active }: { active: boolean }) => (
  <div className="flex items-center justify-center gap-[3px] w-6 h-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`w-1 bg-white rounded-full transition-all duration-300 ${active ? 'animate-wave' : 'h-1 opacity-50'}`}
        style={{ 
            height: active ? undefined : '4px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s'
        }}
      />
    ))}
    <style>{`
      @keyframes wave {
        0%, 100% { height: 4px; opacity: 0.5; }
        50% { height: 16px; opacity: 1; }
      }
      .animate-wave {
        animation: wave ease-in-out infinite;
      }
    `}</style>
  </div>
);

const GlassButton = ({ onClick, children, className, active }: any) => (
  <button 
    onClick={onClick}
    className={`
      relative group overflow-hidden
      backdrop-blur-xl
      border transition-all duration-300
      ${active 
        ? 'bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]' 
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }
      rounded-2xl
      ${className}
    `}
  >
    <div className="absolute inset-[1px] rounded-2xl border border-white/20 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    <div className="relative z-10">
        {children}
    </div>
  </button>
);

export default function V10Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [modeId, setModeId] = useState('genesis');
  const [scrollProgress, setScrollProgress] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  
  const physics = useRef({
      bass: new Spring(0),
      voice: new Spring(0),
      vol: new Spring(0)
  });
  
  const sceneRef = useRef<any>({});

  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
    setTimeout(() => setRevealed(true), 500);
  }, []);

  const initAudio = async () => {
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      if (!isListening) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048; 
        analyser.smoothingTimeConstant = 0.6; 

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        setIsListening(true);
      }
    } catch (e) {
      console.error("Audio Init Failed", e);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if(!el) return;
    const handleScroll = () => {
        const progress = Math.min(el.scrollTop / (window.innerHeight * 0.6), 1.0);
        setScrollProgress(progress);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(MODES[modeId as keyof typeof MODES].bg);
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(8, 8, 200, 200);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBass: { value: 0 },
            uVoice: { value: 0 },
            uVolume: { value: 0 },
            uScroll: { value: 0 },
            uShapeFn: { value: 0 },
            uColor1: { value: MODES[modeId as keyof typeof MODES].color1 },
            uColor2: { value: MODES[modeId as keyof typeof MODES].color2 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const plate = new THREE.Points(geometry, material);
    plate.rotation.x = -0.2; 
    scene.add(plate);

    const etherGeo = new THREE.BufferGeometry();
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 3);
    for(let i=0; i<count; i++) {
        pos[i*3] = (Math.random() - 0.5) * 14;
        pos[i*3+1] = (Math.random() - 0.5) * 10;
        pos[i*3+2] = (Math.random() - 0.5) * 6;
        rnd[i*3] = Math.random();
        rnd[i*3+1] = Math.random();
        rnd[i*3+2] = Math.random();
    }
    etherGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    etherGeo.setAttribute('aRandom', new THREE.BufferAttribute(rnd, 3));
    const etherMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uVoice: { value: 0 }, uColor2: { value: MODES[modeId as keyof typeof MODES].color2 } },
        vertexShader: etherVertex, fragmentShader: etherFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ether = new THREE.Points(etherGeo, etherMat);
    scene.add(ether);

    sceneRef.current = { scene, camera, renderer, material, etherMat, plate };

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
        if(containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    let frameId: number;
    const animate = (time: number) => {
        if (!sceneRef.current.renderer) return;
        const { renderer, scene, camera, material, etherMat } = sceneRef.current;
        const mode = MODES[modeId as keyof typeof MODES];
        const t = time * 0.001;

        material.uniforms.uColor1.value.lerp(mode.color1, 0.05);
        material.uniforms.uColor2.value.lerp(mode.color2, 0.05);
        etherMat.uniforms.uColor2.value.lerp(mode.color2, 0.05);
        scene.background.lerp(new THREE.Color(mode.bg), 0.05);
        material.uniforms.uShapeFn.value = mode.shapeFn;

        let targetBass = 0, targetVoice = 0, targetVol = 0;
        
        if (isListening && analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
            const data = dataArrayRef.current;
            const len = data.length;
            
            const voiceStart = Math.floor(300 / 21.5);
            const voiceEnd = Math.floor(3400 / 21.5);
            const bassEnd = Math.floor(150 / 21.5);

            let b=0, v=0, total=0;
            
            for(let i=0; i<bassEnd; i++) b += data[i];
            for(let i=voiceStart; i<voiceEnd; i++) v += data[i];
            for(let i=0; i<len; i++) total += data[i];

            // TUNED DOWN SENSITIVITY (-40% from provided code)
            const bNorm = b / bassEnd / 255;
            const vNorm = v / (voiceEnd - voiceStart) / 255;
            
            targetBass = Math.pow(bNorm, 1.5) * 1.2; // 2.0 -> 1.2
            targetVoice = Math.pow(vNorm, 1.2) * 3.0; // 5.0 -> 3.0
            targetVol = (total / len / 255) * 1.2;   // 2.0 -> 1.2

        } else {
             targetVol = Math.sin(t * 1.5) * 0.05 + 0.08;
             targetVoice = Math.cos(t * 1.2) * 0.05;
        }

        material.uniforms.uBass.value = physics.current.bass.update(targetBass, mode.tension, mode.friction);
        material.uniforms.uVoice.value = physics.current.voice.update(targetVoice, mode.tension, mode.friction);
        material.uniforms.uVolume.value = physics.current.vol.update(targetVol, mode.tension, mode.friction);
        etherMat.uniforms.uVoice.value = material.uniforms.uVoice.value;

        material.uniforms.uTime.value = t;
        etherMat.uniforms.uTime.value = t;
        material.uniforms.uScroll.value = scrollProgress;
        etherMat.uniforms.uScroll.value = scrollProgress;

        camera.rotation.x = scrollProgress * -0.4;
        camera.position.z = 5.0 + scrollProgress * 2.5; 
        
        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [modeId, isListening, scrollProgress]);


  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden select-none">
      
      <div ref={containerRef} className="fixed inset-0 z-0" />

      <div 
        ref={scrollContainerRef}
        className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        
        <div className="h-screen w-full flex flex-col items-center justify-center relative perspective-1000">
            
            <div className={`text-center transition-all duration-1000 transform ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                {/* FIXED TYPOGRAPHY STACK: "God is" ABOVE "Frequency" */}
                <h1 className="flex flex-col items-center">
                    <span className="text-4xl md:text-6xl font-light tracking-[0.1em] uppercase text-gray-300 block mb-2">
                        God is
                    </span>
                    <span className={`font-serif italic text-6xl md:text-9xl text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] transform transition-all duration-[2000ms] delay-500 ${revealed ? 'scale-100 blur-0 opacity-100' : 'scale-90 blur-lg opacity-0'}`}>
                        Frequency
                    </span>
                </h1>
            </div>

            <div className={`mt-20 transition-all duration-1000 delay-1000 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
                <GlassButton 
                    onClick={initAudio}
                    active={isListening}
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                >
                    <WaveIcon active={isListening} />
                </GlassButton>
                
                <div className="mt-6 text-center">
                    <span className="text-[10px] uppercase tracking-[0.4em] text-gray-400">
                        {isListening ? 'Listening' : 'Find your Frequency'}
                    </span>
                </div>
            </div>

            <div className={`absolute bottom-12 transition-all duration-1000 delay-[1500ms] ${revealed ? 'opacity-50 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="flex flex-col items-center gap-3 animate-bounce">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500">Scroll to Enter Field</span>
                    <ChevronDown className="w-4 h-4 text-white/50" />
                </div>
            </div>

        </div>

        <div className="min-h-screen w-full flex flex-col justify-end pb-12 px-6 pointer-events-none">
            
            <div 
                className="max-w-4xl mx-auto w-full pointer-events-auto transition-all duration-700"
                style={{ 
                    opacity: Math.max(0, (scrollProgress - 0.5) * 2),
                    transform: `translateY(${(1 - scrollProgress) * 50}px)`
                }}
            >
                <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="flex flex-wrap justify-center gap-4">
                            {Object.values(MODES).map((m) => (
                                <GlassButton
                                    key={m.id}
                                    onClick={() => setModeId(m.id)}
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
                            <Activity className={`w-4 h-4 ${isListening ? 'text-white animate-pulse' : 'text-gray-600'}`} />
                            <span className="text-[10px] uppercase tracking-widest text-gray-500">
                                {isListening ? 'Active' : 'Standby'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div 
                className="mt-12 text-center transition-opacity duration-700"
                style={{ opacity: Math.max(0, (scrollProgress - 0.8) * 5) }}
            >
                <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] hover:text-white/50 transition-colors cursor-default">
                    created for Frequency by Empathy Labs
                </p>
            </div>
        </div>
        
        <div className="h-[10vh]" />

      </div>
      
      <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
          ← Back to Menu
      </Link>

      <style>{`
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};