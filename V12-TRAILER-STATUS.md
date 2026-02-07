# V12 Trailer Status Report
**Date:** February 1, 2026 — 2:40 PM PST  
**Tested by:** Clawd (automated sub-agent)

---

## Summary

🔴 **The v12 trailer is NOT working on production.** The deployed code is a stale version that predates the trailer integration. The trailer components exist locally and compile, but Vercel is serving an older build.

---

## Checklist Results

| Check | Status | Details |
|-------|--------|---------|
| Page loads | ✅ | https://frequencycaps.vercel.app/v12 loads without errors |
| Audio file deployed | ✅ | `/audio/frequency_trailer_v1.mp3` returns HTTP 200, valid MP3 |
| TrailerIntro renders | ❌ | **Not rendering** — deployed version has OLD mic-enable overlay |
| "Skip Intro" button | ❌ | Not present (old overlay has "Continue without audio →" instead) |
| Cymatics/shader visualization | ✅ | Three.js particles + bloom post-processing working |
| Console errors | ✅ | No errors in browser console |

---

## Root Cause Analysis

### The deployed v12 is running STALE code

**Local git state:** `HEAD` at commit `0ed7999` ("match v14 hero font to logo")  
**`origin/main`:** Same commit — local and remote are in sync.

**Commit history (newest first):**
```
0ed7999  2026-02-01 13:46  match v14 hero font to logo (v14 only)
4ec8f87  2026-02-01 12:58  refine v12 intro overlay and hero sizing ← v12 TrailerIntro tweaks
4007b44  2026-02-01 11:39  refactor(v12): extract components, shaders, config; wire TrailerIntro ← THIS adds trailer to v12
d1fc51d  2026-02-01 06:42  feat: client voice review portal
8f6f3ea  2026-02-01 04:32  restore v12 to pre-trailer state — all trailer work is in v14 ← Vercel is serving THIS version
```

**What's deployed:** The `8f6f3ea` version, which has the old mic-enable overlay:
- "Find Your Frequency" 
- "This experience reacts to your voice and the sounds around you."
- `[Enable]` button (microphone icon)
- "Continue without audio →"

**What SHOULD be deployed (local code):** The refactored v12 with TrailerIntro:
- "Find Your Frequency"
- "This experience reacts to sound. Press play to begin the journey, or skip to explore on your own."
- `[▶ Play]` button (large circular)
- "Skip intro →"

### Why is Vercel stale?

The Vercel CDN response had `x-vercel-cache: HIT` and `age: 11196` (~3.1 hours). Possible reasons:
1. **Vercel auto-deploy may have failed silently** — the build compiles locally with zero errors, so this seems unlikely
2. **Vercel deployment queue** — commits were pushed but deployment hasn't completed
3. **CDN cache not invalidated** — Vercel edge is serving a stale static page

---

## Component Inventory (Local — All Present & Correct)

| File | Status | Notes |
|------|--------|-------|
| `app/v12/page.tsx` | ✅ | Imports & renders `<TrailerIntro>`, has `introPhase` state machine |
| `app/v12/components/TrailerIntro.tsx` | ✅ | Full component with play/skip, subtitle display, mushroom imagery |
| `app/v12/components/UIComponents.tsx` | ✅ | FontStyles, WaveIcon, GlassButton, ProductBottle, etc. |
| `app/v12/config.ts` | ✅ | MODES, Spring, smoothstep, QUIZ_QUESTIONS |
| `app/v12/shaders/unified.ts` | ✅ | Vertex/fragment shaders for cymatics + ether particles |
| `hooks/useTrailerAudio.ts` | ✅ | Audio hook with Web Audio API, subtitle sync, frequency data |
| `public/audio/frequency_trailer_v1.mp3` | ✅ | Deployed and accessible (HTTP 200) |

### Audio Path Resolution
- `useTrailerAudio.ts` creates: `new Audio('/audio/frequency_trailer_v1.mp3')`
- Public file exists at: `public/audio/frequency_trailer_v1.mp3`
- Production URL works: `https://frequencycaps.vercel.app/audio/frequency_trailer_v1.mp3` → 200 OK

### Import Chain
```
page.tsx → import TrailerIntro from './components/TrailerIntro'
page.tsx → import { useTrailerAudio } from '@/hooks/useTrailerAudio'
TrailerIntro.tsx → import { useTrailerAudio, SubtitleCue } from '@/hooks/useTrailerAudio'
```
`@/*` alias maps to `./` (verified in tsconfig.json). All imports resolve.

---

## V14 Status (For Comparison)

V14 (https://frequencycaps.vercel.app/v14) also has TrailerIntro wired in locally, but the deployed version shows a minimal "Tap to tune in" button — also appears to be a stale/different deployment.

---

## Fixes Needed (DO NOT APPLY — Documentation Only)

### Fix 1: Trigger fresh Vercel deployment
The code is correct locally. Just needs to be deployed.

Options:
- **Option A:** Push an empty commit to trigger rebuild: `git commit --allow-empty -m "trigger deploy" && git push`
- **Option B:** Go to Vercel dashboard → Deployments → Redeploy latest
- **Option C:** Run `vercel --prod` from the project directory (if Vercel CLI is installed)

### Fix 2: Verify deployment succeeds
After triggering, check:
1. Vercel deployment logs for build errors
2. Refresh `https://frequencycaps.vercel.app/v12` (hard refresh, bypass CDN)
3. Confirm TrailerIntro overlay appears with Play button and "Skip intro →"

### No code changes needed
- ✅ `next build` succeeds locally with exit code 0
- ✅ All components present and correctly wired
- ✅ Audio file deployed and accessible
- ✅ TypeScript compiles (with `ignoreBuildErrors: true` in next.config)

---

## Local Build Verification

```
$ npx next build
✓ Generating static pages (22/22)
Route (app)
├ ○ /v12     ← Static, no errors
├ ○ /v14     ← Static, no errors
Exit code: 0
```

---

## Testing Notes

- Browser: OpenClaw headless Chromium (no audio playback possible in headless)
- Audio playback couldn't be tested end-to-end — but the audio file is confirmed accessible and the Web Audio API code is structurally sound
- Subtitle sync relies on `requestAnimationFrame` loop checking `audio.currentTime` against `TRAILER_SUBTITLES` cue timings — this pattern is correct
