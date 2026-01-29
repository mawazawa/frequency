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
  
  // Center UVs
  vec2 centered = uv - 0.5;
  // Fix aspect ratio
  centered.x *= uResolution.x / uResolution.y;

  // --- Interaction Physics ---
  
  // Mouse Interaction (Smoothed in JS, but visualized here)
  // Create a "field" that distorts based on mouse distance
  float mouseDist = distance(centered, uMouse);
  float mouseForce = smoothstep(0.4, 0.0, mouseDist); // Radius of influence
  
  // Audio Force
  float audioForce = uAudio * 0.2; // Scaling audio impact

  // --- Morphing Logic (Scroll Driven) ---
  
  // Phase 1: Linear Patterns (Scroll 0)
  // Distort Y based on X and Noise
  float linearWave = sin(centered.y * 50.0 + uTime * 0.5 + snoise(centered * 2.0 + uTime * 0.2) * (0.1 + mouseForce * 0.5 + audioForce));
  
  // Phase 2: Radial/Womb Patterns (Scroll 1)
  // Distort Distance based on Angle and Noise
  float len = length(centered);
  float angle = atan(centered.y, centered.x);
  
  // Create a "Womb" sphere effect using radial sine waves + noise
  float radialWave = sin(len * (20.0 - uAudio * 10.0) - uTime * 0.8 + snoise(vec2(angle, uTime * 0.1)) * 2.0);
  
  // The Morph: Blend between Linear (y-based) and Radial (length-based) pattern
  float pattern = mix(linearWave, radialWave, smoothstep(0.2, 0.8, uScroll));
  
  // --- Shaping the "Womb" Circle Container ---
  // As we scroll, we want to mask the edges to form a circle
  float circleMask = smoothstep(0.5, 0.4, len); // Hard circle at center
  float fullScreenMask = 1.0; 
  // Blend masks: Full screen at start -> Circle at end
  float mask = mix(fullScreenMask, circleMask, smoothstep(0.1, 0.6, uScroll));
  
  // --- Color Grading ---
  
  // Color 1: Linear / Void (Cyan/White)
  vec3 colorLines = vec3(0.8, 0.9, 1.0) * smoothstep(0.9, 1.0, pattern);
  
  // Color 2: Womb / Gold / Red (Deep Organic)
  // Create a deep gradient for the background of the womb
  vec3 wombCore = vec3(0.2, 0.05, 0.0); // Dark red/brown
  vec3 wombGlow = vec3(1.0, 0.6, 0.1); // Gold
  
  // Organic pulse in the womb
  float pulse = snoise(centered * 3.0 - uTime * 0.5);
  vec3 colorWomb = mix(wombCore, wombGlow, smoothstep(0.0, 1.0, radialWave + pulse * 0.5));
  
  // Final Blend based on Scroll
  vec3 finalColor = mix(colorLines, colorWomb, smoothstep(0.2, 0.8, uScroll));
  
  // Add Audio Glow
  finalColor += vec3(0.2, 0.4, 1.0) * audioForce * (1.0 - uScroll); // Blue glow at start
  finalColor += vec3(1.0, 0.2, 0.0) * audioForce * uScroll; // Red/Gold pulse at end

  // Apply Mask
  float alpha = mask;
  
  // Make the lines sharp lines
  // Pattern is -1 to 1. 
  // For lines: we want distinct bands.
  float bands = smoothstep(0.4, 0.5, abs(pattern));
  
  // In Womb mode, we want a glowing field, not just lines
  float field = mix(bands, pattern * 0.5 + 0.5, uScroll);

  gl_FragColor = vec4(finalColor * field, alpha);
}
`;

// --- Scene Component ---

const FrequencyField = ({ isMicActive }: { isMicActive: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const scroll = useScroll();
    const { viewport, size } = useThree();
    
    // Audio Analyser Setup
    const audioRef = useRef<{ context: AudioContext, analyser: AnalyserNode, data: Uint8Array } | null>(null);

    useEffect(() => {
        if (isMicActive && !audioRef.current) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = context.createAnalyser();
                analyser.fftSize = 64;
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

    // Animation Loop
    useFrame((state) => {
        if (!materialRef.current) return;
        
        // 1. Time
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        
        // 2. Scroll (Smoothed by Drei)
        // scroll.offset is 0 to 1
        materialRef.current.uniforms.uScroll.value = scroll.offset;
        
        // 3. Mouse (Smoothed Lerp)
        const currentX = materialRef.current.uniforms.uMouse.value.x;
        const currentY = materialRef.current.uniforms.uMouse.value.y;
        
        // Slower lerp factor = more "fluid" drag feel
        materialRef.current.uniforms.uMouse.value.x += (state.mouse.x * 0.5 - currentX) * 0.05;
        materialRef.current.uniforms.uMouse.value.y += (state.mouse.y * 0.5 - currentY) * 0.05;

        // 4. Audio
        if (audioRef.current) {
            audioRef.current.analyser.getByteFrequencyData(audioRef.current.data as any);
            const avg = audioRef.current.data.reduce((a,b) => a+b, 0) / audioRef.current.data.length;
            const normalized = avg / 255;
            // Lerp audio for smoothness
            const currentAudio = materialRef.current.uniforms.uAudio.value;
            materialRef.current.uniforms.uAudio.value += (normalized - currentAudio) * 0.1;
        } else {
             // Decay to 0
             materialRef.current.uniforms.uAudio.value *= 0.95;
        }
    });

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uAudio: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
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
        // scroll.offset 0 -> 1
        // Hero visible 0 -> 0.3
        setOpacityHero(1 - Math.min(1, scroll.offset * 4));
        
        // Reveal visible 0.7 -> 1
        setOpacityReveal(Math.max(0, (scroll.offset - 0.7) * 4));
    });

    return (
        <Scroll html>
            <div className="w-full">
            {/* Section 1: Hero */}
            <div className="h-screen w-full flex flex-col items-center justify-center relative pointer-events-none" style={{ opacity: opacityHero }}>
                <div className="relative z-10 text-center mix-blend-difference">
                    <h1 className="text-[12vw] font-serif font-light leading-none tracking-tighter text-white">
                        Silence is<br/>
                        <span className="italic text-white/50">Frequency</span>
                    </h1>
                    <div className="flex justify-center mt-8">
                        <div className="w-px h-32 bg-white/30" />
                    </div>
                </div>
            </div>

            {/* Section 2: Spacer for Morph */}
            <div className="h-screen w-full flex items-center justify-center pointer-events-none">
                 {/* Visuals handled by Shader Morph */}
            </div>

            {/* Section 3: The Womb Reveal */}
            <div className="h-screen w-full flex flex-col items-center justify-center relative" style={{ opacity: opacityReveal }}>
                <div className="text-center z-10 pointer-events-auto">
                    <div className="inline-block border border-mycelium-gold/30 rounded-full px-6 py-2 text-xs uppercase tracking-[0.3em] text-mycelium-gold mb-8 backdrop-blur-md bg-black/20">
                         The Chamber
                    </div>
                    
                    <h2 className="text-[10vw] font-serif leading-none text-transparent bg-clip-text bg-gradient-to-b from-mycelium-gold to-orange-900 drop-shadow-sm mb-12">
                         God is<br/>Frequency.
                    </h2>

                    {!isMicActive ? (
                        <button 
                            onClick={() => setIsMicActive(true)}
                            className="group relative inline-flex items-center justify-center px-10 py-5 overflow-hidden rounded-full bg-mycelium-gold/10 border border-mycelium-gold/40 text-mycelium-gold transition-all hover:bg-mycelium-gold hover:text-black hover:scale-105"
                        >
                            <span className="relative z-10 font-medium text-lg tracking-wide flex items-center gap-3">
                                <Mic className="w-5 h-5" /> Enter The Chamber
                            </span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-1000">
                             <div className="flex items-center gap-2 text-mycelium-gold/60 text-sm uppercase tracking-widest animate-pulse">
                                 <Volume2 className="w-4 h-4" /> Listening... Speak to the Womb
                             </div>
                             <p className="max-w-md text-white/40 font-light leading-relaxed">
                                 Your voice is now influencing the harmonic structure of the field.
                             </p>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </Scroll>
    );
}


export default function V4Page() {
    const [isMicActive, setIsMicActive] = useState(false);

    return (
        <div className="h-screen w-full bg-[#050403]">
            <Canvas>
                <ScrollControls pages={3} damping={0.2}>
                    <FrequencyField isMicActive={isMicActive} />
                    <OverlayContent isMicActive={isMicActive} setIsMicActive={setIsMicActive} />
                </ScrollControls>
            </Canvas>

            {/* Sticky UI */}
            <div className="fixed top-8 left-8 z-50 text-white/20 font-mono text-xs mix-blend-difference pointer-events-none">
                V4: HIGH_FREQUENCY_MATERIALIZATION // WEBGL
            </div>
            
            <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Back to Menu
            </Link>
        </div>
    );
}