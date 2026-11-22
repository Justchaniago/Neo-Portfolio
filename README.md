# chaniago.me (`neo-portfolio`)

Interactive, mobile-first portfolio of **Just Chaniago** — Founder of Chaniago Labs, Creative Developer, and Systems Architect based in Surabaya, Indonesia.

## Key Highlights

- **Three-Stage Splash Intro**: SVG glyph meniscus reveal (`justchaniago`), identity shift to `chaniago.me`, and full-resolution circular portal handoff.
- **Interactive WebGL & 2D Canvas**:
  - Custom Three.js shader particle ring (`AntigravityHalo`) with Poisson-disc distribution and analytical pointer tracking.
  - Starburst streaks shorten into a night sky and gather into a slowly rotating globe. Two lines travel clockwise along its rim with scroll, which then scatters the grains before they settle into Indonesia on black, without a location pin. The map then spirals into one grain, which opens as a white disc into the closing tagline.
- **Card-Stack Overlay Navigation**: Smooth GSAP-driven sheet transitions (`StackSection`) for `Projects`, `About`, and `Contact` alongside a `Cmd/Ctrl + K` Command Palette.
- **Adaptive Performance Engine (`src/lib/performanceTier.ts`)**: Hardware/WebGL capability detection + real-time FPS monitoring that dynamically scales DPR, shader density, canvas resolution, and compositor filters across Chrome, Safari, and Windows/macOS devices.

## Project Structure

```text
neo-portfolio/
├── docs/
│   ├── MOBILE_GUIDE.md          # Mobile-first & animation acceptance criteria
│   └── TECH_STACK.md            # Architecture & technology reference
├── public/
│   ├── audio/                   # Ambient audio loop asset
│   ├── fonts/                   # Display wordmark font (DRUNKFONTS)
│   ├── maps/                    # Preprocessed Natural Earth land polygons
│   ├── hero-justchaniago.png
│   └── hero-justchaniago-left.png
├── scripts/
│   └── prepare-globe-data.mjs   # GeoJSON-to-compact polygon preprocessor
└── src/
    ├── app/                     # Next.js App Router root layout, page, metadata & styles
    ├── components/
    │   ├── ambient/             # Web Audio API harmonic synthesizer & waveform toggle
    │   ├── animations/          # AntigravityHalo (Three.js) & InteractionBurst
    │   ├── command/             # Keyboard-first Command Palette (Cmd/Ctrl + K)
    │   ├── cursor/              # Context-aware custom cursor
    │   ├── header/              # Header logo timeline, desktop nav & mobile drawer
    │   ├── hero/                # Dual-layer iris portrait & curved mobile Saturn tagline
    │   ├── hud/                 # Spatial scroll chapter indicator
    │   ├── layout/              # Reusable draggable/animated StackSection sheet
    │   ├── narrative/           # Narrative scatter, radial burst, point globe & footer reveal
    │   ├── pages/               # About & Contact card-stack experiences
    │   ├── projects/            # Interactive project rail & detail showcase
    │   └── splash-screen/       # Three-stage splash screen & portal reveal
    └── lib/
        └── performanceTier.ts   # Dynamic device capability & real-time FPS tiering
```

## Development

```bash
# Start development server
npm run dev

# Run ESLint
npm run lint

# Create production build
npm run build
```

## Documentation

- [Mobile & Animation Guide](docs/MOBILE_GUIDE.md)
- [Tech Stack & Architecture](docs/TECH_STACK.md)
