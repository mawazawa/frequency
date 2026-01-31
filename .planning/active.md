# Active Task
**Phase:** 01-cinematic-upgrade
**Step:** 2 (Title Refactor - SVG)

## Current Context
The user identified visual artifacts ("contour lines", "cropped Q") in the CSS-based title. They also requested a "Universal Studios" style bend.
We are migrating the main title to SVG to solve all three issues (Artifacts, Clipping, Bending) with "World Class" precision.

## Todo
- [x] Restore `Cinzel` font and `WebkitTextStroke` (Step 1).
- [x] Restore Indigo color and Rotation to Cymatics (Step 1).
- [ ] Create `components/cinematic/CurvedTitle.tsx` (SVG implementation).
- [ ] Implement `<textPath>` for the bend.
- [ ] Implement SVG Gradient for the shimmer (smoother than CSS).
- [ ] Replace `motion.h1` in `app/v11/page.tsx` with `CurvedTitle`.
