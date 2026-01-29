"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// --- Components ---

/**
 * CymaticLines: A Canvas-based visualization of parallel lines 
 * that react to Audio (Mic) and Mouse interaction.
 */
const CymaticLines = ({ isMicActive, setIsMicActive }: { isMicActive: boolean, setIsMicActive: (v: boolean) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const rafRef = useRef<number | null>(null);

    // Initialize Audio
    const toggleMic = async () => {
        if (!isMicActive) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
                sourceRef.current.connect(analyserRef.current);
                dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
                setIsMicActive(true);
            } catch (err) {
                console.error("Mic Error:", err);
            }
        } else {
            if (audioContextRef.current) audioContextRef.current.close();
            setIsMicActive(false);
        }
    };

    // Canvas Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const animate = () => {
            if (!ctx || !canvas) return;
            
            // Audio Data
            let audioData = 0;
            if (isMicActive && analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
                // Average frequency for simple distortion
                const avg = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
                audioData = avg / 255; // Normalized 0-1
            }

            // Clear with trail effect
            ctx.fillStyle = 'rgba(10, 8, 6, 0.2)'; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Lines
            ctx.lineWidth = 1;
            const gap = 15; // Space between lines
            const rows = Math.ceil(canvas.height / gap);
            const cols = Math.ceil(canvas.width / gap);

            // We'll draw horizontal lines that distort
            for (let i = 0; i < rows; i++) {
                const yBase = i * gap;
                
                // Color grading based on audio intensity
                const baseColor = isMicActive 
                    ? `hsl(${200 + audioData * 100}, 100%, ${50 + audioData * 50}%)` // Cyan to Purple
                    : 'rgba(255, 255, 255, 0.15)'; // Subtle White
                
                ctx.strokeStyle = baseColor;
                ctx.beginPath();
                
                for (let x = 0; x < canvas.width; x += 10) {
                    // Interaction Factors
                    const dx = x - mousePos.x;
                    const dy = yBase - mousePos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const mouseInteraction = Math.max(0, 1 - dist / 300); // 300px radius

                    // Wave Math
                    // 1. Base Sine Wave (Idling)
                    const baseWave = Math.sin(x * 0.01 + time * 0.02 + i * 0.1) * 5;
                    
                    // 2. Audio Wave (High Frequency Jitter)
                    const audioWave = isMicActive ? (Math.random() - 0.5) * audioData * 50 : 0;
                    
                    // 3. Mouse Wave (Push/Pull)
                    const mouseWave = mouseInteraction * 50 * Math.sin(dist * 0.05 - time * 0.1);

                    const y = yBase + baseWave + audioWave + mouseWave;
                    
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            time++;
            rafRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [mousePos, isMicActive]);

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div className="fixed inset-0 z-0" onMouseMove={handleMouseMove}>
            <canvas ref={canvasRef} className="block w-full h-full" />
            
            {/* Controls */}
            <div className="absolute bottom-12 left-12 z-50 flex items-center gap-4">
                <button 
                    onClick={toggleMic}
                    className={clsx(
                        "w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-300 backdrop-blur-md",
                        isMicActive 
                            ? "border-cyan-400 text-cyan-400 bg-cyan-900/20 shadow-[0_0_20px_rgba(34,211,238,0.4)]" 
                            : "border-white/10 text-white/40 hover:border-white/40 hover:text-white"
                    )}
                >
                    {isMicActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <div className="text-xs text-white/30 uppercase tracking-widest font-mono">
                    {isMicActive ? "Mic Input Active • Speak to Materialize" : "Enable Mic for Cymatics"}
                </div>
            </div>
        </div>
    );
};

export default function V3Page() {
    const [isMicActive, setIsMicActive] = useState(false);
    
    // Smooth Scroll setup
    // Note: In a real app we'd use Lenis here, but native sticky positioning works for this layout
    
    return (
        <div className="min-h-[300vh] bg-[#0A0806] text-white selection:bg-cyan-500/30 relative cursor-crosshair">
            
            {/* The Visualizer (Background) */}
            <CymaticLines isMicActive={isMicActive} setIsMicActive={setIsMicActive} />

            {/* --- Hero Section --- */}
            <section className="h-screen sticky top-0 flex flex-col items-center justify-center z-10 pointer-events-none mix-blend-difference">
                <div className="relative text-center w-full max-w-[90vw]">
                    {/* Top Tagline */}
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.5, delay: 0.5 }}
                        className="absolute -top-32 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-white/50" 
                    />
                    
                    <h1 className="text-[12vw] md:text-[14vw] font-serif font-light leading-[0.85] tracking-tight">
                        <motion.span 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                            className="block"
                        >
                            Silence is
                        </motion.span>
                        <motion.span 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="block italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40"
                        >
                            Frequency
                        </motion.span>
                    </h1>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 2 }}
                        className="mt-12 flex justify-center"
                    >
                         <div className="w-px h-32 bg-gradient-to-b from-white to-transparent opacity-50" />
                    </motion.div>
                </div>
            </section>

            {/* --- Content Spacer (Invisible scroll track) --- */}
            <div className="relative z-20 w-full px-6 md:px-24 pt-[100vh] pb-32 pointer-events-none">
                
                {/* Section 2: The Science */}
                <div className="min-h-screen flex items-center justify-end">
                    <div className="max-w-xl text-right mix-blend-screen pointer-events-auto">
                        <h2 className="text-5xl md:text-7xl font-serif mb-8 text-white">432Hz</h2>
                        <p className="text-xl md:text-2xl font-light text-white/80 leading-relaxed">
                            We cultivate our mycelium in a custom acoustic chamber.
                            <br/><br/>
                            Sound isn't just noise—it's structure. By aligning the growing medium with 
                            harmonic resonance, we increase cellular stability and potency.
                        </p>
                    </div>
                </div>

                {/* Section 3: The Reveal */}
                <div className="min-h-screen flex flex-col items-center justify-center text-center pointer-events-auto">
                    <div className="mb-12">
                         <div className="inline-block border border-white/20 rounded-full px-6 py-2 text-xs uppercase tracking-[0.3em] text-mycelium-gold mb-8 backdrop-blur-md">
                             The Truth
                         </div>
                         <h2 className="text-[10vw] font-serif leading-none text-mycelium-gold drop-shadow-2xl">
                             God is<br/>Frequency.
                         </h2>
                    </div>
                    
                    <Link href="/v1" className="group relative inline-flex items-center justify-center px-12 py-6 overflow-hidden rounded-full bg-white text-black transition-transform active:scale-95">
                        <span className="relative z-10 font-medium text-lg tracking-wide group-hover:text-white transition-colors">Enter The Shop</span>
                        <div className="absolute inset-0 bg-deep-forest translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    </Link>
                </div>
            </div>

            {/* Sticky Overlay UI */}
            <div className="fixed top-8 right-8 z-50 flex flex-col items-end gap-2 mix-blend-difference">
                 <div className="text-xs font-mono text-white/60">LAT: 34.0900° N</div>
                 <div className="text-xs font-mono text-white/60">LNG: 118.6000° W</div>
                 <div className="text-xs font-mono text-mycelium-gold mt-2">TOPANGA CANYON</div>
            </div>

            <Link href="/" className="fixed bottom-8 left-8 z-50 text-white/40 hover:text-white transition-colors text-xs uppercase tracking-widest">
                ← Back to Menu
            </Link>
        </div>
    );
}
