import Link from "next/link";
import { ArrowRight, FlaskConical, Sprout, Wind, Waves, Disc, Sparkles, Zap, Activity, Crown, Atom } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1A2F23] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF37] rounded-full blur-[120px]" />
      </div>

      <header className="z-10 mb-16 text-center">
        <h1 className="text-6xl md:text-8xl font-serif font-light mb-4 tracking-tight">
          Frequency<span className="text-mycelium-gold">.</span>
        </h1>
        <p className="text-lg text-deep-forest/60 max-w-md mx-auto font-sans tracking-wide">
          Design Laboratory & Interface Experiments
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10 w-full max-w-7xl">
        {/* Version 1 */}
        <Link href="/v1" className="group">
          <div className="bg-white border border-soft-clay p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-deep-forest hover:shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-deep-forest/20 px-2 py-1 rounded-full text-deep-forest/60">V.001</span>
              <FlaskConical className="w-6 h-6 text-deep-forest/40 group-hover:text-deep-forest transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 group-hover:translate-x-2 transition-transform duration-300">The Clinical Naturalist</h3>
              <p className="text-deep-forest/60 text-sm leading-relaxed">
                High-fidelity clinical aesthetics met with organic warmth.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 2 */}
        <Link href="/v2" className="group">
          <div className="bg-[#1A2F23] border border-deep-forest p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:shadow-mycelium-gold/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.002</span>
              <Sprout className="w-6 h-6 text-white/40 group-hover:text-mycelium-gold transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Cymatics Scroll</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Scrollytelling journey from void to vibration to growth.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 3 */}
        <Link href="/v3" className="group">
          <div className="bg-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.003</span>
              <Waves className="w-6 h-6 text-cyan-400/40 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Interactive Field</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Canvas-based audio reactivity. Speak to the void.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 4 */}
        <Link href="/v4" className="group">
          <div className="bg-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-mycelium-gold/50 hover:shadow-2xl hover:shadow-mycelium-gold/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.004</span>
              <Disc className="w-6 h-6 text-mycelium-gold/40 group-hover:text-mycelium-gold transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">The Womb (WebGL)</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                High-end shader morphing. Linear void to organic sphere.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 5 */}
        <Link href="/v5" className="group">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="flex justify-between items-start relative z-10">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.005</span>
              <Sparkles className="w-6 h-6 text-purple-400/40 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Refined Field</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Refined V4 with boosted audio reactivity and fixed layering.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 6 */}
        <Link href="/v6" className="group">
          <div className="bg-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.006</span>
              <Disc className="w-6 h-6 text-blue-400/40 group-hover:text-blue-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Glass Resonance</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                High-density lines (4x), 3D Glass Text, and volumetric shaders.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 7 */}
        <Link href="/v7" className="group">
          <div className="bg-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.007</span>
              <Zap className="w-6 h-6 text-orange-400/40 group-hover:text-orange-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Spring Physics</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Elasticity, overshoot, and organic reaction to sound. The &quot;Cool Factor&quot;.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 8 */}
        <Link href="/v8" className="group">
          <div className="bg-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-white/50 hover:shadow-2xl hover:shadow-white/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.008</span>
              <Wind className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Fluid Hairlines</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Enhanced V4. Higher density, single-pixel lines, and no-freeze fluid ripple physics.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 10 */}
        <Link href="/v10" className="group">
          <div className="bg-black border border-white/10 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/20 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-mono border border-white/20 px-2 py-1 rounded-full text-white/60">V.010</span>
              <Activity className="w-6 h-6 text-cyan-400/40 group-hover:text-cyan-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-2xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">God Is Frequency</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Cymatics Engine: Genesis, Revelation, Ascension. 432Hz - 963Hz.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white opacity-60 group-hover:opacity-100 transition-opacity">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        {/* Version 11 */}
        <Link href="/v11" className="group md:col-span-2 lg:col-span-3">
          <div className="bg-gradient-to-r from-deep-forest to-black border border-mycelium-gold/30 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-mycelium-gold hover:shadow-2xl hover:shadow-mycelium-gold/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="flex justify-between items-start relative z-10">
              <span className="text-xs font-mono border border-mycelium-gold/40 px-2 py-1 rounded-full text-mycelium-gold">V.011 • RECOMMENDATION</span>
              <Crown className="w-6 h-6 text-mycelium-gold group-hover:text-white transition-colors" />
            </div>
            <div className="relative z-10 max-w-xl">
              <h3 className="text-3xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">Cymatic Luxury (Hybrid)</h3>
              <p className="text-white/80 text-base leading-relaxed">
                The strategic synthesis of Spirit (V10) and Science (V1). A cinematic, scroll-based journey from the frequency chamber to the product. <strong className="text-white">This is the winning candidate.</strong>
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white opacity-80 group-hover:opacity-100 transition-opacity">
              View Recommendation <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
        {/* Version 12 */}
        <Link href="/v12" className="group md:col-span-2 lg:col-span-3">
          <div className="bg-gradient-to-r from-black via-[#0a000f] to-black border border-purple-500/30 p-8 h-80 flex flex-col justify-between transition-all duration-500 hover:border-purple-400 hover:shadow-2xl hover:shadow-purple-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-orange-500/5" />
            <div className="flex justify-between items-start relative z-10">
              <span className="text-xs font-mono border border-purple-400/40 px-2 py-1 rounded-full text-purple-300">V.012 • THE CONVERGENCE</span>
              <Atom className="w-6 h-6 text-purple-400 group-hover:text-white transition-colors" />
            </div>
            <div className="relative z-10 max-w-xl">
              <h3 className="text-3xl font-serif mb-2 text-white group-hover:translate-x-2 transition-transform duration-300">The Convergence</h3>
              <p className="text-white/80 text-base leading-relaxed">
                Cinematic cymatics engine — text morphing, Chladni fields, audio-reactive particles. <strong className="text-purple-300">The full ritual.</strong>
              </p>
            </div>
            <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white opacity-80 group-hover:opacity-100 transition-opacity">
              Enter the Field <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </div>

      <footer className="mt-16 text-xs text-deep-forest/30 font-mono">
        SYSTEM STATUS: ONLINE // NEXT.JS 16 // TAILWIND 4
      </footer>
    </div>
  );
}