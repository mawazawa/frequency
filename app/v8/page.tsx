"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useScroll, ScrollControls, Scroll } from "@react-three/drei";
import * as THREE from "three";
import { Mic, Volume2 } from "lucide-react";
import Link from "next/link";

// --- Shaders ---

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uAudio;
uniform vec2 uMouse;
uniform float uMouseVel;
uniform float uScroll;
uniform vec2 uResolution;

varying vec2 vUv;

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  centered.x *= uResolution.x / uResolution.y;

  // --- Fluid Mouse Interaction ---
  float mouseDist = distance(centered, uMouse);
  // Ripple radius that expands with velocity
  float rippleRadius = 0.3 + uMouseVel * 0.5;
  float mouseForce = smoothstep(rippleRadius, 0.0, mouseDist);
  
  // Audio Force
  float audioForce = uAudio * 0.5;

  // --- High Density Linear Grid (Phase 1) ---
  // Frequency increased for closer lines
  float baseFreq = 120.0;
  
  // Distortion that never "freezes"
  // We use uTime directly in the noise AND the phase
  float noiseDistortion = snoise(centered * 3.0 + uTime * 0.1) * (0.1 + mouseForce * 0.4 + audioForce * 0.2);
  
  // Add a direct ripple displacement
  float ripple = sin(mouseDist * 20.0 - uTime * 5.0) * mouseForce * 0.05;
  
  float linearPattern = sin((centered.y + noiseDistortion + ripple) * baseFreq + uTime * 0.5);
  
  // Hairline sharpening
  float lines = smoothstep(0.985, 1.0, linearPattern);
  
  // --- Radial / Womb Phase (Phase 2) ---
  float len = length(centered);
  float angle = atan(centered.y, centered.x);
  
  // Radial grid also dense
  float radialPattern = sin(len * 80.0 - uTime * 1.0 + snoise(vec2(angle, uTime * 0.2)) * (1.0 + mouseForce));
  float wombLines = smoothstep(0.98, 1.0, radialPattern);

  // Blend Patterns based on Scroll
  float patternMix = smoothstep(0.2, 0.8, uScroll);
  float visual = mix(lines, wombLines, patternMix);

  // --- Color & Glow ---
  vec3 colorLines = vec3(0.9, 0.95, 1.0) * visual;
  vec3 colorWomb = vec3(1.0, 0.6, 0.2) * visual;
  
  vec3 finalColor = mix(colorLines, colorWomb, patternMix);
  
  // Background depth glow
  finalColor += mix(vec3(0.01, 0.02, 0.05), vec3(0.1, 0.05, 0.02), patternMix);
  
  // Interaction Glow
  finalColor += vec3(0.3, 0.6, 1.0) * mouseForce * 0.2 * (1.0 - patternMix);
  finalColor += vec3(1.0, 0.4, 0.1) * mouseForce * 0.4 * patternMix;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// --- Scene Component ---

const FrequencyField = ({ isMicActive }: { isMicActive: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const scroll = useScroll();
    const { viewport, size } = useThree();
    
    const audioRef = useRef<{ context: AudioContext, analyser: AnalyserNode, data: Uint8Array } | null>(null);
    const mouseState = useRef({ x: 0, y: 0, vel: 0 });

    useEffect(() => {
        if (isMicActive && !audioRef.current) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = context.createAnalyser();
                analyser.fftSize = 256;
                const source = context.createMediaStreamSource(stream);
                source.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);
                audioRef.current = { context, analyser, data };
            });
        }
        return () => {
             if (!isMicActive && audioRef.current) {
                 audioRef.current.context.close();
                 audioRef.current = null;
             }
        }
    }, [isMicActive]);

    useFrame((state) => {
        if (!materialRef.current) return;
        
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        materialRef.current.uniforms.uScroll.value = scroll.offset;
        
        // Mouse Physics with Velocity (to prevent "freeze")
        const dx = state.mouse.x - mouseState.current.x;
        const dy = state.mouse.y - mouseState.current.y;
        const velocity = Math.sqrt(dx*dx + dy*dy);
        
        // Smooth velocity
        mouseState.current.vel += (velocity - mouseState.current.vel) * 0.1;
        materialRef.current.uniforms.uMouseVel.value = mouseState.current.vel;
        
        // Smooth mouse position
        const currentX = materialRef.current.uniforms.uMouse.value.x;
        const currentY = materialRef.current.uniforms.uMouse.value.y;
        materialRef.current.uniforms.uMouse.value.x += (state.mouse.x * 0.5 - currentX) * 0.08;
        materialRef.current.uniforms.uMouse.value.y += (state.mouse.y * 0.5 - currentY) * 0.08;

        mouseState.current.x = state.mouse.x;
        mouseState.current.y = state.mouse.y;

        // Audio
        if (audioRef.current) {
            audioRef.current.analyser.getByteFrequencyData(audioRef.current.data as any);
            const avg = audioRef.current.data.reduce((a,b) => a+b, 0) / audioRef.current.data.length;
            const normalized = avg / 255;
            const currentAudio = materialRef.current.uniforms.uAudio.value;
            materialRef.current.uniforms.uAudio.value += (normalized - currentAudio) * 0.1;
        } else {
             materialRef.current.uniforms.uAudio.value *= 0.95;
        }
    });

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uAudio: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uMouseVel: { value: 0 },
            uResolution: { value: new THREE.Vector2(size.width, size.height) },
        }),
        [size.width, size.height]
    );

    return (
        <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
            <planeGeometry args={[1, 1]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
            />
        </mesh>
    );
};

// --- HTML Overlay Content ---

const OverlayContent = ({ isMicActive, setIsMicActive }: { isMicActive: boolean, setIsMicActive: (v: boolean) => void }) => {
    const scroll = useScroll();
    const [opacityHero, setOpacityHero] = useState(1);
    const [opacityReveal, setOpacityReveal] = useState(0);

    useFrame(() => {
        setOpacityHero(1 - Math.min(1, scroll.offset * 4));
        setOpacityReveal(Math.max(0, (scroll.offset - 0.7) * 4));
    });

    return (
        <Scroll html>
            <div className="w-full">
            {/* Section 1: Hero */}
            <div className="h-screen w-full flex flex-col items-center justify-center relative pointer-events-none" style={{ opacity: opacityHero }}>
                <div className="relative z-10 text-center mix-blend-difference">
                    <h1 className="text-[10vw] font-mono font-bold leading-none tracking-tighter text-white uppercase">
                        V8: FLUID<br/>
                        <span className="text-white/40 italic">HAIRLINES</span>
                    </h1>
                </div>
            </div>

            {/* Section 2: Spacer */}
            <div className="h-screen w-full" />

            {/* Section 3: Reveal */}
            <div className="h-screen w-full flex flex-col items-center justify-center relative" style={{ opacity: opacityReveal }}>
                <div className="text-center z-10 pointer-events-auto">
                    {!isMicActive ? (
                        <button 
                            onClick={() => setIsMicActive(true)}
                            className="px-10 py-5 border border-white/20 bg-white/5 text-white font-mono uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                             Initialize Flow
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-1000">
                             <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest animate-pulse font-mono">
                                 <Volume2 className="w-4 h-4" /> System_Live
                             </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </Scroll>
    );
}

export default function V8Page() {
    const [isMicActive, setIsMicActive] = useState(false);

    return (
        <div className="h-screen w-full bg-[#030303]">
            <Canvas dpr={[1, 2]}> 
                <ScrollControls pages={3} damping={0.2}> 
                    <FrequencyField isMicActive={isMicActive} />
                    <OverlayContent isMicActive={isMicActive} setIsMicActive={setIsMicActive} />
                </ScrollControls>
            </Canvas>

            <div className="fixed top-8 left-8 z-50 text-white/20 font-mono text-xs mix-blend-difference pointer-events-none">
                V8: FLUID_HAIRLINE_REACTOR // ENHANCED_V4
            </div>
            
            <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Back to Menu
            </Link>
        </div>
    );
}
