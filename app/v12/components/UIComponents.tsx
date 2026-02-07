"use client";

import React, { useState } from 'react';
import { ArrowRight, ChevronDown, Star, Check, Waves, Disc, Sprout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════════════
// FONTS & STYLES
// ═══════════════════════════════════════════════════════════════════

export const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600&family=Inter:wght@200;300;400&display=swap');
    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-playfair { font-family: 'Playfair Display', serif; }
    .metal-text {
      background-image: linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 48%, #475569 50%, #94A3B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes wave {
      0%, 100% { height: 4px; opacity: 0.5; }
      50% { height: 16px; opacity: 1; }
    }
    .animate-wave { animation: wave ease-in-out infinite; }
    .shadow-celestial {
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.3),
        0 10px 15px -3px rgba(0, 0, 0, 0.4),
        0 20px 25px -5px rgba(0, 0, 0, 0.5),
        0 30px 45px -10px rgba(0, 0, 0, 0.6),
        inset 0 1px 1px rgba(255, 255, 255, 0.1);
    }
  `}</style>
);

// ═══════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const WaveIcon = ({ active }: { active: boolean }) => (
  <div className="flex items-center justify-center gap-[3px] w-6 h-6">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i}
        className={`w-1 bg-white rounded-full transition-all duration-300 ${active ? 'animate-wave' : 'h-1 opacity-50'}`}
        style={{ height: active ? undefined : '4px', animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }}
      />
    ))}
  </div>
);

export const GlassButton = ({ onClick, children, className = '', active = false }: {
  onClick?: () => void; children: React.ReactNode; className?: string; active?: boolean;
}) => (
  <button onClick={onClick}
    className={clsx(
      "relative group overflow-hidden backdrop-blur-xl border transition-all duration-300 rounded-[32px]",
      active ? "bg-white/10 border-white/40 shadow-celestial"
             : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 shadow-lg",
      className
    )}>
    <div className="absolute inset-[1px] rounded-[32px] border border-white/20 pointer-events-none opacity-50" />
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    <div className="relative z-10">{children}</div>
  </button>
);

export const ProductBottle = () => (
  <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="relative z-10 w-64 md:w-80 aspect-[3/5] rounded-[32px] shadow-2xl overflow-hidden"
    >
      <Image
        src="/images/calm-dose-hero.jpg"
        alt="Calm Dose bottle"
        fill
        sizes="(max-width: 768px) 70vw, (max-width: 1280px) 40vw, 320px"
        className="object-contain"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </motion.div>
    <div className="absolute bottom-[10%] w-64 h-8 bg-black/20 blur-[20px] rounded-[100%]" />
  </div>
);

export const Accordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-4">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
        <span className="font-sans font-medium text-sm text-white/80 group-hover:text-white transition-colors">{title}</span>
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2 text-white/60 text-sm leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PurchaseWidget = () => {
  const [subType, setSubType] = useState<'sub' | 'once'>('sub');
  return (
    <div className="mt-8 space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-1 shadow-celestial backdrop-blur-xl">
        <button onClick={() => setSubType('sub')} className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-[28px] transition-all duration-300", subType === 'sub' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5")}>
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
        <button onClick={() => setSubType('once')} className={clsx("w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1", subType === 'once' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5")}>
          <div className="flex items-center gap-3">
            <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'once' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
              {subType === 'once' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
            </div>
            <div className="text-left"><span className="block font-medium text-sm text-white">One-time Purchase</span></div>
          </div>
          <span className="font-serif font-medium text-white">$115.00</span>
        </button>
      </div>
      <button className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-white via-white to-[#f3e6b8] text-black py-4 px-6 font-medium transition-all shadow-celestial transform hover:-translate-y-0.5">
        <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <span className="absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent group-hover:translate-x-[220%] transition-transform duration-700 ease-out" />
        </span>
        <span className="relative z-10 flex items-center justify-between">
          <span>Add to Cart</span>
          <span className="flex items-center gap-2">{subType === 'sub' ? '$98.00' : '$115.00'}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
        </span>
      </button>
      <p className="text-center text-xs text-white/40">Free shipping on orders over $100. 30-day money back guarantee.</p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════

export const SonicInfusionSection = () => (
  <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-20%" }} transition={{ duration: 1 }}
    className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/30 backdrop-blur-sm">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-8 tracking-wide">The Sonic Infusion</h2>
      <p className="font-playfair text-xl md:text-3xl text-white/80 leading-relaxed italic mb-12">
        &quot;The Mushrooms don&apos;t Work for Us. We Work for Them.&quot;
      </p>
      <div className="grid md:grid-cols-3 gap-8 text-left">
        {[
          {
            icon: Waves,
            title: "Grown as Medicine",
            description: "Fungi are sentient beings. We treat them with reverence, growing them in clean, high-vibration spaces."
          },
          {
            icon: Disc,
            title: "432Hz Infusion",
            description: "Every stage of cultivation is immersed in Solfeggio tones, chants, and nature sounds to harmonize the biological structure."
          },
          {
            icon: Sprout,
            title: "Nature & Nurture",
            description: "\"Same genetics, different frequency = different outcome.\" We refine unique strains through our in-house cultivation."
          }
        ].map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-3"
          >
            <item.icon className="w-8 h-8 text-mycelium-gold" />
            <h3 className="font-serif text-lg text-white">{item.title}</h3>
            <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </motion.section>
);
