"use client";

import React from 'react';
import { motion } from 'framer-motion';

export const CurvedTitle = () => {
    // Reveal Animation Variants
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 50 },
        visible: { 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { 
                delay: 5.5, 
                duration: 1.5, 
                ease: "easeOut" 
            }
        }
    };

    // Shimmer Animation Variants (Looping)
    const shimmerVariants = {
        animate: {
            x1: ["-100%", "200%"],
            x2: ["0%", "300%"],
            transition: {
                repeat: Infinity,
                duration: 8, // Faster, smoother shimmer
                ease: "linear"
            }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: "-20% 0px -20% 0px" }}
            className="w-full flex justify-center items-center z-10"
        >
            <svg 
                viewBox="0 0 1000 200" 
                className="w-full max-w-[90vw] md:max-w-[80vw] h-auto overflow-visible"
            >
                <defs>
                    {/* The Path for the Text to follow (Gentle Arc) */}
                    {/* M start-x start-y Q control-x control-y end-x end-y */}
                    {/* 100,150 -> 500,50 (Top of arc) -> 900,150 */}
                    <path id="textCurve" d="M 50 160 Q 500 60 950 160" />

                    {/* Smooth Gradient for Shimmer */}
                    {/* We animate the gradient units coordinates */}
                    <motion.linearGradient 
                        id="shimmerGradient" 
                        gradientUnits="userSpaceOnUse"
                        variants={shimmerVariants}
                        animate="animate"
                    >
                        <stop offset="0%" stopColor="#666" />
                        <stop offset="45%" stopColor="#fff" />
                        <stop offset="50%" stopColor="#fff" />
                        <stop offset="55%" stopColor="#fff" />
                        <stop offset="100%" stopColor="#666" />
                    </motion.linearGradient>
                </defs>

                {/* The Text Itself */}
                <text 
                    width="1000" 
                    className="font-cinzel font-normal tracking-[0.2em]"
                    style={{ 
                        fontSize: '110px', 
                        letterSpacing: '0.15em',
                        // Stroke logic for thinning
                        stroke: 'black',
                        strokeWidth: '1.5px',
                        paintOrder: 'stroke', // Ensure stroke doesn't eat fill poorly
                        fill: 'url(#shimmerGradient)'
                    }}
                >
                    <textPath 
                        href="#textCurve" 
                        startOffset="50%" 
                        textAnchor="middle"
                        side="left" // Ensure it sits "on" the line
                    >
                        FREQUENCY
                    </textPath>
                </text>
            </svg>
        </motion.div>
    );
};
