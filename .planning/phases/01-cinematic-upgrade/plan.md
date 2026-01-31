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

### Step 1.5: Title Refactor (SVG) - *Active*
- [ ] **Create Component:** `components/cinematic/CurvedTitle.tsx`
    - **Tech:** SVG, Framer Motion.
    - **Features:**
        - `<defs><linearGradient id="shimmer">`: Smooth stops to fix "contour lines".
        - `<path id="curve">`: A gentle arc (`M start Q control end`).
        - `<text><textPath href="#curve">`: Bends the text perfectly.
        - `stroke`: Apply stroke via SVG attributes (cleaner than CSS).
        - `viewBox`: Tall enough to show the full "Q".
- [ ] **Integration:**
    - Replace `motion.h1` in `app/v11/page.tsx`.

### Step 2: The Glass Lens (Post-Processing) - *Active*
- [ ] **Technical Specification:**
    - **Vertex Shader (Post-Pass):**
        ```glsl
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        ```
    - **Fragment Shader (LensDistortion):**
        ```glsl
        uniform sampler2D tDiffuse;
        uniform float uDistortion; // Coupled to Audio Bass
        uniform float uAberration; // RGB Split amount
        varying vec2 vUv;

        vec2 distort(vec2 uv, float k) {
            vec2 d = uv - 0.5;
            float r2 = dot(d, d);
            return uv + d * k * r2;
        }

        void main() {
            // Apply subtle barrel distortion
            vec2 distortedUV = distort(vUv, uDistortion);
            
            // Chromatic Aberration
            float r = texture2D(tDiffuse, distort(vUv, uDistortion + uAberration)).r;
            float g = texture2D(tDiffuse, distortedUV).g;
            float b = texture2D(tDiffuse, distort(vUv, uDistortion - uAberration)).b;
            
            // Vignette
            float vignette = smoothstep(0.8, 0.4, length(vUv - 0.5));
            
            gl_FragColor = vec4(vec3(r, g, b) * vignette, 1.0);
        }
        ```
- [ ] **Implementation Task:**
    - Refactor `CinematicIntro` to include `EffectComposer`.
    - Create `LensPass` object.
    - Connect `bass` level to `uDistortion` and `uAberration`.

### Step 3: Liquid Justice (Curl Noise) - *Active*
- [ ] **Technical Specification:**
    - **Curl Noise Algorithm:**
        ```glsl
        vec3 curl(vec3 p) {
            float e = 0.1;
            vec3 dx = vec3(e, 0.0, 0.0);
            vec3 dy = vec3(0.0, e, 0.0);
            vec3 dz = vec3(0.0, 0.0, e);
            
            // Sample potential field (Noise)
            vec3 p_x0 = noise3D(p - dx); vec3 p_x1 = noise3D(p + dx);
            vec3 p_y0 = noise3D(p - dy); vec3 p_y1 = noise3D(p + dy);
            vec3 p_z0 = noise3D(p - dz); vec3 p_z1 = noise3D(p + dz);
            
            // Return Curl (Velocity Field)
            return vec3(
                (p_z1.y - p_z0.y) - (p_y1.z - p_y0.z),
                (p_x1.z - p_x0.z) - (p_z1.x - p_z0.z),
                (p_y1.x - p_y0.x) - (p_x1.y - p_x0.y)
            ) / (2.0 * e);
        }
        ```
- [ ] **Implementation Task:**
    - Update `silverParticleVertex` shader.
    - Apply `curl` displacement during explosion.
    - Sync with `uVoice` for "shimmering" flow.

### Step 4: God Rays (The Sunrise)
- [ ] **Occlusion Scene:**
    - Render "God Is" text + a thin white horizon line to an off-screen buffer.
- [ ] **Compositing:**
    - Use `GodRaysEffect` (pmndrs) or custom radial blur.
    - Mask: Text is white, everything else black.
    - Blend: Additive.
