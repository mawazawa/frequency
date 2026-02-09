"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export default function V2Page() {
  const containerRef = useRef<HTMLDivElement>(null);
  const act1Ref = useRef<HTMLDivElement>(null);
  const act2Ref = useRef<HTMLDivElement>(null);
  const act1TextRef = useRef<HTMLDivElement>(null);
  const act2TextRef = useRef<HTMLDivElement>(null);
  const act3Ref = useRef<HTMLDivElement>(null);
  const act3TextRef = useRef<HTMLDivElement>(null);
  const act3LogoRef = useRef<HTMLDivElement>(null);
  const act3CtaRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const cymaticsRef = useRef<SVGSVGElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      smooth: true,
      lerp: 0.08,
      wheelMultiplier: 0.9,
      smoothTouch: false,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    lenis.on("scroll", ScrollTrigger.update);

    const ctx = gsap.context(() => {
      if (!act1Ref.current || !act2Ref.current || !act3Ref.current) return;

      gsap.set([act1TextRef.current, act2TextRef.current, act3TextRef.current], { opacity: 0, y: 40 });
      gsap.set([act3LogoRef.current, act3CtaRef.current], { opacity: 0, y: 30 });
      gsap.set(burstRef.current, { opacity: 0, scale: 0.5, filter: "blur(16px)" });
      gsap.set(cymaticsRef.current, { opacity: 0, scale: 0.6, rotate: -15 });
      gsap.set(barsRef.current?.children || [], { scaleY: 0.2, opacity: 0.2, transformOrigin: "bottom" });

      const act3Rings = gsap.utils.toArray<HTMLElement>(".act3-ring");
      const act3Shards = gsap.utils.toArray<HTMLElement>(".act3-shard");
      gsap.set(act3Rings, { opacity: 0, scale: 0.6, transformOrigin: "center" });
      gsap.set(act3Shards, { opacity: 0, y: 40 });

      gsap.timeline({
        scrollTrigger: {
          trigger: act1Ref.current,
          start: "top top",
          end: "+=200%",
          scrub: true,
          pin: true,
        },
      })
        .to(act1TextRef.current, { opacity: 1, y: 0, duration: 0.8 }, 0.2)
        .to(act1TextRef.current, { opacity: 0, y: -60, duration: 0.8 }, 0.75);

      gsap.timeline({
        scrollTrigger: {
          trigger: act2Ref.current,
          start: "top top",
          end: "+=250%",
          scrub: true,
          pin: true,
        },
      })
        .to(act2TextRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.1)
        .to(cymaticsRef.current, { opacity: 1, scale: 1, rotate: 0, duration: 0.8 }, 0.2)
        .to(cymaticsRef.current, { rotate: 180, scale: 1.15, duration: 1.2 }, 0.5)
        .to(barsRef.current?.children || [], { scaleY: 1, opacity: 0.9, duration: 0.6, stagger: 0.05 }, 0.4)
        .to(act2TextRef.current, { opacity: 0, y: -40, duration: 0.6 }, 0.85);

      gsap.timeline({
        scrollTrigger: {
          trigger: act3Ref.current,
          start: "top top",
          end: "+=250%",
          scrub: true,
          pin: true,
        },
      })
        .to(act3TextRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.1)
        .to(burstRef.current, { opacity: 1, scale: 1.15, filter: "blur(0px)", duration: 0.8 }, 0.2)
        .to(act3Rings, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1 }, 0.25)
        .to(act3Rings, { rotate: 180, scale: 1.25, duration: 1.0, stagger: 0.08 }, 0.45)
        .to(act3Shards, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.45)
        .to(act3TextRef.current, { opacity: 0, y: -30, duration: 0.6 }, 0.55)
        .to(act3LogoRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.6)
        .to(act3CtaRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.75);
    }, containerRef);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * window.devicePixelRatio);
      canvas.height = Math.floor(height * window.devicePixelRatio);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.6,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.12,
      alpha: Math.random() * 0.5 + 0.15,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-black text-white min-h-[700vh] overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* ACT I: STILLNESS */}
      <section ref={act1Ref} className="relative h-[200vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <canvas ref={particlesRef} className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-black/70" />
          <div ref={act1TextRef} className="relative z-10 text-center px-6 max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.6em] text-white/40 mb-6">Act I · Stillness</p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight">
              Everything is <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/60 to-white/20">frequency</span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-white/50 max-w-xl mx-auto">
              A deep void. A slow breath. Particles drift with minimal motion — the universe before vibration.
            </p>
          </div>
        </div>
      </section>

      {/* ACT II: VIBRATION */}
      <section ref={act2Ref} className="relative h-[250vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(129,140,248,0.12),_rgba(0,0,0,0.95)_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(56,189,248,0.08),_transparent_50%,_rgba(250,204,21,0.08))]" />

          <svg
            ref={cymaticsRef}
            className="absolute w-[70vmin] h-[70vmin] text-cyan-300/60"
            viewBox="0 0 100 100"
          >
            {[...Array(6)].map((_, i) => (
              <circle key={i} cx="50" cy="50" r={10 + i * 6} fill="none" stroke="currentColor" strokeWidth="0.2" />
            ))}
            {[...Array(12)].map((_, i) => (
              <line
                key={`l-${i}`}
                x1="50"
                y1="50"
                x2={50 + 40 * Math.cos((i * 30 * Math.PI) / 180)}
                y2={50 + 40 * Math.sin((i * 30 * Math.PI) / 180)}
                stroke="currentColor"
                strokeWidth="0.18"
              />
            ))}
            <polygon
              points="50,10 90,90 10,90"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.22"
            />
            <polygon
              points="50,90 90,10 10,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.22"
            />
          </svg>

          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-end gap-2" ref={barsRef}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-[6px] sm:w-[8px] h-20 sm:h-28 rounded-full bg-gradient-to-t from-cyan-400/60 via-cyan-300/80 to-white/80"
                style={{ filter: "drop-shadow(0 0 12px rgba(34,211,238,0.3))" }}
              />
            ))}
          </div>

          <div ref={act2TextRef} className="relative z-10 text-center px-6 max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.6em] text-white/50 mb-6">Act II · Vibration</p>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight">
              The void <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200">awakens</span>
            </h2>
            <p className="mt-6 text-sm sm:text-base text-white/60 max-w-xl mx-auto">
              Cymatics ripple into sacred geometry. Energy rises. The field becomes audible.
            </p>
          </div>
        </div>
      </section>

      {/* ACT III: THE CRESCENDO */}
      <section ref={act3Ref} className="relative h-[250vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.2),_rgba(0,0,0,0.95)_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(250,204,21,0.15),_transparent_45%,_rgba(56,189,248,0.25))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_55%)]" />

          <div ref={burstRef} className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-[60vmin] h-[60vmin] rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.35),_rgba(56,189,248,0.2)_45%,_transparent_70%)]" />
            <div className="absolute w-[75vmin] h-[75vmin] rounded-full border border-cyan-200/30 shadow-[0_0_80px_rgba(34,211,238,0.35)]" />
            <div className="absolute w-[90vmin] h-[90vmin] rounded-full border border-amber-200/20 mix-blend-screen" />
          </div>

          <div className="absolute inset-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`ring-${i}`}
                className="act3-ring absolute left-1/2 top-1/2 h-[28vmin] w-[28vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/25"
                style={{ width: `${28 + i * 10}vmin`, height: `${28 + i * 10}vmin`, filter: "drop-shadow(0 0 18px rgba(56,189,248,0.25))" }}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={`shard-${i}`}
                className="act3-shard absolute h-10 w-[2px] bg-gradient-to-b from-transparent via-cyan-200/70 to-amber-200/60"
                style={{ transform: `rotate(${i * 36}deg) translateY(-18vmin)`, filter: "drop-shadow(0 0 12px rgba(255,255,255,0.35))" }}
              />
            ))}
          </div>

          <div ref={act3TextRef} className="relative z-10 text-center px-6 max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.6em] text-white/50 mb-6">Act III · The Crescendo</p>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight">
              Transform your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200">frequency</span>
            </h2>
            <p className="mt-6 text-sm sm:text-base text-white/60 max-w-xl mx-auto">
              Spectral energy erupts. Cymatics multiply. The chamber opens to its highest amplitude.
            </p>
          </div>

          <div ref={act3LogoRef} className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[70vw] max-w-xl">
            <div className="relative w-full aspect-video rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/2 to-transparent shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(56,189,248,0.25),_transparent_40%,_rgba(250,204,21,0.2))]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-6 py-3 rounded-full border border-white/20 text-xs uppercase tracking-[0.4em] text-white/70 bg-black/40">
                  Hero Reveal
                </div>
              </div>
            </div>
          </div>

          <div ref={act3CtaRef} className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
            <p className="text-[11px] uppercase tracking-[0.5em] text-white/40 mb-4">Enter the chamber</p>
            <Link
              href="/"
              className="group inline-flex items-center gap-3 rounded-full border border-cyan-200/40 bg-white/5 px-10 py-4 text-sm font-medium text-white shadow-[0_0_30px_rgba(34,211,238,0.25)] transition-all hover:border-amber-200/60 hover:bg-gradient-to-r hover:from-cyan-200/20 hover:to-amber-200/20"
            >
              Enter the Chamber
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
