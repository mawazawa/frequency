"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Waves, Disc, Sprout } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
// Duplicate React import removed.
import Image from 'next/image';
import * as THREE from 'three';
import clsx from 'clsx';
import Link from 'next/link';
import { useMicAudio } from '@/hooks/useMicAudio';
import { useAmbientSound } from '@/hooks/useAmbientSound';

// --- Shared Styles & Fonts ---
const FontStyles = () => (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600&family=Inter:wght@200;300;400&display=swap');
    
    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-playfair { font-family: 'Playfair Display', serif; }
    
    /* Metal Text Effect for Hero */
    .metal-text {
        background-image: linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 48%, #475569 50%, #94A3B8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
    }
  `}</style>
);

// --- Cinematic Intro Engine ---

// 1. Shaders for the "God Is" -> "Lines" Morph
const silverParticleVertex = `
  uniform float uTime;
  uniform float uMorph; // 0 = Text, 1 = Lines
  uniform float uScroll;
  uniform float uParticleSize;
  
  attribute vec3 linePosition; // Target position for lines state
  attribute float randomOffset;
  
  varying float vAlpha;
  varying float vShimmer;
  
  void main() {
    // Morph Logic
    vec3 currentPos = mix(position, linePosition, smoothstep(0.0, 1.0, uMorph));
    
    // Add noise/vibration to lines state
    if (uMorph > 0.5) {
        float wave = sin(currentPos.x * 2.0 + uTime * 2.0 + randomOffset * 10.0);
        currentPos.z += wave * 0.1 * uMorph; // Vibrating depth in line mode
        currentPos.y += cos(currentPos.x * 5.0 + uTime) * 0.02 * uMorph;
    }

    // Scroll effect (move up and away)
    // When uScroll > 0, the whole system moves naturally as part of the page flow
    // But we might want specific effects:
    // currentPos.y += uScroll * 5.0; // Handled by container transform usually, but let's keep it local if needed

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = uParticleSize * (300.0 / -mvPosition.z);
    
    // Shimmer effect calculation
    vShimmer = sin(uTime * 3.0 + randomOffset * 20.0);
    
    // Alpha fade based on lifecycle
    vAlpha = 1.0; 
  }
`;

const silverParticleFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  
  varying float vAlpha;
  varying float vShimmer;
  
  void main() {
    // Circle shape
    if(length(gl_PointCoord - 0.5) > 0.5) discard;
    
    // Aluminum / Silver Shimmer
    // Base is white/silver, shimmer adds brightness
    float brightness = 0.8 + 0.4 * vShimmer;
    vec3 finalColor = uColor * brightness;
    
    gl_FragColor = vec4(finalColor, uOpacity * vAlpha);
  }
`;

// 2. V10 Blue Field Shaders (Genesis/Revelation) - slightly optimized for background use
const fieldVertexShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uVoice;
  uniform float uVolume; // Master volume for visual intensity
  uniform float uScroll; // Controls the "Horizon" bend
  uniform int uShapeFn;  // 0:Genesis, 1:Revelation, 2:Ascension
  uniform float uParticleSize;
  
  varying float vDisplacement;
  varying float vDist; // Distance from center for fades

  // Simple Noise
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
    vec2 pos = uv * 2.0 - 1.0; // Normalised Coordinates -1 to 1
    vDist = length(pos);
    
    float PI = 3.14159;
    float displacement = 0.0;
    float t = uTime * 0.5;

    // --- Shape Logic ---
    if (uShapeFn == 0) { // Genesis (Smooth Waves)
        float n = 3.0 + uBass * 0.5;
        float m = 3.0 + uVoice * 2.0; 
        float wave = cos(n * pos.x * PI) * cos(m * pos.y * PI) - cos(m * pos.x * PI) * cos(n * pos.y * PI);
        displacement = wave * (uVolume * 2.0);
    } 
    else if (uShapeFn == 1) { // Revelation (Geometric/Crystalline)
        vec2 grid = abs(fract(pos * 4.0) - 0.5);
        displacement = (1.0 - max(grid.x, grid.y)) * (uVolume * 3.0);
        displacement *= cos(t * 1.5 + length(pos) * 4.0);
    } 

    vec3 newPos = position;
    newPos.z += displacement * 1.5;

    // Scroll Transition: The "Field" is revealed behind the lines
    // We want it to curve up from the deep
    
    vDisplacement = abs(displacement);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    gl_PointSize = (uParticleSize + vDisplacement * 2.0) * (5.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fieldFragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uOpacity; 
  
  varying float vDisplacement;
  varying float vDist;

  void main() {
    if(length(gl_PointCoord - 0.5) > 0.5) discard;

    vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 2.0, vDisplacement));
    
    // Circular vignette fade
    float alpha = (1.0 - smoothstep(0.4, 1.0, vDist)) * uOpacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`;


// --- CONSTANTS ---
// INTRO_PHASES removed as unused

// Smoothstep helper (same as GLSL smoothstep)
const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

const CinematicIntro = ({ onScrollRequest, getAudioData }: { onScrollRequest: () => void, getAudioData: () => { bass: number, mid: number, high: number } }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 8); // Start further back

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // --- 1. "God Is" Particles Setup ---
        // We generate positions from a canvas
        const generateTextPositions = (text: string) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return new Float32Array(0);
            canvas.width = 1024;
            canvas.height = 512;

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'white';
            ctx.font = 'bold 80px "Cinzel", serif'; // Use loaded font or fallback
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const positions = [];

            for (let y = 0; y < canvas.height; y += 4) { // stride for density
                for (let x = 0; x < canvas.width; x += 4) {
                    const index = (y * canvas.width + x) * 4;
                    if (data[index] > 50) { // Threshold
                        const pX = (x / canvas.width - 0.5) * 16.0; // Scale to world
                        const pY = -(y / canvas.height - 0.5) * 8.0;
                        positions.push(pX, pY, 0);
                    }
                }
            }
            return new Float32Array(positions);
        };

        const textPositions = generateTextPositions("God is");
        const count = textPositions.length / 3;

        // Generate "Line" Target Positions
        const linePositions = new Float32Array(count * 3);
        const randomOffsets = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            // Distribute into parallel lines (horizontal planes)
            const lineIndex = i % 20; // 20 lines
            const x = (Math.random() - 0.5) * 20.0; // Wide spread
            const z = (Math.random() - 0.5) * 5.0; // Depth
            const y = -2.0 + (lineIndex * 0.2); // Stacked vertically, slightly below center

            linePositions[i * 3] = x;
            linePositions[i * 3 + 1] = y;
            linePositions[i * 3 + 2] = z;

            randomOffsets[i] = Math.random();
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(textPositions, 3));
        particleGeometry.setAttribute('linePosition', new THREE.BufferAttribute(linePositions, 3));
        particleGeometry.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1));

        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorph: { value: 0 }, // 0 = text, 1 = lines
                uScroll: { value: 0 },
                uParticleSize: { value: 0.04 }, // Reduced for finer particles
                uColor: { value: new THREE.Color(0xdddddd) }, // Silver/Aluminum
                uOpacity: { value: 1.0 },
            },
            vertexShader: silverParticleVertex,
            fragmentShader: silverParticleFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);


        // --- 2. Blue Field Setup (Background) ---
        const fieldGeo = new THREE.PlaneGeometry(16, 16, 200, 200);
        const fieldMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBass: { value: 0.2 },
                uVoice: { value: 0.2 },
                uVolume: { value: 0.5 }, // Start dimmed
                uScroll: { value: 0 },
                uShapeFn: { value: 0 }, // Genesis
                uParticleSize: { value: 2.5 },
                uColor1: { value: new THREE.Vector3(0.0, 0.05, 0.2) }, // Dark Blue
                uColor2: { value: new THREE.Vector3(0.1, 0.4, 0.9) },  // Bright Blue
                uOpacity: { value: 0.0 } // Start invisible
            },
            vertexShader: fieldVertexShader,
            fragmentShader: fieldFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const fieldMesh = new THREE.Points(fieldGeo, fieldMat);
        fieldMesh.rotation.x = -0.3;
        fieldMesh.position.z = -5; // Behind everything
        scene.add(fieldMesh);


        // --- Animation Logic ---
        let startTime = Date.now();
        let frameId: number;

        const loop = () => {
            const now = Date.now();
            const elapsed = (now - startTime) * 0.001;
            const scroll = window.scrollY / window.innerHeight; // Normalized scroll 0-1 approx

            // Update Uniforms
            const audio = getAudioData();
            // Boost values for visual impact
            const bass = 0.2 + (audio.bass * 0.8);
            const voice = 0.2 + (audio.mid * 0.8);

            particleMaterial.uniforms.uTime.value = elapsed;
            fieldMat.uniforms.uTime.value = elapsed;

            // Audio Uniforms
            fieldMat.uniforms.uBass.value = THREE.MathUtils.lerp(fieldMat.uniforms.uBass.value, bass, 0.1);
            fieldMat.uniforms.uVoice.value = THREE.MathUtils.lerp(fieldMat.uniforms.uVoice.value, voice, 0.1);

            // Phase Logic
            // 0 -> 1: Auto morph after 3 seconds
            let morphProgress = 0;
            let fieldOpacity = 0;

            if (elapsed > 2.5) {
                // Start morphing to lines
                morphProgress = Math.min((elapsed - 2.5) * 0.5, 1.0); // 2s morph

                // Camera drift
                camera.position.z = 8.0 - morphProgress * 2.0; // Move in slightly
            }

            // Scroll Logic (Overrides/Adds to auto animation)
            if (scroll > 0.1) {
                morphProgress = 1.0; // Force to lines if scrolling

                // Field Reveal
                // Reveal starts at scroll 0.2, full by 0.5
                fieldOpacity = smoothstep(0.1, 0.5, scroll);

                // Move lines away/fade as field appears?
                // Or lines BECOME the bed. Let's keep them as a shimmering grid.

                // Tilt camera for 'Horizon' effect
                camera.rotation.x = -scroll * 0.2;
            }

            particleMaterial.uniforms.uMorph.value = morphProgress;
            fieldMat.uniforms.uOpacity.value = fieldOpacity;

            // Sync with actual scroll for parallax
            fieldMat.uniforms.uScroll.value = scroll;

            renderer.render(scene, camera);
            frameId = requestAnimationFrame(loop);
        };

        loop();

        // Resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameId);
            
            // Dispose Three.js Resources
            particleGeometry.dispose();
            particleMaterial.dispose();
            fieldGeo.dispose();
            fieldMat.dispose();

            renderer.dispose();
            if (container) container.innerHTML = '';
        };
    }); // getAudioData is stable from hook

    return <div ref={containerRef} className="fixed inset-0 z-0 bg-black" />;
};

// --- V1 Helper Components ---

const ProductBottle = () => {
    return (
        <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center">
            {/* The Bottle Representation */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-10 w-64 md:w-80 aspect-[3/5] rounded-[40px] shadow-2xl overflow-hidden backdrop-blur-sm border border-white/20"
                style={{
                    background: "linear-gradient(135deg, rgba(40,40,40,0.95) 0%, rgba(20,20,20,1) 100%)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(255,255,255,0.1)"
                }}
            >
                {/* Bottle Cap */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-16 bg-[#111] border-b border-white/10 z-20" />

                {/* Label Area */}
                <div className="absolute inset-4 top-24 border border-white/10 rounded-[20px] p-6 flex flex-col justify-between">
                    <div>
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-mycelium-gold to-transparent opacity-50 mb-4" />
                        <h2 className="text-mycelium-gold font-serif text-3xl text-center tracking-wide">CALM DOSE</h2>
                        <p className="text-white/40 text-[10px] text-center uppercase tracking-[0.2em] mt-2">Functional Mushroom Blend</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-white/30 font-mono border-t border-white/5 pt-2">
                            <span>BATCH: 004</span>
                            <span>180MG</span>
                        </div>
                        <div className="w-full h-32 opacity-20 relative overflow-hidden rounded-lg">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-50" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-mycelium-gold blur-[60px]" />
                        </div>
                    </div>
                </div>

                {/* Glass Reflection */}
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
            </motion.div>

            {/* Shadow Base */}
            <div className="absolute bottom-[10%] w-64 h-8 bg-black/20 blur-[20px] rounded-[100%]" />
        </div>
    );
}

const Accordion = ({ title, children }: { title: string, children: React.ReactNode }) => {
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
                <button
                    onClick={() => setSubType('sub')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300",
                        subType === 'sub' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5"
                    )}
                >
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
                <button
                    onClick={() => setSubType('once')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1",
                        subType === 'once' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'once' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
                            {subType === 'once' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                        </div>
                        <div className="text-left">
                            <span className="block font-medium text-sm text-white">One-time Purchase</span>
                        </div>
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
    )
}

// --- Main Page Component ---
export default function V11Page() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    const { startAudio, getFrequencyData: getAudioData } = useMicAudio();
    const { startAmbient } = useAmbientSound();
    
    const handleStartExperience = () => {
        startAudio();
        startAmbient();
    };

    // Background fade transition (for the white content section)
    const bgOpacity = useTransform(scrollY, [600, 1000], [0, 1]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToProcess = () => {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-black text-deep-forest font-sans selection:bg-frequency-blue/30 overflow-x-hidden">
            <FontStyles />

            {/* 3D Cinematic Background (Handles intro + field) */}
            <div onClick={handleStartExperience} className="absolute inset-0 z-0 cursor-pointer" title="Click to start the experience">
                <CinematicIntro onScrollRequest={scrollToProcess} getAudioData={getAudioData} />
            </div>

    <motion.div
        style={{ opacity: bgOpacity }}
        className="fixed inset-0 z-[-1]"
    >
        <div className="absolute inset-0 bg-black/60 z-10" /> {/* Dark overlay for "deep dark nature" */}
        <Image
            src="/forest-bg.jpg"
            alt="Forest Background"
            fill
            className="object-cover opacity-80"
            priority
        />
    </motion.div>

            {/* White Background Layer for Content (Fades in) - REDUCED OPACITY TO SHOW FOREST */}
            <motion.div
                style={{ opacity: bgOpacity }}
                className="fixed inset-0 z-[-1] bg-gradient-to-b from-black via-black/80 to-deep-forest/90 pointer-events-none mix-blend-multiply"
            />


            {/* Navigation (Floating) */}
            <nav className={clsx(
                "fixed top-0 left-0 w-full z-50 transition-all duration-500 flex justify-between items-center px-6 md:px-12 py-6",
                scrolled ? "bg-black/50 backdrop-blur-md border-b border-white/10 py-4 text-white" : "bg-transparent text-white"
            )}>
                <Link href="/" className="hover:text-mycelium-gold transition-colors duration-300">
                    <Menu className="w-6 h-6" />
                </Link>

                {/* Center Title (Only visible after intro scroll) */}
                <div className={clsx("absolute left-1/2 -translate-x-1/2 transition-opacity duration-700", scrolled ? "opacity-100" : "opacity-0")}>
                    <span className="font-cinzel text-lg tracking-[0.2em] font-bold">FREQUENCY</span>
                </div>

                <div className="flex gap-8 items-center">
                    <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors" />
                </div>
            </nav>

            {/* Section 1: Cinematic Intro Spacer & Title Reveal */}
            <section className="relative h-[150vh] w-full pointer-events-none">
                {/* Sticky Container for the Titles */}
                <div className="sticky top-0 h-screen w-full flex items-center justify-center">
                    {/* The Frequency Title (Reveals on scroll) */}
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        whileInView={{ opacity: 1, scale: 1, y: 0 }}
                        viewport={{ margin: "-20% 0px -20% 0px" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="text-[8vw] md:text-[10vw] font-cinzel font-bold text-white tracking-widest mix-blend-overlay z-10 text-center leading-none"
                    >
                        FREQUENCY
                    </motion.h1>
                </div>

                {/* Scroll Indicator (Fades out) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3, duration: 1 }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
                >
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-cinzel">Begin the Ritual</span>
                    <ChevronDown className="w-4 h-4 text-white/30 animate-bounce" />
                </motion.div>
            </section>

            {/* Section 2: The Sonic Infusion (Process) */}
            <motion.section
                style={{ opacity: bgOpacity }}
                className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/20 backdrop-blur-sm"
            >
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-8 tracking-wide">The Sonic Infusion</h2>
                    <p className="font-playfair text-xl md:text-3xl text-white/80 leading-relaxed italic mb-12">
                        &quot;The Mushrooms don’t Work for Us. We Work for Them.&quot;
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

            {/* 5. Product Section (White Context) */}
            <section className="relative z-10 w-full min-h-screen">
                <div className="md:grid md:grid-cols-2 min-h-screen">
                    {/* Left: Product Visual */}
                    <div className="sticky top-0 h-screen hidden md:flex items-center justify-center">
                        <ProductBottle />
                    </div>

                    {/* Left: Mobile Visual */}
                    <div className="md:hidden py-12 bg-clinical-white">
                        <ProductBottle />
                    </div>

                    {/* Right: Pitch & Purchase */}
                    <div className="px-6 py-24 md:py-32 md:px-16 flex flex-col justify-center max-w-2xl mx-auto bg-clinical-white/0 backdrop-blur-sm md:backdrop-blur-none">
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
                                    <li><strong>Active:</strong> Lion’s Mane (fruiting body), Reishi (fruiting body), Cordyceps (fruiting body)</li>
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
        </div>
    );
}
