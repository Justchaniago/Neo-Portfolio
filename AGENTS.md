<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules: mobile-first

All existing and future UI, pages, components, and animations must be mobile-friendly. This is a required acceptance criterion, not optional polish.

- Read and follow [Mobile & Animation Guide](docs/MOBILE_GUIDE.md) before UI or animation work. This document is the single source of truth for responsive requirements and verification.
- Preserve the accepted three-stage splash: alternating masked reels, transition to `chaniago.me`, then white circular reveal. Adapt its geometry for mobile without removing stages unless explicitly requested; reduced-motion is the accessibility exception.
- Repository setup, commits, and publishing must not change UI or animation behavior unless the user requests those changes.
- A successful lint/build does not prove mobile usability or smooth animation. Report the viewports/browsers actually checked and explicitly identify unverified behavior.
