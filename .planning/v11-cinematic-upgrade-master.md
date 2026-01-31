# Cinematic Intro V11: Master Implementation Plan
**Status:** Planning / Research Complete
**Methodology:** Chain of Verification (CoV)

---

## I. Requirements & Vision Extraction
*   **The "Space Sunrise" (God Rays):**
    *   *Visual:* Deep space darkness -> Thin horizontal line of light -> Volumetric beams piercing the void.
    *   *Constraint:* Must be audio-reactive. Voice increases beam intensity.
*   **"Liquid Justice" (Magnetic Particle Physics):**
    *   *Visual:* Explosion is fluid, not linear. Particles follow curved, swirling "magnetic field" paths.
    *   *Constraint:* Remove the "computer-generated" feel. High-fidelity motion.
*   **"The Glass Lens" (Chromatic Aberration):**
    *   *Visual:* RGB channel splitting on high-energy events. Sub-pixel precision.
    *   *Constraint:* React to Bass and Explosion.

---

## II. Verification Chain (Technical Mapping)

### Feature 1: The Space Sunrise (God Rays)
**Hypothesis:** A standard radial blur post-processing pass will work.
**Verification:** 
- *Check:* Does it look like a sunrise? 
- *Correction:* A standard radial blur is circular. A "Space Sunrise" requires an **anamorphic bias** (horizontal stretch) and a high-energy "Hot Spot" at the horizon line.
- *Plan:* Use a dual-pass Bloom + Radial Blur.
    - Pass A: Render Text + White Horizontal Plane (The Sunrise Line) to a mask.
    - Pass B: Apply a "Crepuscular Ray" shader with `exposure` and `decay` uniforms.
    - Pass C: Additive blend with the main scene.

### Feature 2: Magnetic Liquid Physics (Curl Noise)
**Hypothesis:** Just add a `noise` function to the Vertex position.
**Verification:** 
- *Check:* Will it look like liquid? 
- *Correction:* Perlin/Simplex noise looks like "jitter." True liquid flow requires **Curl Noise** (the mathematical curl of a 3D potential field). This ensures "incompressibility" (particles don't clump or vanish, they flow).
- *Plan:* 
    - Implement a `curlNoise` function in `silverParticleVertex`.
    - Use `uMorph` to transition from Static -> Flowing -> Big Bang.
    - Add `uAudioFreq` to the noise scale to "ripple" the flow when spoken to.

### Feature 3: The Sub-Pixel Glass Lens
**Hypothesis:** Use a simple RGB split shader.
**Verification:** 
- *Check:* Does it feel "world-class"? 
- *Correction:* Constant RGB splitting looks cheap. It needs **Chromatic Aberration coupled with Lens Distortion** (barrel distortion) and **Vignetting**. 
- *Plan:*
    - Calculate `distortion` based on `length(uv - 0.5)`.
    - Scale `distortion` by `audio.bass`.
    - Offset UVs: `uvR = uv * (1.0 + amount)`, `uvB = uv * (1.0 - amount)`.

---

## III. Detailed Logic & Pseudocode

### 1. `silverParticleVertex` (Liquid Upgrade)
```glsl
// Potential field for magnetic lines
vec3 potential(vec3 p) {
    return vec3(
        snoise(p.xyz * 0.1 + uTime * 0.05),
        snoise(p.yzx * 0.1 + uTime * 0.05),
        snoise(p.zxy * 0.1 + uTime * 0.05)
    );
}

// Curl of the potential field = Velocity field
vec3 curl(vec3 p) {
    float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    
    vec3 p_x0 = potential(p - dx); vec3 p_x1 = potential(p + dx);
    vec3 p_y0 = potential(p - dy); vec3 p_y1 = potential(p + dy);
    vec3 p_z0 = potential(p - dz); vec3 p_z1 = potential(p + dz);
    
    return vec3(
        (p_z1.y - p_z0.y) - (p_y1.z - p_y0.z),
        (p_x1.z - p_x0.z) - (p_z1.x - p_z0.z),
        (p_y1.x - p_y0.x) - (p_x1.y - p_x0.y)
    ) / (2.0 * e);
}

void main() {
    // ...
    vec3 forceField = curl(currentPos * 0.2);
    // Add magnetic flow to the explosion
    currentPos += forceField * uMorph * uVoiceSensitivity; 
}
```

### 2. `CinematicPostPass` (Post-Processing Master)
```glsl
void main() {
    vec2 uv = vUv;
    float dist = length(uv - 0.5);
    
    // 1. Lens Distortion
    vec2 distortedUV = uv + (uv - 0.5) * dist * dist * uLensPower * uBass;
    
    // 2. Chromatic Aberration
    float r = texture2D(tDiffuse, distortedUV + vec2(uAmount * uBass, 0.0)).r;
    float g = texture2D(tDiffuse, distortedUV).g;
    float b = texture2D(tDiffuse, distortedUV - vec2(uAmount * uBass, 0.0)).b;
    
    // 3. Vignette (Space Focus)
    float vignette = smoothstep(0.8, 0.2, dist);
    
    gl_FragColor = vec4(vec3(r, g, b) * vignette, 1.0);
}
```

---

## IV. Verification Plan (Pre-Implementation)
1.  [ ] **Visual Regression:** Run dev server, confirm Cymatics are back (DONE).
2.  [ ] **Performance Check:** Verify that 3 post-processing passes don't drop below 60fps on mobile.
3.  [ ] **Audio Verification:** Confirm `useMicAudio` returns clean 0-1 values for `bass` and `mid`.

---

## V. Execution Steps
1.  **Phase 1:** Implement `CinematicPostPass` (Post-processing) - *The "Lens"*.
2.  **Phase 2:** Update `silverParticleVertex` with Curl Noise - *The "Flow"*.
3.  **Phase 3:** Setup `GodRays` pass with Occlusion Scene - *The "Light"*.
