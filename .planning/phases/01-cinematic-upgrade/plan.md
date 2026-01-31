# Phase 01: Cinematic Upgrade (V11)

## Goal
Elevate the V11 Intro from "Digital Particle Demo" to "Cinema-Quality Simulation".

## Scope
1.  **Refine Basics:** Restore fonts (Cinzel, Thin) and Cymatics (Indigo, Rotation) after rollback.
2.  **The Glass Lens:** Add high-fidelity post-processing (Aberration, Distortion, Vignette).
3.  **Liquid Physics:** Replace linear explosion with Curl Noise flow.
4.  **God Rays:** Implement "Space Sunrise" volumetric lighting.

## Implementation Plan

### Step 1: Baseline Restoration (The Rollback Recovery)
- [ ] **Fonts:**
    - Target: `app/v11/page.tsx`
    - Action: Set "FREQUENCY" font to `Cinzel`, weight `normal`, `WebkitTextStroke: 1.5px` (Main) / `0.5px` (Header).
- [ ] **Cymatics:**
    - Target: `app/v11/page.tsx`
    - Action: Set `uColor2` to `(0.01, 0.02, 0.55)` (Indigo).
    - Action: Set `uParticleSize` to `3.5` (Visibility).
    - Action: Set `vDisplacement` scale to `0.5` (Controlled Reactivity).
    - Action: Add `fieldMesh.rotation.z` animation.

### Step 2: The Glass Lens (Post-Processing)
- [ ] **Create Component:** `components/effects/CinematicLens.tsx`
    - Use `EffectComposer` from `@react-three/postprocessing`.
    - Create Custom Shader `LensDistortionShader`.
    - Logic: RGB Split + Barrel Distortion + Vignette.
    - Inputs: `audio.bass` (for shake), `explosionProgress` (for shockwave).

### Step 3: Liquid Justice (Curl Noise)
- [ ] **Update Shader:** `app/v11/page.tsx` (`silverParticleVertex`)
    - Import `snoise` and `curlNoise` functions.
    - Calculate `vec3 flow = curlNoise(pos * 0.2 + time * 0.1)`.
    - Apply `pos += flow * uMorph * sensitivity`.

### Step 4: God Rays (The Sunrise)
- [ ] **Occlusion Scene:**
    - Render "God Is" text + a thin white horizon line to an off-screen buffer.
- [ ] **Compositing:**
    - Use `GodRaysEffect` (pmndrs) or custom radial blur.
    - Mask: Text is white, everything else black.
    - Blend: Additive.
