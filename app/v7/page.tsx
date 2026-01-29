"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useScroll, ScrollControls, Scroll, Text, MeshTransmissionMaterial, Environment } from "@react-three/drei";
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
uniform float uAudio;       // Instant audio level
uniform float uSpring;      // Physics-simulated "elastic" value
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

  // --- Interaction Physics ---
  
  // Mouse: Proximity Ripple
  float mouseDist = distance(centered, uMouse);
  float rippleRadius = 0.4 + uMouseVel * 0.3; 
  float mouseForce = smoothstep(rippleRadius, 0.0, mouseDist) * (1.0 + uMouseVel * 8.0);
  
  // Spring Physics Visualization
  // uSpring oscillates. We use it to drive the "Expansion" of the field.
  // Positive uSpring = Expansion / Color Brightness
  float springForce = uSpring * 3.0; 

  // --- High Density Line Field (V7) ---
  
  // Density Logic: Hairline Grid
  float baseDensity = 1000.0; 
  float density = mix(baseDensity, 400.0, smoothstep(0.0, 0.6, uScroll));
  
  // Muted Distortion
  float noiseField = snoise(centered * 3.0 + uTime * 0.1);
  float distortion = noiseField * (0.005 + mouseForce * 0.05 + springForce * 0.05);
  
  // The Lines: Hairlines
  float linearPattern = sin((centered.y + distortion) * density + uTime * 0.3 + springForce * 2.0);
  float lines = smoothstep(0.995, 1.0, linearPattern); 
  
  // --- Radial / Womb Phase ---
  
  float len = length(centered);
  float angle = atan(centered.y, centered.x);
  
  // Womb Sphere: Hairline Radial Grid
  float sphereRadius = 80.0 - springForce * 10.0; 
  float radialWave = sin(len * sphereRadius - uTime * 0.3 + snoise(vec2(angle, uTime * 0.1)) * (0.5 + mouseForce));
  float wombFill = smoothstep(0.99, 1.0, radialWave);
  
  // Mix Patterns based on Scroll
  float patternMix = smoothstep(0.3, 0.8, uScroll);
  float visual = mix(lines, wombFill * 0.4, patternMix);
  
  // --- Color Grading (Muted Industrial) ---
  
  vec3 colorDeep = vec3(0.0, 0.0, 0.01);
  vec3 colorSteel = vec3(0.6, 0.7, 0.8);    
  vec3 colorAccent = vec3(0.8, 0.2, 0.2);   
  
  vec3 baseColor = mix(colorDeep, colorSteel, visual * 0.6);
  
  float springGlow = smoothstep(0.7, 1.0, abs(uSpring));
  vec3 finalColor = mix(baseColor, colorAccent, springGlow * 0.3 * patternMix);

  // Add Mouse Glow
  finalColor += vec3(0.5, 0.0, 1.0) * mouseForce * 0.8; // Purple interaction
  
  finalColor += vec3(0.01); // Subtle visibility floor

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// --- Components ---

const GlassText = ({ scroll }: { scroll: any }) => {
    const textGroup = useRef<THREE.Group>(null);
    const { width } = useThree((state) => state.viewport);
    
    // Physics State for Glass Shake
    const shake = useRef(0);

    useFrame((state) => {
        if (!textGroup.current) return;
        
        // Reveal Logic
        const revealProgress = Math.max(0, (scroll.offset - 0.75) * 4);
        textGroup.current.position.y = THREE.MathUtils.lerp(-2, 0, revealProgress);
        
        // Shake Physics (driven by audio in parent, but we simulate a local shake here or pass it down)
        // For now, simple breathing scale
        const scale = THREE.MathUtils.lerp(0.8, 1, revealProgress) + Math.sin(state.clock.elapsedTime) * 0.02;
        textGroup.current.scale.setScalar(scale);
        
        textGroup.current.visible = scroll.offset > 0.7;
    });

    const materialProps = {
        transmission: 1.0,      // Clearer
        thickness: 5.0,         // Thick block
        roughness: 0.4,         // Frosted
        chromaticAberration: 0.5, // Extreme split
        anisotropy: 0.2,
        distortion: 1.5,        // Heavy warp
        distortionScale: 0.3,
        temporalDistortion: 0.4,
        ior: 1.5,
        color: '#ff0000',       // Red tint
        attenuationDistance: 0.2,
        attenuationColor: '#000000', // Dark attenuation
    };

    return (
        <group ref={textGroup} visible={false}>
            {/* "God is" */}
            <Text
                fontSize={width * 0.15}
                position={[0, width * 0.06, 0]}
                anchorX="center"
                anchorY="middle"
                letterSpacing={-0.08}
                fontWeight={900}
            >
                GOD IS
                <MeshTransmissionMaterial {...materialProps} />
            </Text>

            {/* "Frequency" */}
            <Text
                fontSize={width * 0.15}
                position={[0, -width * 0.09, 0]}
                anchorX="center"
                anchorY="middle"
                letterSpacing={-0.08}
                fontWeight={900}
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
    const { viewport, size } = useThree();
    
    const audioRef = useRef<{ context: AudioContext, analyser: AnalyserNode, data: Uint8Array } | null>(null);
    const mouseState = useRef({ x: 0, y: 0, vel: 0 });
    
    // Spring Physics State
    const spring = useRef({
        value: 0,
        velocity: 0,
        target: 0,
        stiffness: 0.15, // Tension
        damping: 0.85    // Friction (0.9 = bouncy, 0.5 = overdamped)
    });

    useEffect(() => {
        if (isMicActive && !audioRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContext();
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.3; // Responsive
            
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
        
        // 1. Uniforms Base
        materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
        materialRef.current.uniforms.uScroll.value = scroll.offset;
        
        // 2. Mouse Physics
        const dx = state.mouse.x - mouseState.current.x;
        const dy = state.mouse.y - mouseState.current.y;
        const velocity = Math.sqrt(dx*dx + dy*dy);
        mouseState.current.vel += (velocity - mouseState.current.vel) * 0.1;
        materialRef.current.uniforms.uMouseVel.value = mouseState.current.vel;
        mouseState.current.x = state.mouse.x;
        mouseState.current.y = state.mouse.y;
        
        const currentX = materialRef.current.uniforms.uMouse.value.x;
        const currentY = materialRef.current.uniforms.uMouse.value.y;
        materialRef.current.uniforms.uMouse.value.x += (state.mouse.x * 0.5 - currentX) * 0.1;
        materialRef.current.uniforms.uMouse.value.y += (state.mouse.y * 0.5 - currentY) * 0.1;

        // 3. Audio & Spring Physics
        let audioInput = 0;
        if (audioRef.current) {
            audioRef.current.analyser.getByteFrequencyData(audioRef.current.data as any);
            let sum = 0;
            // Focus on bass/mids for impact
            const range = Math.floor(audioRef.current.data.length * 0.5);
            for(let i = 0; i < range; i++) {
                sum += audioRef.current.data[i];
            }
            audioInput = (sum / range) / 255;
        }

        // SPRING LOGIC
        // Target is the audio input (boosted)
        spring.current.target = audioInput * 2.0;
        
        // Force = (Target - Current) * K
        const force = (spring.current.target - spring.current.value) * spring.current.stiffness;
        
        // Velocity += Force
        spring.current.velocity += force;
        
        // Velocity *= Damping
        spring.current.velocity *= spring.current.damping;
        
        // Value += Velocity
        spring.current.value += spring.current.velocity;

        // Apply to Uniforms
        materialRef.current.uniforms.uAudio.value = audioInput; // Raw for glow
        materialRef.current.uniforms.uSpring.value = spring.current.value; // Physics for distortion
    });

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uAudio: { value: 0 },
            uSpring: { value: 0 }, // New Uniform
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
                    <h1 className="text-[14vw] font-black leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-red-500 to-black drop-shadow-[0_0_20px_rgba(255,0,0,0.5)] mix-blend-overlay uppercase">
                        SILENCE IS<br/>
                        <span className="text-red-600">FREQUENCY</span>
                    </h1>
                </div>
            </div>

            {/* Middle Spacer */}
            <div className="h-[150vh] w-full" />

            {/* Reveal Controls */}
            <div className="h-screen w-full flex flex-col items-center justify-end pb-32 relative pointer-events-none" style={{ opacity: opacityReveal }}>
                <div className="text-center z-10 pointer-events-auto">
                    {!isMicActive ? (
                        <button 
                            onClick={() => setIsMicActive(true)}
                            className="group relative inline-flex items-center justify-center px-12 py-6 bg-red-600 text-black font-black text-lg tracking-tighter uppercase hover:bg-red-500 transition-all active:scale-95"
                            style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
                        >
                            <span className="flex items-center gap-3">
                                <Mic className="w-6 h-6" /> ENGAGE_CORE
                            </span>
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-1000">
                             <div className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest animate-pulse">
                                 <Volume2 className="w-4 h-4" /> SYSTEM_CRITICAL
                             </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </Scroll>
    );
};

export default function V7Page() {
    const [isMicActive, setIsMicActive] = useState(false);

    return (
        <div className="h-screen w-full bg-[#030303] selection:bg-cyan-500/30">
            <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
                <Environment preset="city" />
                <ScrollControls pages={3} damping={0.2}>
                    <BackgroundField isMicActive={isMicActive} />
                    <GlassTextWrapper />
                    <HTMLOverlay isMicActive={isMicActive} setIsMicActive={setIsMicActive} />
                </ScrollControls>
                
                {/* Lighting for Glass */}
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={1} />
            </Canvas>

            <div className="fixed top-8 left-8 z-50 text-white/20 font-mono text-xs mix-blend-difference pointer-events-none">
                V7: SPRING_PHYSICS // DENSITY_X4 // GLASS
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
