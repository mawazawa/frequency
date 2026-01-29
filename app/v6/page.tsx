"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useScroll, ScrollControls, Scroll, Text, MeshTransmissionMaterial, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Mic, Volume2 } from "lucide-react";
import Link from "next/link";

// --- Shaders for Frequency Field (Background) ---

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
  
  // Aspect Correction
  vec2 centered = uv - 0.5;
  centered.x *= uResolution.x / uResolution.y;

  // --- Interaction Physics ---
  
  // Mouse: Proximity Ripple
  float mouseDist = distance(centered, uMouse);
  // Ripple radius affected by velocity
  float rippleRadius = 0.4 + uMouseVel * 0.2; 
  float mouseForce = smoothstep(rippleRadius, 0.0, mouseDist) * (1.0 + uMouseVel * 5.0);
  
  // Audio: Amplified
  float audioForce = pow(uAudio * 4.0, 1.8); // Non-linear boost

  // --- Morphing & Density Logic ---
  
  // 1. Linear Phase (Start)
  // High-Density Hairlines
  float baseDensity = 800.0;
  float density = mix(baseDensity, 200.0, smoothstep(0.0, 0.5, uScroll));
  
  // Flattened distortion for structural feel, not psychedelic
  float noiseField = snoise(centered * 2.0 + uTime * 0.05);
  float distortion = noiseField * (0.01 + mouseForce * 0.1 + audioForce * 0.1);
  
  // The Lines: Sharp Hairlines
  float linearPattern = sin((centered.y + distortion) * density + uTime * 0.2);
  float lines = smoothstep(0.992, 1.0, linearPattern); 
  
  // 2. Radial Phase (Womb)
  float len = length(centered);
  float angle = atan(centered.y, centered.x);
  
  float radialWave = sin(len * (60.0 - audioForce * 5.0) - uTime * 0.2 + snoise(vec2(angle, uTime * 0.1)) * (1.0 + mouseForce));
  float wombFill = smoothstep(0.98, 1.0, radialWave); // Also make womb lines thin
  
  // Mix Patterns based on Scroll
  float patternMix = smoothstep(0.3, 0.8, uScroll);
  float visual = mix(lines, wombFill * 0.3, patternMix); 
  
  // Masks
  float circleMask = smoothstep(0.5, 0.45, len);
  float fullScreenMask = 1.0; 
  float mask = mix(fullScreenMask, circleMask, smoothstep(0.2, 0.7, uScroll));
  
  // --- Color Grading (OKLCH-ish Vibrancy) ---
  
  // High-frequency energy color (Cold Industrial White/Blue)
  vec3 colorEnergy = vec3(0.85, 0.9, 0.95);
  
  // Deep Organic Color (Oil/Black)
  vec3 colorDeep = vec3(0.05, 0.05, 0.05);
  vec3 colorGold = vec3(0.4, 0.4, 0.45); // Steel
  
  // Dynamic mix
  vec3 finalColor = mix(colorEnergy * visual, 
                        mix(colorDeep, colorGold, radialWave * 0.5 + 0.5 + audioForce * 0.5), 
                        patternMix);

  // Audio Glow overlay (Subtle interference)
  finalColor += vec3(0.8, 0.9, 1.0) * audioForce * (1.0 - patternMix) * 0.3;
  finalColor += vec3(1.0, 1.0, 1.0) * audioForce * patternMix * 0.5;
  
  // Ensure a base visibility floor for the "Industrial" void
  finalColor += vec3(0.02); 

  gl_FragColor = vec4(finalColor, 1.0); // Background plane should be opaque
}
`;

// --- Components ---

const GlassText = ({ scroll }: { scroll: any }) => {
    const textGroup = useRef<THREE.Group>(null);
    const { width, height } = useThree((state) => state.viewport);
    
    useFrame(() => {
        if (!textGroup.current) return;
        
        // Reveal Logic:
        // Visible only at the end of scroll (0.8 -> 1.0)
        const revealProgress = Math.max(0, (scroll.offset - 0.75) * 4); // 0 to 1
        
        // Position: Fly up slightly
        textGroup.current.position.y = THREE.MathUtils.lerp(-2, 0, revealProgress);
        // Scale/Opacity handled by Transmission material properties ideally, but simple scale works
        const scale = THREE.MathUtils.lerp(0.8, 1, revealProgress);
        textGroup.current.scale.setScalar(scale);
        
        // Hide if not near end
        textGroup.current.visible = scroll.offset > 0.7;
    });

    const materialProps = {
        transmission: 1.1,
        thickness: 3.5,     // Thicker glass
        roughness: 0.1,     // Sharper
        chromaticAberration: 0.2, // Increased aberration
        anisotropy: 0.8,    // Industrial brushed look
        distortion: 0.8,
        distortionScale: 0.6,
        temporalDistortion: 0.1,
        ior: 1.4,           // Higher index of refraction
        color: '#f0f0f0',
        'g-alpha': 1,
        attenuationDistance: 0.4,
        attenuationColor: '#ffffff',
        toneMapped: false,
    };

    return (
        <group ref={textGroup} visible={false}>
            {/* "God is" */}
            <Text
                fontSize={width * 0.1}
                position={[0, width * 0.08, 0]}
                anchorX="center"
                anchorY="middle"
                letterSpacing={-0.1}
            >
                GOD IS
                <MeshTransmissionMaterial {...materialProps} />
            </Text>

            {/* "Frequency" */}
            <Text
                fontSize={width * 0.12}
                position={[0, -width * 0.08, 0]}
                anchorX="center"
                anchorY="middle"
                letterSpacing={-0.05}
            >
                FREQUENCY
                <MeshTransmissionMaterial {...materialProps} />
            </Text>
        </group>
    );
};

const BackgroundField = ({ isMicActive }: { isMicActive: boolean }) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const scroll = useScroll();
    const { viewport, mouse, size } = useThree();
    
    // Audio Setup
    const audioRef = useRef<{ context: AudioContext, analyser: AnalyserNode, data: Uint8Array } | null>(null);
    
    // Mouse Physics State
    const mouseState = useRef({ x: 0, y: 0, vel: 0 });

    useEffect(() => {
        if (isMicActive && !audioRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContext();
            const analyser = context.createAnalyser();
            analyser.fftSize = 512; // Increased resolution
            analyser.smoothingTimeConstant = 0.8;
            
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const source = context.createMediaStreamSource(stream);
                source.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);
                audioRef.current = { context, analyser, data };
            }).catch(e => console.error("Mic Error", e));
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
        
        // 1. Uniforms
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        materialRef.current.uniforms.uScroll.value = scroll.offset;
        
        // 2. Mouse Physics (Velocity calculation)
        const targetX = (state.mouse.x * viewport.width) / 2;
        const targetY = (state.mouse.y * viewport.height) / 2;
        
        // Calculate velocity based on movement since last frame
        const dx = state.mouse.x - mouseState.current.x;
        const dy = state.mouse.y - mouseState.current.y;
        const velocity = Math.sqrt(dx*dx + dy*dy);
        
        // Smooth velocity
        mouseState.current.vel += (velocity - mouseState.current.vel) * 0.1;
        materialRef.current.uniforms.uMouseVel.value = mouseState.current.vel;
        
        // Update stored pos
        mouseState.current.x = state.mouse.x;
        mouseState.current.y = state.mouse.y;

        // Smooth Mouse Pos
        const currentX = materialRef.current.uniforms.uMouse.value.x;
        const currentY = materialRef.current.uniforms.uMouse.value.y;
        materialRef.current.uniforms.uMouse.value.x += (state.mouse.x * 0.5 - currentX) * 0.1;
        materialRef.current.uniforms.uMouse.value.y += (state.mouse.y * 0.5 - currentY) * 0.1;

        // 3. Audio Physics
        if (audioRef.current) {
            audioRef.current.analyser.getByteFrequencyData(audioRef.current.data as any);
            
            // Calculate average volume
            let sum = 0;
            for(let i = 0; i < audioRef.current.data.length; i++) {
                sum += audioRef.current.data[i];
            }
            const avg = sum / audioRef.current.data.length;
            const normalized = avg / 255;
            
            // Apply smoothing
            const currentAudio = materialRef.current.uniforms.uAudio.value;
            if (normalized > currentAudio) {
                 materialRef.current.uniforms.uAudio.value = normalized; // Instant attack
            } else {
                 materialRef.current.uniforms.uAudio.value += (normalized - currentAudio) * 0.1; // Slow decay
            }
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
        <mesh scale={[viewport.width, viewport.height, 1]} position={[0, 0, -1]}>
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

const HTMLOverlay = ({ isMicActive, setIsMicActive }: { isMicActive: boolean, setIsMicActive: (v: boolean) => void }) => {
    const scroll = useScroll();
    const [opacityHero, setOpacityHero] = useState(1);
    const [opacityReveal, setOpacityReveal] = useState(0);

    useFrame(() => {
        setOpacityHero(1 - Math.min(1, scroll.offset * 4));
        setOpacityReveal(Math.max(0, (scroll.offset - 0.75) * 4));
    });

    return (
        <Scroll html>
            <div className="w-full">
            {/* Hero */}
            <div className="h-screen w-full flex flex-col items-center justify-center relative pointer-events-none" style={{ opacity: opacityHero }}>
                <div className="relative z-10 text-center">
                    <h1 className="text-[12vw] font-mono font-bold leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] mix-blend-overlay uppercase">
                        SILENCE IS<br/>
                        <span className="text-white/40">FREQUENCY</span>
                    </h1>
                </div>
            </div>

            {/* Middle Spacer */}
            <div className="h-[150vh] w-full" />

            {/* Reveal Controls (Text is 3D, this is just the button) */}
            <div className="h-screen w-full flex flex-col items-center justify-end pb-32 relative pointer-events-none" style={{ opacity: opacityReveal }}>
                <div className="text-center z-10 pointer-events-auto">
                    {!isMicActive ? (
                        <button 
                            onClick={() => setIsMicActive(true)}
                            className="group relative inline-flex items-center justify-center px-10 py-5 bg-white text-black font-mono font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all active:scale-95"
                            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                        >
                            <span className="flex items-center gap-3">
                                <Mic className="w-4 h-4" /> INITIALIZE
                            </span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-1000">
                             <div className="flex items-center gap-2 text-white/60 font-mono text-xs uppercase tracking-widest animate-pulse">
                                 <Volume2 className="w-4 h-4" /> FIELD_ACTIVE
                             </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </Scroll>
    );
};

export default function V6Page() {
    const [isMicActive, setIsMicActive] = useState(false);

    return (
        <div className="h-screen w-full bg-[#030303] selection:bg-cyan-500/30">
            <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
                <Environment preset="night" />
                <ScrollControls pages={3} damping={0.2}>
                    <BackgroundField isMicActive={isMicActive} />
                    <GlassTextWrapper />
                    <HTMLOverlay isMicActive={isMicActive} setIsMicActive={setIsMicActive} />
                </ScrollControls>
                
                {/* Lighting for Glass */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={1} />
                {/* Environment for Reflections */}
                {/* Simple environment map is needed for TransmissionMaterial to look good if no background texture */}
                {/* We rely on the BackgroundField plane behind it, MeshTransmissionMaterial handles grabbing background buffer */}
            </Canvas>

            <div className="fixed top-8 left-8 z-50 text-white/20 font-mono text-xs mix-blend-difference pointer-events-none">
                V6: GLASS_PHYSICS // HIGH_DENSITY // REACTIVE
            </div>
            
             <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Back to Menu
            </Link>
        </div>
    );
}

// Wrapper to access useScroll hook context
const GlassTextWrapper = () => {
    const scroll = useScroll();
    return <GlassText scroll={scroll} />;
}
