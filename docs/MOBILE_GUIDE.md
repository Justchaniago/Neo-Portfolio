# Mobile & Animation Guide

## Scope

Mandatory project guidance for all existing and future UI, including splash screens, navigation, content, overlays, and transitions. Design for mobile first, then expand to tablet and desktop. This guide defines acceptance requirements; it does not claim existing components have passed them.

## Layout and interaction

- Support widths from 320 CSS px upward, portrait and landscape. Avoid unintended horizontal scrolling and clipped text at intermediate sizes, not only named breakpoints.
- Use fluid typography, bounded content widths, and responsive spacing. Account for the complete wordmark and glyph overhangs, including the left edge and descender of `j`.
- Keep touch controls comfortably spaced with at least 44 × 44 CSS px interactive areas as the project target. Essential actions must work without hover and remain keyboard accessible with visible focus.
- Respect safe-area insets for controls near screen edges. Fullscreen backgrounds must cover the viewport when browser chrome expands/collapses; choose dynamic viewport sizing deliberately.
- Preserve readability and access to content with enlarged text and browser zoom. Never disable user zoom.
- Overlays must not permit accidental interaction with covered content. Any scroll/focus restrictions must be released when the overlay exits or unmounts.

## Animation

- Preserve the same visual concept on mobile. Adapt distances, sizes, and motion intensity to available space rather than shrinking a desktop composition indiscriminately.
- Measure geometry after the intended font is ready. Recalculate affected geometry on resize/orientation changes without restarting the whole intro or leaving stale masks.
- Use a single coordinated timeline for dependent stages. Clean up timelines, observers, listeners, animation frames, and timers on unmount; prevent duplicate playback under React Strict Mode.
- Prefer transform/opacity for ordinary motion. Circular reveals may use `clip-path`, but their smoothness must be checked on mobile; build success is insufficient.
- Avoid extreme scaling of tiny rasterized layers or text. Do not add blur, glow, or costly effects without an explicit design decision and mobile verification.
- Avoid per-frame layout reads when geometry can be cached. Limit animated elements and apply `will-change` only during active animation.
- Honor `prefers-reduced-motion`, including changes while the page is open. Provide a direct, usable final state without mandatory motion.
- Loading failures must not leave an opaque splash blocking the site indefinitely. Distinguish decorative intro timing from actual page readiness.

## Accepted splash baseline

1. Black background; `justchaniago` uses alternating vertical masked reels. Characters stay upright, slow down together, and land together. No blur or rotation.
2. `chaniago` shifts while `just` exits its own mask. The dot appears; `me` arrives from the right with a small, single impact/settle.
3. After a 650 ms hold, a white fullscreen layer is revealed from the dot using a growing circle over 1.45 seconds. Text stays at its original scale. The circle must cover the farthest viewport corner before splash removal.

Reel, prefix-exit, suffix-entry, and circular-reveal masks have separate responsibilities. Intentional clipping during entrance/exit is allowed; glyphs must be whole in their settled state, and horizontal overhangs must not be accidentally clipped. Reduced-motion goes directly to the main page.

## Verification gate

For UI or animation changes, inspect affected states and transitions in a browser:

| Viewport (CSS px) | Purpose |
| --- | --- |
| 320 × 568 | Small mobile, clipping and fit |
| 390 × 844 | Typical mobile portrait |
| 844 × 390 | Mobile landscape and short viewport |
| 768 × 1024 | Tablet |
| 1440 × 900 | Desktop regression |

- Check intermediate widths, orientation/resize during animation, final alignment, mask boundaries, touch interactions, and handoff to the page.
- Check reduced-motion and slow/failed font loading. Verify content becomes accessible after the intro.
- For significant animation changes, inspect playback in iOS Safari and Android Chrome where available. Desktop emulation is useful but does not prove real-device smoothness.
- Run lint/build when appropriate to the change. Report visual checks separately: browser, viewport, observed result, and any checks unavailable in the environment.
- Do not label work fully mobile-verified when browser/device checks were not performed. Unavailable checks remain explicit acceptance gaps.
