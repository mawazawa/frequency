"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, Volume2, Droplets, Wind, Zap, Hexagon, Circle, Triangle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// --- Components ---

const CymaticCircle = ({ index, progress }: { index: number, progress: any }) => {
    const pathLength = useTransform(progress, [0, 1], [0, 1]);
    const opacity = useTransform(progress, [0, 0.5, 1], [0.1, 0.5, 0]);
    
    return (
        <motion.circle 
            cx="50" cy="50" 
            r={10 + index * 5} 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.2"
            style={{ 
                pathLength,
                opacity
            }} 
        />
    )
}

const CymaticPattern = ({ progress }: { progress: any }) => {
    // Simulating Chladni figures/Cymatics with SVG overlays that rotate/scale based on scroll
    const rotate = useTransform(progress, [0, 1], [0, 180]);
    const scale = useTransform(progress, [0, 0.5, 1], [0.5, 1.2, 0.8]);
    const opacity = useTransform(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    
    // Rotate transform for the rect inside motion.g
    const rectRotate = useTransform(progress, [0, 1], [0, -90]);
    
    // Rotate transform for the second layer
    const secondLayerRotate = useTransform(progress, [0, 1], [45, -45]);
    
    return (
        <motion.div 
            style={{ opacity, scale }}
            className="fixed inset-0 pointer-events-none flex items-center justify-center z-10 mix-blend-screen"
        >
             <svg width="800" height="800" viewBox="0 0 100 100" className="opacity-50 text-cyan-400">
                {/* Complex geometric patterns representing sound waves */}
                {[...Array(6)].map((_, i) => (
                    <CymaticCircle key={i} index={i} progress={progress} />
                ))}
                
                <motion.g style={{ rotate }}>
                     {[...Array(12)].map((_, i) => (
                         <line 
                            key={`l-${i}`}
                            x1="50" y1="50" 
                            x2={50 + 40 * Math.cos(i * 30 * Math.PI / 180)} 
                            y2={50 + 40 * Math.sin(i * 30 * Math.PI / 180)} 
                            stroke="currentColor" 
                            strokeWidth="0.1" 
                         />
                     ))}
                     <motion.rect 
                        x="30" y="30" width="40" height="40" 
                        fill="none" stroke="currentColor" strokeWidth="0.2"
                        style={{ rotate: rectRotate }}
                     />
                </motion.g>
             </svg>
             
             {/* Second Layer - Gold */}
             <motion.div 
                style={{ rotate: secondLayerRotate }}
                className="absolute inset-0 flex items-center justify-center text-mycelium-gold opacity-30"
             >
                  <svg width="600" height="600" viewBox="0 0 100 100">
                      <polygon points="50,10 90,90 10,90" fill="none" stroke="currentColor" strokeWidth="0.2" />
                      <polygon points="50,90 90,10 10,10" fill="none" stroke="currentColor" strokeWidth="0.2" />
                  </svg>
             </motion.div>
        </motion.div>
    );
}

const AudioVisualizer = () => {
    return (
        <div className="flex items-center gap-1 h-8">
             {[...Array(8)].map((_, i) => (
                 <motion.div 
                    key={i}
                    animate={{ height: ["20%", "100%", "20%"] }}
                    transition={{ 
                        duration: 0.8, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: i * 0.1 
                    }}
                    className="w-1 bg-cyan-400/50 rounded-full"
                 />
             ))}
        </div>
    )
}

const FrequencyNav = () => {
    const frequencies = [
        { label: "Ground", hz: "396 Hz", icon: Hexagon, desc: "Release Fear" },
        { label: "Create", hz: "417 Hz", icon: Droplets, desc: "Facilitate Change" },
        { label: "Transform", hz: "528 Hz", icon: Triangle, desc: "DNA Repair" },
        { label: "Connect", hz: "639 Hz", icon: Circle, desc: "Relationships" },
        { label: "Express", hz: "741 Hz", icon: Wind, desc: "Intuition" },
        { label: "Awaken", hz: "852 Hz", icon: Zap, desc: "Spiritual Order" },
    ];

    const [active, setActive] = useState(2); // Default to Transform

    return (
        <div className="py-24 px-6 max-w-7xl mx-auto">
            <h3 className="text-center font-serif text-3xl text-white/40 mb-16">Find Your Frequency</h3>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                {/* Circular Nav */}
                <div className="relative w-96 h-96 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_60s_linear_infinite]" />
                    <div className="absolute inset-8 rounded-full border border-white/5 animate-[spin_40s_linear_infinite_reverse]" />
                    
                    {frequencies.map((f, i) => {
                        const angle = (i / frequencies.length) * 2 * Math.PI - Math.PI / 2;
                        const radius = 160; // Distance from center
                        const x = Math.cos(angle) * radius + 192 - 24; // Center x + offset
                        const y = Math.sin(angle) * radius + 192 - 24; // Center y + offset
                        
                        return (
                            <button
                                key={i}
                                onClick={() => setActive(i)}
                                className={clsx(
                                    "absolute w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-500 backdrop-blur-sm z-20",
                                    active === i 
                                        ? "bg-cyan-900/50 border-cyan-400 text-cyan-400 scale-125 shadow-[0_0_30px_rgba(34,211,238,0.3)]" 
                                        : "bg-black/40 border-white/10 text-white/40 hover:border-white/30 hover:text-white"
                                )}
                                style={{ left: x, top: y }}
                            >
                                <f.icon className="w-5 h-5" />
                            </button>
                        );
                    })}
                    
                    {/* Center Active Display */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <motion.div 
                            key={active}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <div className="text-6xl font-serif text-white mb-2">{frequencies[active].hz}</div>
                            <div className="text-cyan-400 uppercase tracking-widest text-sm font-medium">{frequencies[active].label}</div>
                        </motion.div>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="max-w-md text-left">
                     <motion.div
                        key={active}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                     >
                        <h4 className="text-4xl font-serif text-white mb-4">{frequencies[active].desc}</h4>
                        <p className="text-white/60 leading-relaxed mb-8">
                            This frequency resonates with the cellular structure of our <span className="text-cyan-400">{frequencies[active].label}</span> blend. 
                            Cultivated for 8 weeks in our acoustic chamber to imprint harmonic stability into the mycelial network.
                        </p>
                        
                        <div className="flex gap-4">
                            <button className="bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-cyan-400 hover:text-black transition-colors">
                                Shop {frequencies[active].label} Blend
                            </button>
                            <button className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:border-cyan-400 hover:text-cyan-400 transition-colors text-white/60">
                                <Volume2 className="w-5 h-5" />
                            </button>
                        </div>
                     </motion.div>
                </div>
            </div>
        </div>
    )
}

export default function V2Page() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Intro Opacity: Fades out as we scroll deep
    const introOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const introScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);

    // Cymatics Phase: 0.15 -> 0.45
    const cymaticsOpacity = useTransform(scrollYProgress, [0.1, 0.2, 0.4, 0.5], [0, 1, 1, 0]);

    // Soil/Growth Phase: 0.45 -> 0.75
    const growthOpacity = useTransform(scrollYProgress, [0.45, 0.5, 0.7, 0.8], [0, 1, 1, 0]);
    
    // Reveal Phase: 0.8 -> 1.0
    const revealOpacity = useTransform(scrollYProgress, [0.75, 0.85], [0, 1]);
    const revealScale = useTransform(scrollYProgress, [0.75, 1], [0.9, 1]);

    return (
        <div ref={containerRef} className="bg-[#0A0806] min-h-[400vh] relative font-sans text-white selection:bg-cyan-500/30">
            
            {/* Fixed Canvas / Visual Layer */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Background Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                
                {/* Cymatics Visualization */}
                <CymaticPattern progress={scrollYProgress} />
            </div>

            {/* --- Section 1: The Void (Static Start) --- */}
            <section className="h-screen sticky top-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                <motion.div style={{ opacity: introOpacity, scale: introScale }} className="text-center px-4">
                     <div className="mb-8 opacity-50 tracking-[0.5em] text-xs uppercase text-cyan-200">
                         Est. 2026 • Topanga Canyon
                     </div>
                     <h1 className="text-6xl md:text-8xl font-serif font-light text-white mb-6">
                         Silence is<br />
                         <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/20">Frequency</span>.
                     </h1>
                     <div className="flex justify-center mt-12 animate-pulse">
                         <div className="w-px h-24 bg-gradient-to-b from-cyan-400 to-transparent" />
                     </div>
                </motion.div>
            </section>

            {/* --- Section 2: Vibration (Scroll Triggered) --- */}
            <div className="h-screen" /> {/* Spacer for scroll */}
            
            <section className="h-screen sticky top-0 flex items-center justify-center z-20 pointer-events-none">
                <motion.div style={{ opacity: cymaticsOpacity }} className="text-center max-w-2xl px-6 backdrop-blur-sm bg-black/10 p-8 rounded-2xl border border-white/5">
                    <AudioVisualizer />
                    <h2 className="text-4xl md:text-5xl font-serif mt-6 mb-4">In the beginning, there was sound.</h2>
                    <p className="text-lg text-white/70 font-light leading-relaxed">
                        We don't just grow mushrooms. We cultivate vibration. 
                        Every strain is exposed to 432Hz acoustic waves during colonization, 
                        imprinting harmonic stability into the cellular structure.
                    </p>
                </motion.div>
            </section>

            <div className="h-screen" /> {/* Spacer */}

            {/* --- Section 3: Alignment / Growth --- */}
            <section className="h-screen sticky top-0 flex items-center justify-center z-20 pointer-events-none">
                <motion.div style={{ opacity: growthOpacity }} className="flex flex-col items-center">
                    {/* Simulated Growth via CSS */}
                    <div className="relative w-64 h-80 mb-8">
                        {/* Stalk */}
                        <motion.div 
                            style={{ height: useTransform(scrollYProgress, [0.5, 0.7], ["0%", "100%"]) }}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 bg-gradient-to-t from-[#5c4033] to-[#E8DCC4] rounded-t-lg origin-bottom"
                        />
                        {/* Cap */}
                        <motion.div 
                            style={{ 
                                scale: useTransform(scrollYProgress, [0.6, 0.75], [0, 1]),
                                opacity: useTransform(scrollYProgress, [0.6, 0.65], [0, 1])
                            }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-gradient-to-b from-amber-700 to-amber-900 rounded-[50%_50%_20%_20%] shadow-[0_0_50px_rgba(184,134,11,0.3)] border-t border-white/10"
                        >
                            {/* Spores/Gills */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-1 bg-black/20 blur-sm" />
                        </motion.div>
                    </div>
                    
                    <h2 className="text-3xl font-serif text-[#E8DCC4]">Alignment.</h2>
                    <p className="text-sm text-[#A39E94] mt-2 tracking-widest uppercase">Sacred Geometry in Matter</p>
                </motion.div>
            </section>

            <div className="h-screen" /> {/* Spacer */}

            {/* --- Section 4: The Truth (Final Reveal) --- */}
            <section className="min-h-screen bg-[#0A0806] relative z-30 border-t border-white/10">
                <motion.div 
                    style={{ opacity: revealOpacity, scale: revealScale }}
                    className="pt-32 pb-20 px-6 text-center"
                >
                    <div className="inline-block mb-12">
                        <h2 className="text-[10vw] md:text-[8vw] leading-none font-serif text-mycelium-gold drop-shadow-[0_0_15px_rgba(201,162,39,0.3)]">
                            God is<br />Frequency.
                        </h2>
                        <div className="h-1 w-full bg-gradient-to-r from-transparent via-mycelium-gold to-transparent mt-4 opacity-50" />
                    </div>

                    <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-16 font-light">
                        Witness the intersection of ancient botany and modern acoustics.
                        <br/>This isn't marketing. It's physics made visible.
                    </p>

                    <Link href="/v2/shop" className="inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-medium text-lg hover:bg-cyan-400 transition-colors duration-300">
                        Enter the Chamber <ArrowRight className="w-5 h-5" />
                    </Link>
                </motion.div>

                {/* Find Your Frequency Module */}
                <div className="bg-[#111] py-12 border-t border-white/5">
                    <FrequencyNav />
                </div>

                {/* Footer */}
                <footer className="py-24 px-8 text-center text-white/20 text-xs font-mono uppercase tracking-widest border-t border-white/5">
                    FrequencyCaps © 2026 • Cultivated at 432Hz
                </footer>
            </section>

            <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Back to Menu
            </Link>
        </div>
    );
}
