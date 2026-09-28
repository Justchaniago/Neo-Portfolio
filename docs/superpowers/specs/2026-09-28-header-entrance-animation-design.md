# Header Entrance Animation Redesign: Soft Elevate & Fade

## Overview
Update the header entrance animation for logo characters (`justchaniago`) and nav links (`project`, `about`, `contact`) from a drop-from-above motion (`translateY(-115%)`) to a subtle soft-elevate & fade motion (`translateY(10px)` to `translateY(0)` with `opacity: 0` to `1`), matching the overall design system established by the hero copy and page elements.

## Proposed Changes

### 1. CSS Keyframe & Initial State Update in `HeaderLogo.module.css`

- Change initial transform for `.entranceChar` and `.navChar`:
  - Current: `transform: translateY(-115%); opacity: 0;`
  - Proposed: `transform: translateY(10px); opacity: 0;`

- Update `@keyframes headerCharEntrance`:
  - Current:
    ```css
    @keyframes headerCharEntrance {
      from { opacity: 0; transform: translateY(-115%); }
      to { opacity: 1; transform: translateY(0); }
    }
    ```
  - Proposed:
    ```css
    @keyframes headerCharEntrance {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    ```

### 2. Preservation of Existing Contracts & Features

- **Timing & Stagger Delays:** Keep existing animation durations and stagger delays unchanged:
  - Logo characters: `620ms cubic-bezier(0.16, 1, 0.3, 1)` with delay `calc(560ms + var(--char-index, 0) * 28ms)`
  - Nav characters: `560ms cubic-bezier(0.16, 1, 0.3, 1)` with delay `calc(1050ms + var(--char-index, 0) * 24ms)`
- **Trigger:** Triggered strictly when `html[data-splash-complete="true"]` is present.
- **Accessibility:** Maintain `prefers-reduced-motion: reduce` behavior (`opacity: 1; transform: none; animation: none;`).
- **Layout & Structure:** No HTML, JS logic, or layout dimensions modified.

## Verification Checklist

1. Verify build with `npm run build` or `npx next build`.
2. Verify visual appearance on key viewports specified in `docs/MOBILE_GUIDE.md`:
   - Mobile portrait (390 × 844)
   - Mobile landscape (844 × 390)
   - Desktop (1440 × 900)
3. Confirm reduced-motion override operates correctly without animation.
