"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronDown, Check, ArrowRight, Menu, ShoppingBag } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// --- Components ---

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-clinical-white/80 backdrop-blur-md border-b border-soft-clay/30">
    <div className="flex items-center gap-4">
        <Link href="/" className="group">
             <Menu className="w-5 h-5 text-deep-forest group-hover:text-mycelium-gold transition-colors" />
        </Link>
    </div>
    
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <h1 className="font-serif text-2xl tracking-tight font-medium text-deep-forest">FREQUENCY</h1>
    </div>

    <div className="flex items-center gap-4">
      <div className="w-2 h-2 rounded-full bg-mycelium-gold animate-pulse" />
      <ShoppingBag className="w-5 h-5 text-deep-forest" />
    </div>
  </header>
);

const Accordion = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-soft-clay py-4">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="font-sans font-medium text-sm text-deep-forest group-hover:text-mycelium-gold transition-colors">
          {title}
        </span>
        <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
        >
            <ChevronDown className="w-4 h-4 text-deep-forest/40" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-2 text-deep-forest/70 text-sm leading-relaxed font-sans">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductBottle = () => {
    return (
        <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center bg-[#F4F4F0]">
            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#F9F9F7] to-[#EAEAE5] opacity-50" />
            
            {/* The Bottle Representation */}
            {/* Since we don't have an asset, we build a CSS 'Bottle' that looks artistic */}
            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
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
                        <h2 className="text-mycelium-gold font-serif text-3xl text-center tracking-wide">CALM</h2>
                        <p className="text-white/40 text-[10px] text-center uppercase tracking-[0.2em] mt-2">Psilocybin Microdose</p>
                    </div>
                    
                    <div className="space-y-2">
                         <div className="flex justify-between text-[10px] text-white/30 font-mono border-t border-white/5 pt-2">
                             <span>BATCH: 004</span>
                             <span>180MG</span>
                         </div>
                         <div className="w-full h-32 opacity-20 relative overflow-hidden rounded-lg">
                             {/* Abstract Mycelium Pattern */}
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

const PurchaseWidget = () => {
    const [subType, setSubType] = useState<'sub' | 'once'>('sub');

    return (
        <div className="mt-8 space-y-6">
            {/* Subscription Toggle */}
            <div className="bg-white border border-soft-clay rounded-lg p-1">
                <button 
                    onClick={() => setSubType('sub')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300",
                        subType === 'sub' ? "bg-clinical-white shadow-sm border border-soft-clay" : "hover:bg-gray-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                         <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", subType === 'sub' ? "border-deep-forest bg-deep-forest" : "border-gray-300")}>
                            {subType === 'sub' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                         </div>
                         <div className="text-left">
                             <span className="block font-medium text-sm">Subscribe & Save 15%</span>
                             <span className="block text-xs text-deep-forest/50">Delivered monthly • Cancel anytime</span>
                         </div>
                    </div>
                    <span className="font-serif font-medium text-deep-forest">$49.00</span>
                </button>

                 <button 
                    onClick={() => setSubType('once')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1",
                        subType === 'once' ? "bg-clinical-white shadow-sm border border-soft-clay" : "hover:bg-gray-50"
                    )}
                >
                    <div className="flex items-center gap-3">
                         <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", subType === 'once' ? "border-deep-forest bg-deep-forest" : "border-gray-300")}>
                            {subType === 'once' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                         </div>
                         <div className="text-left">
                             <span className="block font-medium text-sm">One-time Purchase</span>
                         </div>
                    </div>
                    <span className="font-serif font-medium text-deep-forest">$58.00</span>
                </button>
            </div>

            {/* CTA */}
            <button className="w-full bg-deep-forest text-white py-4 px-6 rounded-full font-medium hover:bg-deep-forest/90 transition-all flex items-center justify-between group">
                <span>Add to Cart</span>
                <span className="flex items-center gap-2">
                    {subType === 'sub' ? '$49.00' : '$58.00'} 
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
            </button>
            
            <p className="text-center text-xs text-deep-forest/40">
                Free shipping on orders over $100. 30-day money back guarantee.
            </p>
        </div>
    )
}

export default function V1Page() {
  return (
    <div className="min-h-screen bg-clinical-white font-sans text-deep-forest selection:bg-mycelium-gold/20">
      <Header />

      <main className="md:grid md:grid-cols-2 min-h-screen">
        {/* Left Column - Product Visual */}
        <div className="sticky top-0 h-screen hidden md:block overflow-hidden">
            <ProductBottle />
        </div>
        
        {/* Mobile Visual (Non-sticky) */}
        <div className="md:hidden">
             <ProductBottle />
        </div>

        {/* Right Column - Content */}
        <div className="px-6 py-24 md:py-32 md:px-16 lg:px-24 flex flex-col justify-center max-w-2xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
            >
                {/* Meta */}
                <div className="flex items-center gap-2 mb-6 text-sm font-medium">
                    <div className="flex text-mycelium-gold">
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                        <Star className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-deep-forest/60 border-b border-deep-forest/20 pb-0.5">142 Reviews</span>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.1]">
                    Calm<span className="text-mycelium-gold">.</span>
                </h1>

                {/* Description */}
                <p className="text-lg md:text-xl text-deep-forest/70 leading-relaxed mb-10 font-light">
                    Your daily anchor in a chaotic world. Organic Psilocybin mushrooms grown in a 
                    sound chamber of healing frequencies, blended with Reishi and Ashwagandha for 
                    profound mental clarity and anxiety relief.
                </p>

                {/* Value Props */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                     {[
                         "Anxiety Relief", 
                         "Mental Clarity", 
                         "Sleep Support", 
                         "100% Organic"
                     ].map((item, i) => (
                         <div key={i} className="flex items-center gap-2 text-sm text-deep-forest/80">
                             <div className="w-5 h-5 rounded-full bg-[#E6F5EC] flex items-center justify-center text-[#009E60]">
                                 <Check className="w-3 h-3" />
                             </div>
                             {item}
                         </div>
                     ))}
                </div>

                {/* Accordions */}
                <div className="border-t border-soft-clay mb-8">
                    <Accordion title="Ingredients" defaultOpen>
                        <p><strong>Active:</strong> 180mg Psilocybin Cubensis (Golden Teacher)</p>
                        <p className="mt-2"><strong>Support Stack:</strong> Organic Reishi Mushroom (Fruiting Body), Ashwagandha Root Extract, L-Theanine.</p>
                        <p className="mt-2 text-xs opacity-60">Capsule: Vegetable Cellulose.</p>
                    </Accordion>
                    <Accordion title="Dosage Ritual">
                        <p>Take one capsule in the morning with intention. For best results, follow a 3-day on, 2-day off protocol. Pair with our guided soundscapes.</p>
                    </Accordion>
                    <Accordion title="The Frequency Difference">
                        <p>Unlike standard cultivation, our mushrooms are grown in a chamber resonating at 432Hz (The Miracle Tone). We believe this imbues the biological structure with inherent harmonic stability.</p>
                    </Accordion>
                </div>

                {/* Purchase Area */}
                <PurchaseWidget />

            </motion.div>
        </div>
      </main>

      {/* Sticky Bottom Nav (Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-soft-clay py-4 px-8 hidden md:flex justify-between items-center text-xs font-medium uppercase tracking-widest text-deep-forest/50 z-40">
           <div>Scientific • Organic • Sonic</div>
           <div className="flex gap-8">
               <span className="text-deep-forest cursor-pointer hover:text-mycelium-gold transition-colors">Results</span>
               <span className="cursor-pointer hover:text-deep-forest transition-colors">The Science</span>
               <span className="cursor-pointer hover:text-deep-forest transition-colors">FAQS</span>
           </div>
           <div>Frequency Labs © 2026</div>
      </div>
    </div>
  );
}
