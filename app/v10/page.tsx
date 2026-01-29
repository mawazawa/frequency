"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Activity, ChevronDown, Settings, X, Sliders } from 'lucide-react';
import * as THREE from 'three';

// --- Fonts & Styles ---
// Injecting Google Fonts for that high-end editorial look
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600&family=Inter:wght@200;300;400&display=swap');
    
    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-playfair { font-family: 'Playfair Display', serif; }
    
    /* Metal Text Effect */
    .metal-text {
        background-image: linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 48%, #475569 50%, #94A3B8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
    }
    
    .metal-text-sm {
        background-image: linear-gradient(180deg, #F8FAFC 0%, #CBD5E1 45%, #64748B 50%, #94A3B8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.3));
    }
  `}</style>
);

// --- Configuration ---
const MODES = {
  genesis: {
    id: 'genesis',
    label: 'Genesis',
    hz: '432 Hz',
    color1: new THREE.Vector3(0.0, 0.02, 0.15), 
    color2: new THREE.Vector3(0.1, 0.3, 0.8),
    bg: 0x000103, 
    shapeFn: 0 
  },
  revelation: {
    id: 'revelation',
    label: 'Revelation',
    hz: '528 Hz',
    color1: new THREE.Vector3(0.0, 0.7, 0.6), 
    color2: new THREE.Vector3(0.8, 0.9, 1.0),
    bg: 0x00080a,
    shapeFn: 1 
  },
  ascension: {
    id: 'ascension',
    label: 'Ascension',
    hz: '963 Hz',
    color1: new THREE.Vector3(0.5, 0.0, 1.0), 
    color2: new THREE.Vector3(1.0, 0.6, 0.2), 
    bg: 0x0a000f,
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
  uniform float uParticleSize;
  uniform float uComplexity; // New slider
  uniform float uDisplacementStr; // New slider
  uniform float uSpeed; // New slider
  
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

  void main() {
    vUv = uv;
    vec2 pos = uv * 2.0 - 1.0;
    vDist = length(pos);
    float PI = 3.14159;
    float displacement = 0.0;
    
    float t = uTime * uSpeed; // Apply speed slider

    // --- Shape Logic ---
    if (uShapeFn == 0) { // Genesis
        // Apply Complexity Slider to frequency
        float n = (3.0 * uComplexity) + uBass * 1.5;
        float m = (3.0 * uComplexity) + uVoice * 4.0; 
        float wave = cos(n * pos.x * PI) * cos(m * pos.y * PI) - cos(m * pos.x * PI) * cos(n * pos.y * PI);
        displacement = wave * (uVolume * 3.0 + uVoice * 4.0);
    } 
    else if (uShapeFn == 1) { // Revelation
        vec2 grid = abs(fract(pos * (3.0 * uComplexity + uBass)) - 0.5);
        displacement = (1.0 - max(grid.x, grid.y)) * (uVolume * 4.0);
        displacement *= cos(t * 2.0 + length(pos) * 5.0);
        displacement += uVoice * 3.0 * noise(pos * 10.0);
    } 
    else { // Ascension
        float n = noise(pos * (4.0 * uComplexity) + t * 0.5);
        displacement = n * uVolume * 6.0;
        displacement += sin(length(pos) * 8.0 - t) * uVoice * 4.0; 
    }

    // Apply global displacement slider
    displacement *= uDisplacementStr;

    vec3 newPos = position;
    newPos.z += displacement;
    
    float horizonFactor = pow(uScroll, 2.5); 
    float bandNoise = noise(pos.xy * 8.0 + t) * 0.2 * (1.0 - horizonFactor);
    newPos.y *= mix(0.12, 1.0, horizonFactor); 
    newPos.y += bandNoise; 
    newPos.z *= mix(0.6, 1.0, uScroll); 

    vDisplacement = abs(displacement);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    gl_PointSize = (uParticleSize + uVoice * 2.0) * (8.0 / -mvPosition.z);
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

    vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 2.0, vDisplacement));
    float alpha = 1.0 - smoothstep(0.5, 1.0, vDist);
    
    float glow = 1.0 + uVoice * 1.5; 
    float lineGlow = mix(1.8, 1.0, uScroll);
    
    gl_FragColor = vec4(color * glow * lineGlow, alpha * 0.8);
  }
`;

const etherVertex = `
  uniform float uTime;
  uniform float uScroll;
  uniform float uVoice;
  uniform float uParticleSize;
  uniform vec2 uMouse; // Mouse position (-1 to 1)
  attribute vec3 aRandom;
  
  varying float vInteraction;

  void main() {
    vec3 pos = position;
    
    // Natural Drift
    pos.x += sin(uTime * 0.5 * aRandom.x) * 0.5;
    pos.y += cos(uTime * 0.3 * aRandom.y) * 0.5;
    pos.z += uVoice * aRandom.z * 4.0;
    
    // Flatten logic
    pos.y *= mix(0.06, 1.0, pow(uScroll, 2.0)); 

    // --- MOUSE ENERGY FIELD LOGIC ---
    // Project world position roughly to screen space for simple proximity check
    // Note: This is an approximation. 
    // We assume the text is near the center (0,0) of the screen.
    // uMouse is normalized screen coords.
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vec4 glPos = projectionMatrix * mvPosition;
    vec3 ndc = glPos.xyz / glPos.w; // Normalized Device Coordinates
    
    // Calculate distance from mouse to this particle on screen
    float dist = distance(ndc.xy, uMouse);
    
    // Interaction Strength (Radius of 0.3)
    float interaction = smoothstep(0.4, 0.0, dist);
    vInteraction = interaction;

    // Apply turbulence/lift if near mouse
    if (interaction > 0.0) {
        float turbulence = sin(uTime * 10.0 + pos.x * 5.0) * interaction * 0.2;
        pos.z += interaction * 2.0; // Lift up
        pos.x += turbulence;
        pos.y += turbulence;
        
        // Recalculate position
        mvPosition = modelViewMatrix * vec4(pos, 1.0);
    }

    gl_PointSize = (uParticleSize * 0.7 + aRandom.z * 0.5 + uVoice + (interaction * 3.0)) * (6.0 / -mvPosition.z); 
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const etherFragment = `
  uniform vec3 uColor2;
  varying float vInteraction;

  void main() {
    if(length(gl_PointCoord - 0.5) > 0.5) discard;
    
    // Brighten if being interacted with
    vec3 color = uColor2 + (vec3(1.0) * vInteraction * 0.8);
    float alpha = 0.3 + (vInteraction * 0.7);

    gl_FragColor = vec4(color, alpha); 
  }
`;

// Elastic Physics Class
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

// --- Components ---

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
        50% { height: 14px; opacity: 1; }
      }
      .animate-wave {
        animation: wave ease-in-out infinite;
      }
    `}</style>
  </div>
);

const GlassButton = ({ onClick, children, className, active }: { onClick: () => void, children: React.ReactNode, className?: string, active?: boolean }) => (
  <button 
    onClick={onClick}
    className={`
      relative group overflow-hidden
      backdrop-blur-xl
      border transition-all duration-500
      ${active 
        ? 'bg-white/5 border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
        : 'bg-white/0 border-white/10 hover:bg-white/5 hover:border-white/20'
      }
      rounded-full
      ${className || ''}
    `}
  >
    <div className="absolute inset-[1px] rounded-full border border-white/10 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    <div className="relative z-10">
        {children}
    </div>
  </button>
);

// --- Developer Control Panel ---
const ControlPanel = ({ params, setParams }: { params: any, setParams: React.Dispatch<React.SetStateAction<any>> }) => {
    const [isOpen, setIsOpen] = useState(false);

    const updateParam = (key: string, value: string) => {
        setParams((prev: any) => ({ ...prev, [key]: parseFloat(value) }));
    };

    return (
        <div className="fixed bottom-6 left-6 z-50 flex items-end">
            <div className={`
                bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-y-auto transition-all duration-300 origin-bottom-left scrollbar-hide
                ${isOpen ? 'w-72 h-[400px] opacity-100 scale-100 mb-0' : 'w-0 h-0 opacity-0 scale-90 mb-10'}
            `}>
                <div className="p-5 space-y-5">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80">Cymatics Engine</span>
                        <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* Controls */}
                    {[
                        { label: 'Tension', key: 'tension', min: 0.01, max: 1.0, step: 0.01 },
                        { label: 'Friction', key: 'friction', min: 0.50, max: 0.99, step: 0.01 },
                        { label: 'Bass Gain', key: 'bassGain', min: 0.0, max: 5.0, step: 0.1 },
                        { label: 'Voice Gain', key: 'voiceGain', min: 0.0, max: 5.0, step: 0.1 },
                        { label: 'Vol Gain', key: 'volGain', min: 0.0, max: 5.0, step: 0.1 },
                        { label: 'Particle Size', key: 'particleSize', min: 0.1, max: 5.0, step: 0.1 },
                        { label: 'Complexity', key: 'complexity', min: 0.1, max: 3.0, step: 0.1 },
                        { label: 'Wave Speed', key: 'speed', min: 0.0, max: 2.0, step: 0.1 },
                        { label: 'Displacement', key: 'displacementStr', min: 0.1, max: 5.0, step: 0.1 },
                    ].map(control => (
                        <div key={control.key} className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/50">
                                <span>{control.label}</span>
                                <span className="font-mono text-cyan-400">{params[control.key].toFixed(2)}</span>
                            </div>
                            <input 
                                type="range" 
                                min={control.min} max={control.max} step={control.step}
                                value={params[control.key]}
                                onChange={(e) => updateParam(control.key, e.target.value)}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80 hover:[&::-webkit-slider-thumb]:bg-white"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md transition-all duration-300
                    ${isOpen ? 'translate-x-4 opacity-0 pointer-events-none' : 'bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/30'}
                `}
            >
                <Sliders className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest">Tune</span>
            </button>
        </div>
    );
};

// --- Main App ---

const GodIsFrequency = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [modeId, setModeId] = useState('genesis');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 9999, y: 9999 }); // Default off-screen

  // --- Calibration State ---
  const [params, setParams] = useState({
      tension: 0.3,
      friction: 0.9,
      bassGain: 0.6,
      voiceGain: 1.2,
      volGain: 0.5,
      particleSize: 0.7,
      complexity: 1.0,
      speed: 1.0,
      displacementStr: 1.0
  });

  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

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

  // Mouse Tracking for Energy Field
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          // Normalize to -1 to 1 range
          const x = (e.clientX / window.innerWidth) * 2 - 1;
          const y = -(e.clientY / window.innerHeight) * 2 + 1;
          setMousePos({ x, y });
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
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

    const geometry = new THREE.PlaneGeometry(8, 8, 350, 350);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uBass: { value: 0 },
            uVoice: { value: 0 },
            uVolume: { value: 0 },
            uScroll: { value: 0 },
            uShapeFn: { value: 0 },
            uParticleSize: { value: paramsRef.current.particleSize },
            uComplexity: { value: paramsRef.current.complexity },
            uSpeed: { value: paramsRef.current.speed },
            uDisplacementStr: { value: paramsRef.current.displacementStr },
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
    plate.position.y = 1.0; 
    scene.add(plate);

    const etherGeo = new THREE.BufferGeometry();
    const count = 3500; 
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
        uniforms: { 
            uTime: { value: 0 }, 
            uScroll: { value: 0 }, 
            uVoice: { value: 0 }, 
            uParticleSize: { value: paramsRef.current.particleSize },
            uMouse: { value: new THREE.Vector2(999, 999) },
            uColor2: { value: MODES[modeId as keyof typeof MODES].color2 } 
        },
        vertexShader: etherVertex, fragmentShader: etherFragment,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const ether = new THREE.Points(etherGeo, etherMat);
    ether.position.y = 1.0;
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
        const currentParams = paramsRef.current;

        material.uniforms.uColor1.value.lerp(mode.color1, 0.05);
        material.uniforms.uColor2.value.lerp(mode.color2, 0.05);
        etherMat.uniforms.uColor2.value.lerp(mode.color2, 0.05);
        scene.background.lerp(new THREE.Color(mode.bg), 0.05);
        material.uniforms.uShapeFn.value = mode.shapeFn;
        
        // Dynamic Uniforms from Panel
        material.uniforms.uParticleSize.value = currentParams.particleSize;
        material.uniforms.uComplexity.value = currentParams.complexity;
        material.uniforms.uSpeed.value = currentParams.speed;
        material.uniforms.uDisplacementStr.value = currentParams.displacementStr;

        etherMat.uniforms.uParticleSize.value = currentParams.particleSize;

        // Mouse Update
        etherMat.uniforms.uMouse.value.set(mousePos.x, mousePos.y);

        let targetBass = 0, targetVoice = 0, targetVol = 0;
        
        if (isListening && analyserRef.current) {
            analyserRef.current!.getByteFrequencyData(dataArrayRef.current!);
            const data = dataArrayRef.current!;
            const len = data.length;
            
            const voiceStart = Math.floor(300 / 21.5);
            const voiceEnd = Math.floor(3400 / 21.5);
            const bassEnd = Math.floor(150 / 21.5);

            let b=0, v=0, total=0;
            
            for(let i=0; i<bassEnd; i++) b += data[i];
            for(let i=voiceStart; i<voiceEnd; i++) v += data[i];
            for(let i=0; i<len; i++) total += data[i];

            const bNorm = b / bassEnd / 255;
            const vNorm = v / (voiceEnd - voiceStart) / 255;
            
            targetBass = Math.pow(bNorm, 1.5) * currentParams.bassGain;
            targetVoice = Math.pow(vNorm, 1.2) * currentParams.voiceGain; 
            targetVol = (total / len / 255) * currentParams.volGain;

        } else {
             targetVol = Math.sin(t * 1.5) * 0.05 + 0.08;
             targetVoice = Math.cos(t * 1.2) * 0.05;
        }

        material.uniforms.uBass.value = physics.current.bass.update(targetBass, currentParams.tension, currentParams.friction);
        material.uniforms.uVoice.value = physics.current.voice.update(targetVoice, currentParams.tension, currentParams.friction);
        material.uniforms.uVolume.value = physics.current.vol.update(targetVol, currentParams.tension, currentParams.friction);
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
  }, [modeId, isListening, scrollProgress, mousePos]); // Added mousePos dependency to update ref, though direct uniform update handles it


  return (
    <div className="relative w-full h-screen bg-black text-white font-sans overflow-hidden select-none">
      <FontStyles />
      
      {/* 3D Canvas */}
      <div ref={containerRef} className="fixed inset-0 z-0" />

      {/* Developer Controls */}
      <ControlPanel params={params} setParams={setParams} />

      {/* Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        
        {/* SECTION 1: LANDING */}
        <div className="h-screen w-full flex flex-col items-center justify-center relative perspective-1000">
            
            {/* Cinematic Header - Playfair Display & Metal Texture */}
            <div className={`text-center transition-all duration-1000 transform ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h1 className="flex flex-col items-center justify-center">
                    <span className="font-cinzel text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-slate-400 mb-6 mix-blend-plus-lighter">
                        God is
                    </span>
                    <span 
                        className={`
                            font-playfair italic text-6xl md:text-8xl tracking-wide metal-text
                            transform transition-all duration-[2000ms] delay-500
                            pb-4 
                            ${revealed ? 'scale-100 blur-0 opacity-100' : 'scale-95 blur-sm opacity-0'}
                        `}
                    >
                        Frequency
                    </span>
                </h1>
            </div>

            {/* Main Action Area */}
            <div className={`mt-24 transition-opacity duration-1000 delay-1000 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
                <GlassButton 
                    onClick={initAudio}
                    active={isListening}
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                >
                    <WaveIcon active={isListening} />
                </GlassButton>
                
                {/* Floating Metal Text for Call to Action */}
                <div className="mt-8 text-center">
                    <span className="font-cinzel text-[10px] uppercase tracking-[0.3em] font-semibold metal-text-sm opacity-80">
                        Find Your Frequency
                    </span>
                </div>
            </div>

            {/* Scroll Hint */}
            <div className={`absolute bottom-12 transition-all duration-1000 delay-[1500ms] ${revealed ? 'opacity-50 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <div className="flex flex-col items-center gap-3 animate-bounce">
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-cinzel">Scroll to Enter Field</span>
                    <ChevronDown className="w-4 h-4 text-white/30" />
                </div>
            </div>

        </div>

        {/* SECTION 2: THE FIELD CONTROLS */}
        <div className="min-h-screen w-full flex flex-col justify-end pb-12 px-6 pointer-events-none">
            
            {/* Control Panel */}
            <div 
                className="max-w-4xl mx-auto w-full pointer-events-auto transition-all duration-700"
                style={{ 
                    opacity: Math.max(0, (scrollProgress - 0.5) * 2),
                    transform: `translateY(${(1 - scrollProgress) * 50}px)`
                }}
            >
                <div className="backdrop-blur-3xl bg-black/20 border border-white/5 rounded-full p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-wrap justify-center gap-4 relative z-10">
                        {Object.values(MODES).map((m) => (
                            <GlassButton
                                key={m.id}
                                onClick={() => setModeId(m.id)}
                                active={modeId === m.id}
                                className="px-6 py-3 min-w-[120px]"
                            >
                                <div className="flex flex-col items-center">
                                    <span className={`text-sm font-playfair italic ${modeId === m.id ? 'text-white' : 'text-white/60'}`}>{m.hz}</span>
                                    <span className="text-[8px] uppercase tracking-widest text-white/30 mt-1 font-cinzel">{m.label}</span>
                                </div>
                                {modeId === m.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_infinite]" />
                                )}
                            </GlassButton>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Minimal Footer */}
            <div 
                className="mt-12 text-center transition-opacity duration-700"
                style={{ opacity: Math.max(0, (scrollProgress - 0.8) * 5) }}
            >
                <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-colors cursor-default font-cinzel">
                    created for Frequency by Empathy Labs
                </p>
            </div>
        </div>
        
        {/* Scroll Spacer */}
        <div className="h-[10vh]" />

      </div>
      
      <style>{`
        @keyframes shimmer {
            0% { transform: translateX(-150%); }
            100% { transform: translateX(150%); }
        }
      `}</style>
    </div>
  );
};

export default GodIsFrequency;
