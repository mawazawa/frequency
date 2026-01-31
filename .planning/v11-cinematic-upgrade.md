# Cinematic Intro V11 Upgrade Plan

## Overview
This plan details the implementation of three high-fidelity visual enhancements for the `frequency-design-lab` intro sequence. The goal is to move from a "digital" aesthetic to a "cinematic/physical" one using advanced shader techniques.

## 1. "God Rays" in Space (Volumetric Light)
**Concept:** A dramatic sunrise effect where the "God is" text (and the subsequent explosion) casts visible beams of light through a virtual medium (space dust/fog).

### Implementation Strategy: Post-Processing Occlusion (Crepuscular Rays)
Instead of expensive true volumetric fog, we will use a "Light Scattering" post-processing pass.

1.  **Occlusion Scene:** Render the scene to an off-screen buffer where all "light emitting" objects (Text) are white and occluders are black.
2.  **Radial Blur:** Apply a heavy radial blur shader to this buffer, centered on the light source.
3.  **Composite:** Addively blend the blurred rays back onto the main scene.

**Pseudocode (Fragment Shader - VolumetricLightShader):**
```glsl
uniform sampler2D tDiffuse; // Occlusion texture
uniform vec2 lightPositionOnScreen;
uniform float density;
uniform float weight;
uniform float decay;

void main() {
    vec2 uv = vUv;
    vec2 deltaTextCoord = uv - lightPositionOnScreen;
    deltaTextCoord *= 1.0 / float(NUM_SAMPLES) * density;
    
    vec4 color = texture2D(tDiffuse, uv);
    float illuminationDecay = 1.0;
    
    for(int i=0; i < NUM_SAMPLES; i++) {
        uv -= deltaTextCoord;
        vec4 sample = texture2D(tDiffuse, uv);
        sample *= illuminationDecay * weight;
        color += sample;
        illuminationDecay *= decay;
    }
    gl_FragColor = color;
}
```

**Integration:**
-   Use `EffectComposer`.
-   Pass 1: Render Main Scene.
-   Pass 2: Render Occlusion (Text only, everything else Black).
-   Pass 3: Apply Volumetric Shader to Pass 2.
-   Pass 4: Additive Blend Pass 3 + Pass 1.

## 2. "Liquid Justice" Particle Physics (Curl Noise)
**Concept:** The Big Bang explosion currently moves particles linearly (`mix(a, b, progress)`). To feel organic, particles should flow like fluid or smoke, following invisible magnetic field lines.

### Implementation Strategy: Vertex Displacement with Curl Noise
We will enhance the existing `silverParticleVertex` shader.

1.  **Curl Noise Function:** Import a GLSL `curlNoise` function (derivative of simplex noise).
2.  **Velocity Field:** Calculate a velocity vector based on the particle's position and time.
3.  **Explosion Logic:** Instead of a linear mix, we add this curl velocity to the position, scaled by the explosion progress.

**Pseudocode (Vertex Shader):**
```glsl
// Import snoise and curlNoise...

void main() {
    // ... existing logic ...
    
    if (uMorph > 0.0) {
        // Calculate organic turbulence
        vec3 turbulence = curlNoise(position * 0.5 + uTime * 0.1);
        
        // Apply to the linear trajectory
        // The morph is still A -> B, but we displace the path
        vec3 linearPos = mix(position, linePosition, easeOutExpo(progress));
        
        // Add swirl based on progress (peak in middle of flight)
        float swirlInfluence = sin(progress * 3.14);
        currentPos = linearPos + turbulence * swirlInfluence * 5.0; 
    }
}
```

## 3. "Sub-Pixel" Chromatic Aberration (Glass Lens)
**Concept:** Simulate the imperfections of a physical camera lens, especially during high-energy events (Audio peaks, Explosion).

### Implementation Strategy: Custom Shader Pass
A post-processing shader that separates RGB channels radially.

**Pseudocode (Fragment Shader - ChromaticAberration):**
```glsl
uniform sampler2D tDiffuse;
uniform float uDistortion; // Coupled to Audio + Explosion Force

void main() {
    vec2 uv = vUv;
    vec2 dist = uv - 0.5;
    
    // Red channel distorts OUT, Blue channel distorts IN
    vec2 rOffset = dist * uDistortion * 0.02;
    vec2 bOffset = dist * uDistortion * -0.01;
    
    float r = texture2D(tDiffuse, uv + rOffset).r;
    float g = texture2D(tDiffuse, uv).g; // Green stays anchor
    float b = texture2D(tDiffuse, uv + bOffset).b;
    
    gl_FragColor = vec4(r, g, b, 1.0);
}
```

**Reactivity:**
-   `uDistortion` = Base (0.1) + AudioBass (2.0) + ExplosionForce (5.0).
-   This ensures the "lens" shakes and refracts when the bass hits or the big bang happens.

## Execution Order
1.  **Chromatic Aberration:** Easiest to add, huge impact. (File: `components/effects/ChromaticAberration.tsx`)
2.  **Liquid Justice:** Shader tweak, high visual reward. (File: `app/v11/page.tsx`)
3.  **God Rays:** Most complex (requires render target setup), save for final polish.
