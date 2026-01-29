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

  // --- Physical Interaction ---
  float mouseDist = length(centered - uMouse);
  float mouseForce = smoothstep(0.4, 0.0, mouseDist);
  
  // VOICE IS THE PRIMARY DRIVER OF CYMATICS
  // Massive boost + Surge logic
  float audioForce = pow(uAudio, 1.2) * 5.0;

  // The Grid Density (Cache-Busted Name)
  float uBaseFrequency = 60.0;

  // STRAIGHT LINES BY DEFAULT
  // We use multiple noise octaves for "visceral" distortion
  float noise1 = snoise(centered * 2.0 + uTime * 0.1);
  float noise2 = snoise(centered * 8.0 - uTime * 0.5) * 0.2; // Jitter layer
  
  float distortion = (noise1 + noise2 * audioForce) * audioForce * (0.8 + mouseForce * 0.5);
  
  // Ripple effect: Fast and aggressive with sound
  float ripple = sin(mouseDist * 20.0 - uTime * 8.0) * mouseForce * audioForce * 0.3;
  
  // The Phase
  float linearPattern = sin((centered.y + distortion + ripple) * uBaseFrequency + uTime * 0.1);
  
  // Hairline sharpening (Thickened slightly for visibility)
  float lines = smoothstep(0.95, 1.0, linearPattern);
  
  // --- Radial Phase (Womb) ---
  float len = length(centered);
  float angle = atan(centered.y, centered.x);
  float radialWave = sin(len * 40.0 - uTime * 0.5 + snoise(vec2(angle, uTime * 0.1)) * audioForce * 2.0);
  float wombLines = smoothstep(0.97, 1.0, radialWave);

  // Blend based on Scroll
  float patternMix = smoothstep(0.2, 0.8, uScroll);
  float visual = mix(lines, wombLines, patternMix);

  // --- Final Output ---
  vec3 colorLines = vec3(0.9, 0.95, 1.0) * visual;
  vec3 colorWomb = vec3(1.0, 0.7, 0.3) * visual;
  vec3 finalColor = mix(colorLines, colorWomb, patternMix);
  
  // Sub-pixel physics: Subtle glow floor
  finalColor += vec3(0.02) * (1.0 + audioForce);

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

    useEffect(() => {
        if (isMicActive && !audioRef.current) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const analyser = context.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.4; // Snappier response
                const source = context.createMediaStreamSource(stream);
                source.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);
                audioRef.current = { context, analyser, data };
            });
        }
    }, [isMicActive]);

    useFrame((state) => {
        if (!materialRef.current) return;
        
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        materialRef.current.uniforms.uScroll.value = scroll.offset;
        
        // Fluid Mouse
        const currentX = materialRef.current.uniforms.uMouse.value.x;
        const currentY = materialRef.current.uniforms.uMouse.value.y;
        materialRef.current.uniforms.uMouse.value.x += (state.mouse.x * 0.5 - currentX) * 0.08;
        materialRef.current.uniforms.uMouse.value.y += (state.mouse.y * 0.5 - currentY) * 0.08;

        // Audio Input: BOOSTED SENSITIVITY
        if (audioRef.current) {
            audioRef.current.analyser.getByteFrequencyData(audioRef.current.data as any);
            // Use Max instead of Avg for higher sensitivity
            let maxVal = 0;
            for(let i = 0; i < audioRef.current.data.length; i++) {
                if(audioRef.current.data[i] > maxVal) maxVal = audioRef.current.data[i];
            }
            const normalized = maxVal / 255;
            const currentAudio = materialRef.current.uniforms.uAudio.value;
            // Instant attack, slightly slower decay
            if (normalized > currentAudio) {
                materialRef.current.uniforms.uAudio.value = normalized;
            } else {
                materialRef.current.uniforms.uAudio.value += (normalized - currentAudio) * 0.2;
            }
        } else {
             materialRef.current.uniforms.uAudio.value *= 0.9;
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
            <div className="h-screen w-full flex flex-col items-center justify-center relative pointer-events-none" style={{ opacity: opacityHero }}>
                <div className="relative z-10 text-center mix-blend-difference">
                    <h1 className="text-[10vw] font-mono font-bold leading-none tracking-tighter text-white uppercase">
                        V9: ARCHITECTURAL<br/>
                        <span className="text-white/40 italic">
                            CYMATICS
                        </span>
                    </h1>
                </div>
            </div>
            <div className="h-screen w-full" />
            <div className="h-screen w-full flex flex-col items-center justify-center relative" style={{ opacity: opacityReveal }}>
                <div className="text-center z-10 pointer-events-auto">
                    {!isMicActive ? (
                        <button 
                            onClick={() => setIsMicActive(true)}
                            className="px-10 py-5 border border-white/20 bg-white/5 text-white font-mono uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                             Activate Mic for Cymatics
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-1000">
                             <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest animate-pulse font-mono">
                                 <Volume2 className="w-4 h-4" /> Harmonic_Listener_Active
                             </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </Scroll>
    );
}

export default function V9Page() {
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
                V9: VOICE_ACTIVATED_GEOMETRY // ARCHITECTURAL
            </div>
            
            <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Back to Menu
            </Link>
        </div>
    );
}