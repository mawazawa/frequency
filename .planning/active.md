# Active Task
**Phase:** 01-cinematic-upgrade
**Step:** 5 (Liquid Justice - Curl Noise Flow)

## Current Context
We have a 3D Bent Title and a physical Glass Lens effect. Now we need to replace the linear particle explosion with fluid "Liquid Justice" physics using Curl Noise.

## Todo
- [x] Create `components/effects/CinematicLens.tsx` (Integrated in `page.tsx`).
- [x] Implement `ChromaticAberration` shader (Integrated in `page.tsx`).
- [x] Hook up `useMicAudio` bass to the distortion strength.
- [ ] Implement `curlNoise` function in `silverParticleVertex`.
- [ ] Update explosion logic to follow fluid potential field.
- [ ] Connect `uVoice` to flow intensity.
