"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Waves, Disc, Sprout } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import clsx from 'clsx';
import Link from 'next/link';

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

// --- V10 Engine: God Is Frequency (Integrated into V11) ---

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

const vertexShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uVoice;
  uniform float uVolume;
  uniform float uScroll;
  uniform int uShapeFn;
  uniform float uParticleSize;
  uniform float uComplexity;
  uniform float uDisplacementStr;
  uniform float uSpeed;
  
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
    
    float t = uTime * uSpeed;

    // --- Shape Logic ---
    if (uShapeFn == 0) { // Genesis
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

    displacement *= uDisplacementStr;

    vec3 newPos = position;
    newPos.z += displacement;
    
    // Scroll Transition
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
    
    // Fade based on scroll (v11 behavior)
    float scrollFade = 1.0 - smoothstep(0.0, 0.8, uScroll);
    alpha *= scrollFade;
    
    float glow = 1.0 + uVoice * 1.5; 
    float lineGlow = mix(1.8, 1.0, uScroll);
    
    gl_FragColor = vec4(color * glow * lineGlow, alpha * 0.8);
  }
`;

const CymaticsHero = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 999, y: 999 });

    // Engine Params (Hardcoded for V11 Hero)
    const params = {
        bassGain: 0.6,
        voiceGain: 1.2,
        volGain: 0.5,
        particleSize: 0.7,
        complexity: 1.0,
        speed: 0.8,
        displacementStr: 1.2
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 2 - 1;
            const y = -(e.clientY / window.innerHeight) * 2 + 1;
            setMousePos({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 5.0); // V10 Position

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const geometry = new THREE.PlaneGeometry(8, 8, 350, 350); // V10 High Res
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBass: { value: 0 },
                uVoice: { value: 0 },
                uVolume: { value: 0 },
                uScroll: { value: 0 },
                uShapeFn: { value: MODES.genesis.shapeFn },
                uParticleSize: { value: params.particleSize },
                uComplexity: { value: params.complexity },
                uSpeed: { value: params.speed },
                uDisplacementStr: { value: params.displacementStr },
                uColor1: { value: MODES.genesis.color1 },
                uColor2: { value: MODES.genesis.color2 },
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

        let animationId: number;
        const animate = (time: number) => {
            const t = time * 0.001;
            material.uniforms.uTime.value = t;

            // Simulate Breathing/Voice
            material.uniforms.uVoice.value = Math.sin(t * 1.5) * 0.1 + 0.1;
            material.uniforms.uVolume.value = Math.cos(t) * 0.1 + 0.2;

            // Sync with Scroll
            const normScroll = Math.min(window.scrollY / window.innerHeight, 1.0);
            material.uniforms.uScroll.value = normScroll;

            // Parallax Camera
            camera.rotation.x = normScroll * -0.4;
            camera.position.z = 5.0 + normScroll * 2.5; 

            renderer.render(scene, camera);
            animationId = requestAnimationFrame(animate);
        };
        animate(0);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            renderer.dispose();
            if (container) container.innerHTML = '';
        }
    }, [mousePos]); 

    return (
        <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none" />
    );
};

// --- V1 Components (Updated) ---

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
    )
}

const Accordion = ({ title, children }: { title: string, children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-deep-forest/10 py-4">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
                <span className="font-sans font-medium text-sm text-deep-forest/80 group-hover:text-deep-forest transition-colors">{title}</span>
                <ChevronDown className={`w-4 h-4 text-deep-forest/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-4 pb-2 text-deep-forest/60 text-sm leading-relaxed">{children}</div>
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
            <div className="bg-white border border-soft-clay rounded-lg p-1 shadow-sm">
                <button
                    onClick={() => setSubType('sub')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300",
                        subType === 'sub' ? "bg-clinical-white shadow-sm border border-soft-clay" : "hover:bg-gray-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'sub' ? "border-deep-forest bg-deep-forest" : "border-gray-300")}>
                            {subType === 'sub' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="text-left">
                            <span className="block font-medium text-sm text-deep-forest">Subscribe & Save 15%</span>
                            <span className="block text-xs text-deep-forest/50">Delivered monthly • Cancel anytime</span>
                        </div>
                    </div>
                    <span className="font-serif font-medium text-deep-forest">$98.00</span>
                </button>
                <button
                    onClick={() => setSubType('once')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1",
                        subType === 'once' ? "bg-clinical-white shadow-sm border border-soft-clay" : "hover:bg-gray-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'once' ? "border-deep-forest bg-deep-forest" : "border-gray-300")}>
                            {subType === 'once' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                        <div className="text-left">
                            <span className="block font-medium text-sm text-deep-forest">One-time Purchase</span>
                        </div>
                    </div>
                    <span className="font-serif font-medium text-deep-forest">$115.00</span>
                </button>
            </div>
            <button className="w-full bg-deep-forest text-white py-4 px-6 rounded-full font-medium hover:bg-deep-forest/90 transition-all flex items-center justify-between group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                <span>Add to Cart</span>
                <span className="flex items-center gap-2">
                    {subType === 'sub' ? '$98.00' : '$115.00'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
            </button>
            <p className="text-center text-xs text-deep-forest/40">Free shipping on orders over $100. 30-day money back guarantee.</p>
        </div>
    )
}

// --- Main Page Component ---
export default function V11Page() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);

    // Parallax Transforms
    const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
    const heroY = useTransform(scrollY, [0, 500], [0, 100]);
    const logoScale = useTransform(scrollY, [0, 500], [1, 0.8]);
    const bgOpacity = useTransform(scrollY, [400, 800], [0, 1]);

    useEffect(() => {
        const handle = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handle);
        return () => window.removeEventListener('scroll', handle);
    }, []);

    return (
        <div className="min-h-[200vh] font-sans selection:bg-mycelium-gold/30">
            <FontStyles />

            {/* 1. Background Layer: Transitions from Black (Hero) to Clinical White (Content) */}
            <div className="fixed inset-0 z-[-1] bg-black" />
            <motion.div
                style={{ opacity: bgOpacity }}
                className="fixed inset-0 z-[-1] bg-clinical-white pointer-events-none"
            />

            {/* 2. Cymatics Engine (Fixed) */}
            <CymaticsHero />

            {/* 3. Navigation (Adaptive) */}
            <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-black/5 py-4' : ''}`}>
                <div className="flex items-center gap-4">
                    <Link href="/" className="group">
                        <Menu className={`w-5 h-5 transition-colors ${scrolled ? 'text-deep-forest' : 'text-white'}`} />
                    </Link>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <motion.div style={{ scale: logoScale }}>
                        <h1 className={`font-cinzel text-xl tracking-[0.2em] font-semibold transition-colors duration-500 ${scrolled ? 'text-deep-forest' : 'text-white'}`}>
                            FREQUENCY
                        </h1>
                    </motion.div>
                </div>
                <div className="flex items-center gap-4">
                    <ShoppingBag className={`w-5 h-5 transition-colors ${scrolled ? 'text-deep-forest' : 'text-white'}`} />
                </div>
            </header>

            {/* 4. Hero Section (Scrollable) */}
            <section className="h-screen w-full flex items-center justify-center relative pointer-events-none">
                <motion.div style={{ opacity: heroOpacity, y: heroY }} className="text-center z-10 px-4">
                    <span className="block font-cinzel text-xs md:text-sm tracking-[0.4em] text-white/50 mb-6 uppercase">
                        Grown with Intention • Powered by Frequencies
                    </span>
                    <h1 className="font-playfair italic text-6xl md:text-9xl text-white mb-8 metal-text">
                        Resonance
                    </h1>
                    <div className="w-px h-24 bg-gradient-to-b from-white/0 via-white/50 to-white/0 mx-auto" />
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    style={{ opacity: heroOpacity }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-cinzel">Discover The Process</span>
                    <ChevronDown className="w-4 h-4 text-white/30 animate-bounce" />
                </motion.div>
            </section>

            {/* 4.5. The Process (Transition Section) */}
            <motion.section
                style={{ opacity: bgOpacity }}
                className="relative z-10 w-full min-h-[50vh] flex items-center justify-center py-24 bg-clinical-white/5 backdrop-blur-sm"
            >
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="font-cinzel text-2xl md:text-3xl text-deep-forest mb-8 tracking-wide">The Sonic Infusion</h2>
                    <p className="font-playfair text-xl md:text-3xl text-deep-forest/80 leading-relaxed italic mb-12">
                        &quot;The Mushrooms don’t Work for Us. We Work for Them.&quot;
                    </p>
                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <div className="space-y-3">
                            <Waves className="w-8 h-8 text-mycelium-gold" />
                            <h3 className="font-serif text-lg text-deep-forest">Grown as Medicine</h3>
                            <p className="text-sm text-deep-forest/60 leading-relaxed">Fungi are sentient beings. We treat them with reverence, growing them in clean, high-vibration spaces.</p>
                        </div>
                        <div className="space-y-3">
                            <Disc className="w-8 h-8 text-mycelium-gold" />
                            <h3 className="font-serif text-lg text-deep-forest">432Hz Infusion</h3>
                            <p className="text-sm text-deep-forest/60 leading-relaxed">Every stage of cultivation is immersed in Solfeggio tones, chants, and nature sounds to harmonize the biological structure.</p>
                        </div>
                        <div className="space-y-3">
                            <Sprout className="w-8 h-8 text-mycelium-gold" />
                            <h3 className="font-serif text-lg text-deep-forest">Nature & Nurture</h3>
                            <p className="text-sm text-deep-forest/60 leading-relaxed">&quot;Same genetics, different frequency = different outcome.&quot; We refine unique strains through our in-house cultivation.</p>
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
                            <span className="text-deep-forest/60 border-b border-deep-forest/20 pb-0.5">142 Reviews</span>
                        </div>

                        <h2 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.1] text-deep-forest">
                            Calm Dose<span className="text-mycelium-gold">.</span>
                        </h2>

                        <p className="text-lg text-deep-forest/70 leading-relaxed mb-6 font-light">
                            A wellness supplement formulated with functional mushroom fruiting bodies to support everyday calm and balance.
                        </p>
                        <p className="text-sm text-deep-forest/50 leading-relaxed mb-10 font-mono">
                            Grown in a 432Hz sound chamber. This is not just a supplement—it is biological resonance.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {["Anxiety Relief", "Mental Clarity", "Sleep Support", "100% Organic"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-deep-forest/80">
                                    <div className="w-5 h-5 rounded-full bg-[#E6F5EC] flex items-center justify-center text-[#009E60]">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-deep-forest/10 mb-8">
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
