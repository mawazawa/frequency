"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Star, Play, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useRef, useMemo } from "react";

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function V1Landing() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  // Generate stable random values for animation
  const randomDurations = useMemo(() => {
    return Array.from({ length: 20 }, () => 1 + Math.random());
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-clinical-white font-sans text-deep-forest selection:bg-mycelium-gold/20">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center mix-blend-difference text-deep-forest md:text-white transition-colors duration-500">
        <div className="font-serif text-2xl tracking-tight">FREQUENCY.</div>
        <div className="hidden md:flex gap-8 text-sm font-medium tracking-widest uppercase">
            <Link href="#" className="hover:text-mycelium-gold transition-colors">Shop</Link>
            <Link href="#" className="hover:text-mycelium-gold transition-colors">Science</Link>
            <Link href="#" className="hover:text-mycelium-gold transition-colors">Rituals</Link>
        </div>
        <Link href="/v1" className="text-sm font-medium border-b border-current pb-1 hover:text-mycelium-gold transition-colors">
            Account
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Hero Background - Abstract organic shape representation */}
        <motion.div 
            style={{ scale: heroScale, opacity: heroOpacity }}
            className="absolute inset-0 bg-[#1A2F23] z-0"
        >
             <div className="absolute inset-0 opacity-40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
             {/* This would be a high-res video or image in prod */}
             <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        </motion.div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
            <FadeIn>
                <div className="mb-6 flex justify-center">
                    <span className="px-3 py-1 border border-white/30 rounded-full text-xs tracking-[0.2em] uppercase backdrop-blur-sm">
                        The Clinical Naturalist
                    </span>
                </div>
            </FadeIn>
            
            <FadeIn delay={0.2}>
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif font-light mb-8 leading-[0.9] tracking-tight">
                    Nature,<br/>Amplified.
                </h1>
            </FadeIn>

            <FadeIn delay={0.4}>
                <p className="text-lg md:text-xl text-white/80 max-w-lg mx-auto mb-12 font-light leading-relaxed">
                    Organic psilocybin grown in 432Hz acoustic chambers. 
                    The ancient wisdom of fungi, refined by the precision of frequency.
                </p>
            </FadeIn>

            <FadeIn delay={0.6}>
                <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                    <Link href="/v1" className="bg-white text-deep-forest px-8 py-4 rounded-full font-medium hover:bg-soft-clay transition-colors min-w-[200px]">
                        Shop Collection
                    </Link>
                    <button className="flex items-center gap-3 text-white hover:text-mycelium-gold transition-colors group">
                        <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center group-hover:border-mycelium-gold transition-colors">
                            <Play className="w-4 h-4 fill-current ml-1" />
                        </div>
                        <span className="text-sm font-medium tracking-wide">Watch the Film</span>
                    </button>
                </div>
            </FadeIn>
        </div>

        <motion.div 
            style={{ opacity: heroOpacity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce"
        >
            <ArrowDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* Product Gird */}
      <section className="py-32 px-6 md:px-12 bg-clinical-white">
        <div className="max-w-7xl mx-auto">
            <FadeIn>
                <div className="flex justify-between items-end mb-16 border-b border-deep-forest/10 pb-8">
                    <h2 className="text-4xl md:text-5xl font-serif text-deep-forest">
                        Curated Frequencies
                    </h2>
                    <Link href="/v1" className="hidden md:flex items-center gap-2 text-deep-forest font-medium hover:text-mycelium-gold transition-colors">
                        View All <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
                {[
                    { name: "Calm", subtitle: "Anxiety & Stress", color: "#E6F5EC", price: "$49" },
                    { name: "Focus", subtitle: "Cognition & Flow", color: "#F0E6F5", price: "$49" },
                    { name: "Sleep", subtitle: "Rest & Restore", color: "#E6EDF5", price: "$49" }
                ].map((product, i) => (
                    <FadeIn key={i} delay={i * 0.2}>
                        <Link href="/v1" className="group block">
                            <div className="bg-[#F4F4F0] aspect-[4/5] mb-6 relative overflow-hidden rounded-lg">
                                {/* Placeholder Bottle Art */}
                                <div className="absolute inset-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-700 ease-out">
                                    <div className="w-48 h-64 rounded-t-[40px] rounded-b-[20px] shadow-2xl relative border border-white/40 backdrop-blur-sm"
                                         style={{ background: `linear-gradient(to bottom, #2a2a2a, #1a1a1a)` }}>
                                         <div className="absolute top-12 left-0 right-0 text-center">
                                             <div className="text-[10px] text-white/40 tracking-[0.3em] mb-2 uppercase">Frequency</div>
                                             <div className="font-serif text-2xl text-mycelium-gold">{product.name}</div>
                                         </div>
                                    </div>
                                    {/* Shadow */}
                                    <div className="absolute bottom-12 w-32 h-4 bg-black/20 blur-xl" />
                                </div>
                                
                                {/* Hover Add */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                    <button className="w-full bg-deep-forest text-white py-3 rounded-full text-sm font-medium shadow-lg hover:bg-deep-forest/90">
                                        Quick Add — {product.price}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-serif text-deep-forest mb-1">{product.name}</h3>
                                    <p className="text-deep-forest/50 text-sm">{product.subtitle}</p>
                                </div>
                                <div className="flex gap-0.5 text-mycelium-gold text-[10px]">
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                    <Star className="w-3 h-3 fill-current" />
                                </div>
                            </div>
                        </Link>
                    </FadeIn>
                ))}
            </div>
        </div>
      </section>

      {/* The Science / Story */}
      <section className="py-32 bg-[#1A2F23] text-clinical-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                  <FadeIn>
                      <h2 className="text-5xl md:text-7xl font-serif mb-8 leading-none">
                          The 432Hz<br/><span className="text-mycelium-gold italic">Difference.</span>
                      </h2>
                  </FadeIn>
                  <FadeIn delay={0.2}>
                      <div className="space-y-6 text-lg text-white/70 font-light leading-relaxed">
                          <p>
                              Most mushrooms are grown in silence. Ours are born in a symphony.
                          </p>
                          <p>
                              We cultivate our Mycelium in custom-built acoustic chambers resonating at 432Hz—the &quot;Miracle Tone&quot; of nature. We believe this sonic environment encourages a more structurally stable and potent fruiting body.
                          </p>
                          <div className="pt-8">
                              <button className="border-b border-mycelium-gold text-mycelium-gold pb-1 hover:text-white hover:border-white transition-colors">
                                  Read the Research Paper
                              </button>
                          </div>
                      </div>
                  </FadeIn>
              </div>

              <FadeIn delay={0.4}>
                  <div className="relative aspect-square rounded-full border border-white/10 flex items-center justify-center p-12">
                      <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_10s_linear_infinite]" />
                      <div className="absolute inset-8 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                      
                      {/* Abstract Waveform Visual */}
                      <div className="w-full h-full bg-gradient-to-tr from-deep-forest to-black rounded-full flex items-center justify-center overflow-hidden relative">
                          <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-50">
                               {randomDurations.map((duration, i) => (
                                   <motion.div 
                                      key={i}
                                      animate={{ height: ["20%", "80%", "20%"] }}
                                      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
                                      className="w-2 bg-mycelium-gold/50 rounded-full"
                                   />
                               ))}
                          </div>
                      </div>
                  </div>
              </FadeIn>
          </div>
      </section>

      <footer className="bg-clinical-white py-24 px-6 border-t border-deep-forest/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
              <div>
                  <h3 className="font-serif text-3xl mb-4">Frequency.</h3>
                  <p className="text-deep-forest/50 max-w-xs">
                      The intersection of ancient botany and modern acoustics.
                  </p>
              </div>
              <div className="grid grid-cols-2 gap-12 text-sm">
                  <div className="space-y-4 flex flex-col">
                      <strong className="font-serif text-lg mb-2 block">Shop</strong>
                      <Link href="#" className="text-deep-forest/60 hover:text-deep-forest">Calm</Link>
                      <Link href="#" className="text-deep-forest/60 hover:text-deep-forest">Focus</Link>
                      <Link href="#" className="text-deep-forest/60 hover:text-deep-forest">Sleep</Link>
                  </div>
                  <div className="space-y-4 flex flex-col">
                      <strong className="font-serif text-lg mb-2 block">Company</strong>
                      <Link href="#" className="text-deep-forest/60 hover:text-deep-forest">Our Story</Link>
                      <Link href="#" className="text-deep-forest/60 hover:text-deep-forest">Journal</Link>
                      <Link href="#" className="text-deep-forest/60 hover:text-deep-forest">Contact</Link>
                  </div>
              </div>
          </div>
      </footer>
    </div>
  );
}
