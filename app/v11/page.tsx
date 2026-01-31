"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ShoppingBag, Menu, Star, Check, Waves, Disc, Sprout } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
// Duplicate React import removed.
import Image from 'next/image';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import clsx from 'clsx';
import Link from 'next/link';
import { useMicAudio } from '@/hooks/useMicAudio';
import { useAmbientSound } from '@/hooks/useAmbientSound';
import { CurvedTitle } from '@/components/cinematic/CurvedTitle';
import { titleVertex, titleFragment } from '@/shaders/title/shimmerTitle';

// --- Shared Styles & Fonts ---
const FontStyles = () => (
// ... (rest of file)

// ... inside CinematicIntro ...
        // --- 3. 3D Title Setup (Universal Bend) ---
        // Generate Text Texture
        const createTextTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            
            // Clear (Transparent)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw Text
            ctx.fillStyle = 'white';
            ctx.font = '400 180px "Cinzel"'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.letterSpacing = '40px'; // Wide spacing
            ctx.fillText('FREQUENCY', canvas.width / 2, canvas.height / 2);
            
            const tex = new THREE.CanvasTexture(canvas);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
            return tex;
        };

        const titleTex = createTextTexture();
        
        const titleGeo = new THREE.PlaneGeometry(14, 3.5, 64, 1); // High segment count for bending
        const titleMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: titleTex },
                uBend: { value: 0.2 }, // The "Universal" Curve amount
                uOpacity: { value: 0.0 }, // Start hidden
                uColor: { value: new THREE.Vector3(1, 1, 1) }
            },
            vertexShader: titleVertex,
            fragmentShader: titleFragment,
            transparent: true,
            depthWrite: false, // Allow particles to show behind/through
            side: THREE.DoubleSide
        });
        
        const titleMesh = new THREE.Mesh(titleGeo, titleMat);
        titleMesh.position.set(0, 0.5, 0); // Center, slightly up
        scene.add(titleMesh);


        // --- Animation Logic ---
        let startTime = Date.now();
        // ...
        
        const loop = () => {
            // ... existing loop ...
            
            // Update Title Uniforms
            titleMat.uniforms.uTime.value = elapsed;
            
            // Reveal Logic for Title (Delayed)
            if (elapsed > 5.5) {
                // Fade in over 2 seconds
                titleMat.uniforms.uOpacity.value = Math.min((elapsed - 5.5) * 0.5, 1.0);
            } else {
                titleMat.uniforms.uOpacity.value = 0.0;
            }
            
            // ... render ...
        };
        
        // ... (rest of loop and dispose) ...
            titleGeo.dispose();
            titleMat.dispose();
            if (titleTex) titleTex.dispose();
            
// ...

    return (
        <div ref={containerRef} className="fixed inset-0 z-0 bg-black">
            {/* DOM Title Removed - Now 3D */}
            <div 
                className="absolute inset-0 bg-white pointer-events-none mix-blend-overlay transition-opacity duration-75"
                style={{ opacity: flashOpacity }}
            />
        </div>
    );
};

// ... inside V11Page JSX ...
            {/* Section 1: Cinematic Intro Spacer & Title Reveal */}
            <section className="relative h-[150vh] w-full pointer-events-none">
                {/* DOM Title Removed */}
                
                {/* Audio Enable Button (Pointer events enabled) */}
                <div className="sticky top-0 h-screen w-full flex items-center justify-center">
                    <div className="absolute top-[60%] pointer-events-auto z-50">
// ...

    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600&family=Inter:wght@100;200;300;400&display=swap');
    
    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-playfair { font-family: 'Playfair Display', serif; }
    
    /* Metal Text Effect for Hero */
    .metal-text {
        background-image: linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 48%, #475569 50%, #94A3B8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));
    }

    /* Custom Shimmer Shader for Text */
    @keyframes textShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
    }
    
    .shimmer-text {
        background: linear-gradient(
            110deg,
            #ffffff 20%,
            #888888 30%,
            #ffffff 45%,
            #ffffff 55%,
            #888888 70%,
            #ffffff 80%
        );
        background-size: 200% auto;
        color: transparent;
        -webkit-background-clip: text;
        background-clip: text;
        animation: textShimmer 40s linear infinite;
        opacity: 0.9;
    }
  `}</style>
);

// --- Cinematic Intro Engine ---

// 1. Shaders for the "God Is" -> "Lines" Morph
const silverParticleVertex = `
  uniform float uTime;
  uniform float uMorph; // 0.0 = Text, 1.0 = Big Bang Lines
  uniform float uScroll;
  uniform float uParticleSize;
  
  attribute vec3 linePosition; // Target position for lines state
  attribute float randomOffset;
  
  varying float vAlpha;
  varying float vShimmer;
  
  // --- Simplex 3D Noise ---
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  // --- Curl Noise Field ---
  vec3 curl(vec3 p) {
    float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    float p_x = snoise(p + dx) - snoise(p - dx);
    float p_y = snoise(p + dy) - snoise(p - dy);
    float p_z = snoise(p + dz) - snoise(p - dz);
    return vec3(p_y - p_z, p_z - p_x, p_x - p_y) / (2.0 * e);
  }

  // Easing function for explosion
  float easeOutExpo(float x) {
    return x == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * x);
  }

  void main() {
    vec3 currentPos = position;
    float alpha = 1.0;

    // --- BIG BANG SEQUENCE (uMorph 0.0 to 1.0) ---
    float progress = smoothstep(0.0, 1.0, uMorph);
    
    // EXPLOSION LOGIC ("Big Bang")
    float blast = sin(progress * 3.14159) * (1.0 - progress) * 8.0; 
    blast *= smoothstep(0.0, 0.2, progress); 
    
    vec3 randomDir = normalize(vec3(
        randomOffset - 0.5, 
        sin(randomOffset * 10.0), 
        cos(randomOffset * 20.0)
    ));

    // Linear Path Interpolation
    currentPos = mix(position, linePosition, easeOutExpo(progress));
    
    // --- ADDING LIQUID JUSTICE (CURL NOISE) ---
    // Calculate organic flow based on current position and time
    vec3 flow = curl(currentPos * 0.3 + uTime * 0.1);
    
    // Displace based on progress (Peak in middle of flight)
    float flowInfluence = sin(progress * 3.14159);
    currentPos += flow * flowInfluence * 4.0;

    // Apply initial Blast
    currentPos += randomDir * blast * 2.0;

    // Add noise/vibration to lines state
    if (uMorph > 0.5) {
        float wave = sin(currentPos.x * 2.0 + uTime * 2.0 + randomOffset * 10.0);
        currentPos.z += wave * 0.1 * uMorph; 
        currentPos.y += cos(currentPos.x * 5.0 + uTime) * 0.02 * uMorph;
    }

    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    gl_PointSize = uParticleSize * (300.0 / -mvPosition.z);
    vShimmer = sin(uTime * 3.0 + randomOffset * 20.0);
    vAlpha = alpha; 
  }
`;

const silverParticleFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  
  varying float vAlpha;
  varying float vShimmer;
  
  void main() {
    // Circle shape
    if(length(gl_PointCoord - 0.5) > 0.5) discard;
    
    // Aluminum / Silver Shimmer
    // Base is white/silver, shimmer adds brightness
    float brightness = 0.8 + 0.4 * vShimmer;
    vec3 finalColor = uColor * brightness;
    
    gl_FragColor = vec4(finalColor, uOpacity * vAlpha);
  }
`;

// 2. V10 Blue Field Shaders (Genesis/Revelation) - slightly optimized for background use
const fieldVertexShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uVoice;
  uniform float uVolume; // Master volume for visual intensity
  uniform float uScroll; // Controls the "Horizon" bend
  uniform int uShapeFn;  // 0:Genesis, 1:Revelation, 2:Ascension
  uniform float uParticleSize;
  
  varying float vDisplacement;
  varying float vDist; // Distance from center for fades

  // Simple Noise
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
    vec2 pos = uv * 2.0 - 1.0; // Normalised Coordinates -1 to 1
    vDist = length(pos);
    
    float PI = 3.14159;
    float displacement = 0.0;
    float t = uTime * 0.5;

    // --- Shape Logic ---
    if (uShapeFn == 0) { // Genesis (Smooth Waves)
        // INCREASED REACTIVITY:
        // Base frequency 3.0, plus up to 8.0 from bass/voice
        float n = 3.0 + uBass * 8.0; 
        float m = 3.0 + uVoice * 8.0; 
        float wave = cos(n * pos.x * PI) * cos(m * pos.y * PI) - cos(m * pos.x * PI) * cos(n * pos.y * PI);
        
        // Amplitude modulation: Volume + Bass kick
        displacement = wave * (uVolume * (1.0 + uBass * 3.0));
    } 
    else if (uShapeFn == 1) { // Revelation (Geometric/Crystalline)
        vec2 grid = abs(fract(pos * (4.0 + uBass * 4.0)) - 0.5); // Bass changes grid density
        displacement = (1.0 - max(grid.x, grid.y)) * (uVolume * 3.0);
        displacement *= cos(t * 1.5 + length(pos) * (4.0 + uVoice * 10.0));
    } 

    vec3 newPos = position;
    newPos.z += displacement * 1.5;

    // Scroll Transition: The "Field" is revealed behind the lines
    // We want it to curve up from the deep
    
    vDisplacement = abs(displacement);

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    // MODIFIED: Reduced displacement influence on size (2.0 -> 0.5) for consistent refinement
    gl_PointSize = (uParticleSize + vDisplacement * 0.5) * (5.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fieldFragmentShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uOpacity; 
  
  varying float vDisplacement;
  varying float vDist;

  void main() {
    if(length(gl_PointCoord - 0.5) > 0.5) discard;

    vec3 color = mix(uColor1, uColor2, smoothstep(0.0, 2.0, vDisplacement));
    
    // Circular vignette fade
    float alpha = (1.0 - smoothstep(0.4, 1.0, vDist)) * uOpacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const lensDistortionShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "uDistortion": { value: 0.0 },
        "uAberration": { value: 0.01 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uDistortion;
        uniform float uAberration;
        varying vec2 vUv;

        vec2 distort(vec2 uv, float k) {
            vec2 d = uv - 0.5;
            float r2 = dot(d, d);
            return uv + d * k * r2;
        }

        void main() {
            vec2 distortedUV = distort(vUv, uDistortion);
            
            float r = texture2D(tDiffuse, distort(vUv, uDistortion + uAberration)).r;
            float g = texture2D(tDiffuse, distortedUV).g;
            float b = texture2D(tDiffuse, distort(vUv, uDistortion - uAberration)).b;
            
            float vignette = smoothstep(0.8, 0.4, length(vUv - 0.5));
            gl_FragColor = vec4(vec3(r, g, b) * vignette, 1.0);
        }
    `
};

const godRaysShader = {
    uniforms: {
        tDiffuse: { value: null },
        fX: { value: 0.5 },
        fY: { value: 0.5 },
        fExposure: { value: 0.6 },
        fDecay: { value: 0.93 },
        fDensity: { value: 0.96 },
        fWeight: { value: 0.4 },
        fClamp: { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float fX;
        uniform float fY;
        uniform float fExposure;
        uniform float fDecay;
        uniform float fDensity;
        uniform float fWeight;
        uniform float fClamp;

        void main() {
            vec2 deltaTextCoord = vec2(vUv - vec2(fX, fY));
            deltaTextCoord *= 1.0 /  float(100) * fDensity;
            vec2 coord = vUv;
            float illuminationDecay = 1.0;
            vec4 FragColor = vec4(0.0);

            for(int i=0; i < 100 ; i++) {
                coord -= deltaTextCoord;
                vec4 texel = texture2D(tDiffuse, coord);
                texel *= illuminationDecay * fWeight;
                FragColor += texel;
                illuminationDecay *= fDecay;
            }
            FragColor *= fExposure;
            FragColor = clamp(FragColor, 0.0, fClamp);
            gl_FragColor = FragColor;
        }
    `
};

const additiveBlendShader = {
    uniforms: {
        tDiffuse: { value: null },
        tAdd: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tAdd;
        varying vec2 vUv;
        void main() {
            vec4 color = texture2D( tDiffuse, vUv );
            vec4 add = texture2D( tAdd, vUv );
            gl_FragColor = color + add;
        }
    `
};


// --- CONSTANTS ---
// INTRO_PHASES removed as unused

// Smoothstep helper (same as GLSL smoothstep)
const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

const CinematicIntro = ({ onScrollRequest, getAudioData }: { onScrollRequest: () => void, getAudioData: () => { bass: number, mid: number, high: number } }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [flashOpacity, setFlashOpacity] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 8); // Start further back

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // --- Post Processing Setup ---
        const occlusionRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth / 2, window.innerHeight / 2);
        const occlusionComposer = new EffectComposer(renderer, occlusionRenderTarget);
        
        // Occlusion Scene (Black objects on Black background, Light sources are White)
        const occlusionScene = new THREE.Scene();
        occlusionScene.background = new THREE.Color(0x000000);
        
        // Add "Horizon Line" Light Source
        const horizonGeo = new THREE.PlaneGeometry(50, 0.05);
        const horizonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
        horizonMesh.position.set(0, 0, -2); // Behind text
        occlusionScene.add(horizonMesh);
        
        // We need a copy of the particles for the occlusion scene that are SOLID WHITE
        const occParticleMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorph: { value: 0.0 }, 
                uScroll: { value: 0 },
                uParticleSize: { value: 3.5 }, // Consistent size
                uColor: { value: new THREE.Color(0xffffff) }, // Pure White
                uOpacity: { value: 1.0 }, 
            },
            vertexShader: silverParticleVertex,
            fragmentShader: silverParticleFragment,
            blending: THREE.AdditiveBlending
        });
        const occParticleSystem = new THREE.Points(particleGeometry, occParticleMat);
        occlusionScene.add(occParticleSystem);

        const occlusionRenderPass = new RenderPass(occlusionScene, camera);
        occlusionComposer.addPass(occlusionRenderPass);
        
        const godRaysPass = new ShaderPass(godRaysShader);
        occlusionComposer.addPass(godRaysPass);

        // Final Composer
        const finalComposer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        finalComposer.addPass(renderPass);
        
        const blendPass = new ShaderPass(additiveBlendShader);
        blendPass.uniforms.tAdd.value = occlusionRenderTarget.texture;
        finalComposer.addPass(blendPass);

        const lensPass = new ShaderPass(lensDistortionShader);
        finalComposer.addPass(lensPass);

        // --- 1. "God Is" Particles Setup ---
        // We generate positions from a canvas
        const generateTextPositions = (text: string) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return new Float32Array(0);
            canvas.width = 1024;
            canvas.height = 512;

            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'white';
            ctx.font = 'bold 80px "Cinzel", serif'; // Use loaded font or fallback
            ctx.letterSpacing = '20px';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const positions = [];

            for (let y = 0; y < canvas.height; y += 4) { // stride for density
                for (let x = 0; x < canvas.width; x += 4) {
                    const index = (y * canvas.width + x) * 4;
                    if (data[index] > 50) { // Threshold
                        // MODIFIED: Wider and shorter footprint (X: 3.0, Y: 1.0)
                        const pX = (x / canvas.width - 0.5) * 3.0; 
                        const pY = (-(y / canvas.height - 0.5) * 1.0) + 0.5; 
                        positions.push(pX, pY, 0);
                    }
                }
            }
            return new Float32Array(positions);
        };

        const textPositions = generateTextPositions("God is");
        const count = textPositions.length / 3;

        // Generate "Line" Target Positions
        const linePositions = new Float32Array(count * 3);
        const randomOffsets = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            // Distribute into parallel lines (horizontal planes)
            const lineIndex = i % 20; // 20 lines
            const x = (Math.random() - 0.5) * 20.0; // Wide spread
            const z = (Math.random() - 0.5) * 5.0; // Depth
            const y = -2.0 + (lineIndex * 0.2); // Stacked vertically, slightly below center

            linePositions[i * 3] = x;
            linePositions[i * 3 + 1] = y;
            linePositions[i * 3 + 2] = z;

            randomOffsets[i] = Math.random();
        }

        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(textPositions, 3));
        particleGeometry.setAttribute('linePosition', new THREE.BufferAttribute(linePositions, 3));
        particleGeometry.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1));

        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uMorph: { value: -1.0 }, // Start at Line Phase
                uScroll: { value: 0 },
                uParticleSize: { value: 0.04 }, // Reduced for finer particles
                uColor: { value: new THREE.Color(0xdddddd) }, // Silver/Aluminum
                uOpacity: { value: 1.0 },
            },
            vertexShader: silverParticleVertex,
            fragmentShader: silverParticleFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);


        // --- 2. Blue Field Setup (Background) ---
        const fieldGeo = new THREE.PlaneGeometry(16, 16, 200, 200);
        const fieldMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBass: { value: 0.2 },
                uVoice: { value: 0.2 },
                uVolume: { value: 0.5 }, // Start dimmed
                uScroll: { value: 0 },
                uShapeFn: { value: 0 }, // Genesis
                uParticleSize: { value: 3.5 },
                uColor1: { value: new THREE.Vector3(0.0, 0.05, 0.2) }, // Dark Blue
                uColor2: { value: new THREE.Vector3(0.1, 0.2, 0.8) },  // Safe Indigo
                uOpacity: { value: 0.0 } // Start invisible
            },
            vertexShader: fieldVertexShader,
            fragmentShader: fieldFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const fieldMesh = new THREE.Points(fieldGeo, fieldMat);
        fieldMesh.rotation.x = -0.3;
        fieldMesh.position.z = -5; // Behind everything
        scene.add(fieldMesh);

        // --- 3. 3D Title Setup (Universal Bend) ---
        const createTextTexture = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '400 180px "Cinzel"'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.letterSpacing = '40px'; 
            ctx.fillText('FREQUENCY', canvas.width / 2, canvas.height / 2);
            const tex = new THREE.CanvasTexture(canvas);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
            return tex;
        };
        const titleTex = createTextTexture();
        const titleGeo = new THREE.PlaneGeometry(14, 3.5, 64, 1); 
        const titleMat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: titleTex },
                uBend: { value: 0.25 }, // Stronger bend
                uOpacity: { value: 0.0 }, 
                uColor: { value: new THREE.Vector3(1, 1, 1) }
            },
            vertexShader: titleVertex,
            fragmentShader: titleFragment,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const titleMesh = new THREE.Mesh(titleGeo, titleMat);
        titleMesh.position.set(0, 0.5, 0); 
        scene.add(titleMesh);

        // --- Animation Logic ---
        let startTime = Date.now();
        let frameId: number;

        const loop = () => {
            const now = Date.now();
            const elapsed = (now - startTime) * 0.001;
            const scroll = window.scrollY / window.innerHeight; 

            // Update Uniforms
            const audio = getAudioData();
            const bass = Math.min(audio.bass * 3.0, 1.0); 
            const voice = Math.min(audio.mid * 3.0, 1.0);

            // Sync Uniforms across Main and Occlusion
            particleMaterial.uniforms.uTime.value = elapsed;
            occParticleMat.uniforms.uTime.value = elapsed;
            fieldMat.uniforms.uTime.value = elapsed;

            // Audio Uniforms
            fieldMat.uniforms.uBass.value = THREE.MathUtils.lerp(fieldMat.uniforms.uBass.value, bass, 0.2);
            fieldMat.uniforms.uVoice.value = THREE.MathUtils.lerp(fieldMat.uniforms.uVoice.value, voice, 0.2);

            // Phase Logic
            let morphProgress = 0.0;
            let fieldOpacity = 0;
            let textOpacity = 0;
            let flash = 0;

            if (elapsed < 3.0) {
                textOpacity = smoothstep(0.0, 3.0, elapsed);
            } else if (elapsed < 5.0) {
                textOpacity = 1.0;
            } else {
                const explosionTime = elapsed - 5.0;
                morphProgress = Math.min(explosionTime * 0.8, 1.0); 
                textOpacity = 1.0;
                flash = Math.max(0, 1.0 - explosionTime * 0.5); 
                camera.position.z = 8.0 - morphProgress * 2.0; 
            }

            if (scroll > 0.1) {
                morphProgress = 1.0; 
                fieldOpacity = smoothstep(0.1, 0.5, scroll);
                camera.rotation.x = -scroll * 0.2;
            }

            // Update main particles
            particleMaterial.uniforms.uMorph.value = morphProgress;
            particleMaterial.uniforms.uOpacity.value = textOpacity;
            
            // Update Occlusion particles (Follow same morph)
            occParticleMat.uniforms.uMorph.value = morphProgress;
            occParticleMat.uniforms.uOpacity.value = textOpacity;

            fieldMat.uniforms.uOpacity.value = fieldOpacity;
            setFlashOpacity(flash);
            fieldMat.uniforms.uScroll.value = scroll;
            fieldMesh.rotation.z = elapsed * 0.05;

            // Update Title
            titleMat.uniforms.uTime.value = elapsed;
            if (elapsed > 5.5) {
                titleMat.uniforms.uOpacity.value = Math.min((elapsed - 5.5) * 0.5, 1.0);
            } else {
                titleMat.uniforms.uOpacity.value = 0.0;
            }

            // Lens & GodRays Uniforms
            lensPass.uniforms.uDistortion.value = THREE.MathUtils.lerp(lensPass.uniforms.uDistortion.value, bass * 0.1, 0.1);
            lensPass.uniforms.uAberration.value = 0.005 + bass * 0.02;
            
            // God Rays Reactive Intensity
            // Sun gets brighter with voice
            godRaysPass.uniforms.fExposure.value = 0.6 + voice * 0.4;
            
            // Move God Ray Center with camera/mouse if desired (static center for now)
            const sunPos = new THREE.Vector3(0, 0, -2).project(camera);
            godRaysPass.uniforms.fX.value = (sunPos.x + 1) / 2;
            godRaysPass.uniforms.fY.value = (sunPos.y + 1) / 2;

            // Render
            occlusionComposer.render();
            finalComposer.render();
            
            frameId = requestAnimationFrame(loop);
        };

        loop();

        // Resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            occlusionComposer.setSize(window.innerWidth / 2, window.innerHeight / 2);
            finalComposer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(frameId);
            
            // Dispose Three.js Resources
            particleGeometry.dispose();
            particleMaterial.dispose();
            fieldGeo.dispose();
            fieldMat.dispose();

            renderer.dispose();
            if (container) container.innerHTML = '';
        };
    }, []); // getAudioData is stable from hook

    return (
        <div ref={containerRef} className="fixed inset-0 z-0 bg-black">
            <div 
                className="absolute inset-0 bg-white pointer-events-none mix-blend-overlay transition-opacity duration-75"
                style={{ opacity: flashOpacity }}
            />
        </div>
    );
};

// --- V1 Helper Components ---

const ProductBottle = () => {
    return (
        <div className="relative w-full h-[60vh] md:h-[80vh] flex items-center justify-center">
            {/* The Bottle Representation */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative z-10 w-64 md:w-80 aspect-[4/5] rounded-[40px] shadow-2xl overflow-hidden border border-white/10"
            >
                <Image
                    src="/images/calm-dose-hero.jpg"
                    alt="Frequency Calm Dose Bottle"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority
                />
            </motion.div>

            {/* Shadow Base */}
            <div className="absolute bottom-[10%] w-64 h-8 bg-black/20 blur-[20px] rounded-[100%]" />
        </div>
    );
}

const Accordion = ({ title, children }: { title: string, children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/10 py-4">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full text-left group">
                <span className="font-sans font-medium text-sm text-white/80 group-hover:text-white transition-colors">{title}</span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-4 pb-2 text-white/60 text-sm leading-relaxed">{children}</div>
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
            <div className="bg-white/5 border border-white/10 rounded-lg p-1 shadow-sm backdrop-blur-md">
                <button
                    onClick={() => setSubType('sub')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300",
                        subType === 'sub' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5"
                    )}
                >
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
                <button
                    onClick={() => setSubType('once')}
                    className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 rounded-md transition-all duration-300 mt-1",
                        subType === 'once' ? "bg-white/10 shadow-sm border border-white/10" : "hover:bg-white/5"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", subType === 'once' ? "border-mycelium-gold bg-mycelium-gold" : "border-white/30")}>
                            {subType === 'once' && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                        </div>
                        <div className="text-left">
                            <span className="block font-medium text-sm text-white">One-time Purchase</span>
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
            <p className="text-center text-xs text-white/40">Free shipping on orders over $100. 30-day money back guarantee.</p>
        </div>
    )
}

// --- Main Page Component ---
export default function V11Page() {
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    const { startAudio, getFrequencyData: getAudioData } = useMicAudio();
    const { startAmbient } = useAmbientSound();
    
    const handleStartExperience = () => {
        startAudio();
        startAmbient();
    };

    // Background fade transition (for the white content section)
    const bgOpacity = useTransform(scrollY, [600, 1000], [0, 1]);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToProcess = () => {
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-black text-deep-forest font-sans selection:bg-frequency-blue/30 overflow-x-hidden">
            <FontStyles />

            {/* 3D Cinematic Background (Handles intro + field) */}
            <div onClick={handleStartExperience} className="absolute inset-0 z-0 cursor-pointer" title="Click to start the experience">
                <CinematicIntro onScrollRequest={scrollToProcess} getAudioData={getAudioData} />
            </div>

    <motion.div
        style={{ opacity: bgOpacity }}
        className="fixed inset-0 z-[-1]"
    >
        <div className="absolute inset-0 bg-black/60 z-10" /> {/* Dark overlay for "deep dark nature" */}
        <Image
            src="/forest-bg.jpg"
            alt="Forest Background"
            fill
            className="object-cover opacity-80"
            priority
        />
    </motion.div>

            {/* White Background Layer for Content (Fades in) - REDUCED OPACITY TO SHOW FOREST */}
            <motion.div
                style={{ opacity: bgOpacity }}
                className="fixed inset-0 z-[-1] bg-gradient-to-b from-black via-black/80 to-deep-forest/90 pointer-events-none mix-blend-multiply"
            />


            {/* Navigation (Floating) */}
            <nav className={clsx(
                "fixed top-0 left-0 w-full z-50 transition-all duration-500 flex justify-between items-center px-6 md:px-12 py-6",
                scrolled ? "bg-black/50 backdrop-blur-md border-b border-white/10 py-4 text-white" : "bg-transparent text-white"
            )}>
                <Link href="/" className="hover:text-mycelium-gold transition-colors duration-300">
                    <Menu className="w-6 h-6" />
                </Link>

                {/* Center Title (Only visible after intro scroll) */}
                <div className={clsx("absolute left-1/2 -translate-x-1/2 transition-opacity duration-700", scrolled ? "opacity-100" : "opacity-0")}>
                    <span className="font-cinzel text-lg tracking-[0.2em] font-normal" style={{ WebkitTextStroke: '0.5px black' }}>FREQUENCY</span>
                </div>

                <div className="flex gap-8 items-center">
                    <ShoppingBag className="w-5 h-5 hover:text-mycelium-gold transition-colors" />
                </div>
            </nav>

            {/* Section 1: Cinematic Intro Spacer & Title Reveal */}
            <section className="relative h-[150vh] w-full pointer-events-none">
                {/* 3D Title is now in CinematicIntro Canvas */}
                
                {/* Audio Enable Button (Pointer events enabled) */}
                <div className="absolute top-[60%] left-1/2 -translate-x-1/2 pointer-events-auto z-50">
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleStartExperience(); }}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white/80 px-6 py-2 rounded-full text-xs uppercase tracking-widest transition-all hover:scale-105"
                        >
                            Enable Audio
                        </button>
                </div>
            </section>

            {/* Section 2: The Sonic Infusion (Process) */}
            <motion.section
                style={{ opacity: bgOpacity }}
                className="relative z-10 w-full min-h-[80vh] flex items-center justify-center py-24 bg-black/20 backdrop-blur-sm"
            >
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="font-cinzel text-2xl md:text-3xl text-white mb-8 tracking-wide">The Sonic Infusion</h2>
                    <p className="font-playfair text-xl md:text-3xl text-white/80 leading-relaxed italic mb-12">
                        &quot;The Mushrooms don’t Work for Us. We Work for Them.&quot;
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <div className="space-y-3">
                            <Waves className="w-8 h-8 text-mycelium-gold" />
                            <h3 className="font-serif text-lg text-white">Grown as Medicine</h3>
                            <p className="text-sm text-white/60 leading-relaxed">Fungi are sentient beings. We treat them with reverence, growing them in clean, high-vibration spaces.</p>
                        </div>
                        <div className="space-y-3">
                            <Disc className="w-8 h-8 text-mycelium-gold" />
                            <h3 className="font-serif text-lg text-white">432Hz Infusion</h3>
                            <p className="text-sm text-white/60 leading-relaxed">Every stage of cultivation is immersed in Solfeggio tones, chants, and nature sounds to harmonize the biological structure.</p>
                        </div>
                        <div className="space-y-3">
                            <Sprout className="w-8 h-8 text-mycelium-gold" />
                            <h3 className="font-serif text-lg text-white">Nature & Nurture</h3>
                            <p className="text-sm text-white/60 leading-relaxed">&quot;Same genetics, different frequency = different outcome.&quot; We refine unique strains through our in-house cultivation.</p>
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
                            <span className="text-white/60 border-b border-white/20 pb-0.5">142 Reviews</span>
                        </div>

                        <h2 className="text-5xl md:text-7xl font-serif mb-6 leading-[1.1] text-white">
                            Calm Dose<span className="text-mycelium-gold">.</span>
                        </h2>

                        <p className="text-lg text-white/70 leading-relaxed mb-6 font-light">
                            A wellness supplement formulated with functional mushroom fruiting bodies to support everyday calm and balance.
                        </p>
                        <p className="text-sm text-white/50 leading-relaxed mb-10 font-mono">
                            Grown in a 432Hz sound chamber. This is not just a supplement—it is biological resonance.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            {["Anxiety Relief", "Mental Clarity", "Sleep Support", "100% Organic"].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                                    <div className="w-5 h-5 rounded-full bg-[#E6F5EC] flex items-center justify-center text-[#009E60]">
                                        <Check className="w-3 h-3" />
                                    </div>
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-white/10 mb-8">
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
