"use client";

import React, { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// ═══════════════════════════════════════════════════════════════════
// Font injection
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
  `}</style>
);

// ═══════════════════════════════════════════════════════════════════
// Shared small components
// ═══════════════════════════════════════════════════════════════════

export const WaveIcon = ({ active }: { active: boolean }) => (
  <div className="flex items-center justify-center gap-[3px] w-6 h-6">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`w-1 bg-white rounded-full transition-all duration-300 ${
          active ? 'animate-wave' : 'h-1 opacity-50'
        }`}
        style={{
          height: active ? undefined : '4px',
          animationDelay: `${i * 0.1}s`,
          animationDuration: '0.8s',
        }}
      />
    ))}
  </div>
);

export const GlassButton = ({
  onClick,
  children,
  className = '',
  active = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}) => (
  <button
    onClick={onClick}
    className={clsx(
      'relative group overflow-hidden backdrop-blur-xl border transition-all duration-300 rounded-2xl',
      active
        ? 'bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
      className,
    )}
  >
    <div className="absolute inset-[1px] rounded-2xl border border-white/20 pointer-events-none opacity-50" />
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
      transition={{ duration: 1, ease: 'easeOut' }}
      className="relative z-10 w-64 md:w-80 aspect-[3/5] rounded-[40px] shadow-2xl overflow-hidden backdrop-blur-sm border border-white/20"
      style={{
        background: 'linear-gradient(135deg, rgba(40,40,40,0.95) 0%, rgba(20,20,20,1) 100%)',
        boxShadow:
          '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.1)',
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] h-16 bg-[#111] border-b border-white/10 z-20" />
      <div className="absolute inset-4 top-24 border border-white/10 rounded-[20px] p-6 flex flex-col justify-between">
        <div>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-mycelium-gold to-transparent opacity-50 mb-4" />
          <h2 className="text-mycelium-gold font-serif text-3xl text-center tracking-wide">
            CALM DOSE
          </h2>
          <p className="text-white/40 text-[10px] text-center uppercase tracking-[0.2em] mt-2">
            Functional Mushroom Blend
          </p>
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
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
    </motion.div>
    <div className="absolute bottom-[10%] w-64 h-8 bg-black/20 blur-[20px] rounded-[100%]" />
  </div>
);

export const Accordion = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="font-sans font-medium text-sm text-white/80 group-hover:text-white transition-colors">
          {title}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2 text-white/60 text-sm leading-relaxed">
              {children}
            </div>
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
      <div className="bg-white/5 border border-white/10 rounded-lg p-1 shadow-sm backdrop-blur-md">
        <button
          onClick={() => setSubType('sub')}
          className={clsx(
            'w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300',
            subType === 'sub'
              ? 'bg-white/10 shadow-sm border border-white/10'
              : 'hover:bg-white/5',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                subType === 'sub'
                  ? 'border-mycelium-gold bg-mycelium-gold'
                  : 'border-white/30',
              )}
            >
              {subType === 'sub' && (
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
              )}
            </div>
            <div className="text-left">
              <span className="block font-medium text-sm text-white">
                Subscribe & Save 15%
              </span>
              <span className="block text-xs text-white/50">
                Delivered monthly • Cancel anytime
              </span>
            </div>
          </div>
          <span className="font-serif font-medium text-white">$98.00</span>
        </button>
        <button
          onClick={() => setSubType('once')}
          className={clsx(
            'w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1',
            subType === 'once'
              ? 'bg-white/10 shadow-sm border border-white/10'
              : 'hover:bg-white/5',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-4 h-4 rounded-full border flex items-center justify-center transition-colors',
                subType === 'once'
                  ? 'border-mycelium-gold bg-mycelium-gold'
                  : 'border-white/30',
              )}
            >
              {subType === 'once' && (
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
              )}
            </div>
            <div className="text-left">
              <span className="block font-medium text-sm text-white">
                One-time Purchase
              </span>
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
      <p className="text-center text-xs text-white/40">
        Free shipping on orders over $100. 30-day money back guarantee.
      </p>
    </div>
  );
};
