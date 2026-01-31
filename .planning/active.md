# Active Task
**Phase:** 01-cinematic-upgrade
**Step:** 3 (Title Refactor 2.0 - WebGL)

## Current Context
The user rejected the 2D SVG bend ("flat") and the "weak" shimmer.
Target: "Universal Studios" 3D orbit bend + High-energy noise-based shimmer.
Solution: Move Title into the 3D Scene (`CinematicIntro`) using a custom ShaderMaterial on a Bent Plane or Troika Text.

## Todo
- [ ] Create `shaders/title/shimmerTitle.ts`: Custom shader with `uBend`, `uShimmer`, `uNoise`.
- [ ] Update `CinematicIntro` in `app/v11/page.tsx`:
    - Remove `<CurvedTitle />` (DOM).
    - Add `ThreeTitle` mesh to the scene.
    - Implement Vertex Shader bending (`position.z -= pow(uv.x - 0.5, 2.0) * uBend`).
    - Implement Fragment Shader noise shimmer.
- [ ] Verify "Universal" curve feel.
