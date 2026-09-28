# Header Entrance Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign header logo and nav entrance animation from a drop-from-above motion (`translateY(-115%)`) to a subtle soft-elevate & fade motion (`translateY(10px)` to `translateY(0)` with `opacity: 0` to `1`).

**Architecture:** Modify CSS classes `.entranceChar`, `.navChar`, and `@keyframes headerCharEntrance` in `src/components/header/HeaderLogo.module.css` to update initial positions and keyframe transitions while preserving all trigger conditions, timing, stagger delays, responsive rules, and reduced motion settings.

**Tech Stack:** Next.js (App Router), React, CSS Modules.

## Global Constraints

- Preserve `html[data-splash-complete="true"]` activation trigger.
- Maintain existing animation timing and delays:
  - `.entranceChar`: `620ms cubic-bezier(0.16, 1, 0.3, 1)` delay `calc(560ms + var(--char-index, 0) * 28ms)`
  - `.navChar`: `560ms cubic-bezier(0.16, 1, 0.3, 1)` delay `calc(1050ms + var(--char-index, 0) * 24ms)`
- Maintain `prefers-reduced-motion` override.
- Follow mobile responsive requirements per `docs/MOBILE_GUIDE.md`.

---

### Task 1: Update CSS Keyframes and Initial Character Transform

**Files:**
- Modify: `src/components/header/HeaderLogo.module.css:39-42, 71-74`

**Interfaces:**
- Consumes: CSS Module classes `.entranceChar`, `.navChar`, and `@keyframes headerCharEntrance`.
- Produces: Soft elevate and opacity fade animation for logo and nav characters on entrance.

- [ ] **Step 1: Update `.entranceChar` and `.navChar` initial styles in `HeaderLogo.module.css`**

Replace lines 39-40:
```css
.entranceChar { transform: translateY(-115%); opacity: 0; }
.navChar { transform: translateY(-115%); opacity: 0; }
```
With:
```css
.entranceChar { transform: translateY(10px); opacity: 0; }
.navChar { transform: translateY(10px); opacity: 0; }
```

- [ ] **Step 2: Update `@keyframes headerCharEntrance` in `HeaderLogo.module.css`**

Replace lines 71-74:
```css
@keyframes headerCharEntrance {
  from { opacity: 0; transform: translateY(-115%); }
  to { opacity: 1; transform: translateY(0); }
}
```
With:
```css
@keyframes headerCharEntrance {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 3: Run build to ensure no CSS syntax or build errors**

Run: `npm run build`
Expected: Successful build output without CSS lint or compilation errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/components/header/HeaderLogo.module.css
git commit -m "feat(header): update entrance animation to soft elevate and fade"
```
