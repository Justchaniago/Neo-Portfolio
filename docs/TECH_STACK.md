# Neo-Portfolio: Tech Stack & Architecture

Dokumen ini merangkum *tech stack*, arsitektur komponen, dan sistem optimasi performa pada **chaniago.me (`neo-portfolio`)**.

Semua UI dan animasi wajib mengikuti [Mobile & Animation Guide](MOBILE_GUIDE.md) untuk aturan *mobile-first*, baseline splash screen, aksesibilitas (`prefers-reduced-motion`), dan standar verifikasi.

---

## Core Tech Stack

| Kategori | Teknologi | Peran |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Routing, metadata/OG image generation, dan optimasi bundle produksi. |
| **UI Library** | **React 19 + TypeScript 5** | Komponen interaktif dengan *strict typing* dan manajemen lifecycle DOM/Canvas. |
| **Styling** | **Tailwind CSS v4 + CSS Modules** | Layout dasar dengan Tailwind v4 serta isolasi animasi spesifik menggunakan CSS Modules. |
| **Icons** | **Lucide React** | Ikon UI ringan untuk navigasi, Command Palette, dan tautan eksternal. |

---

## Animation, Audio & Graphics Stack

| Kategori | Teknologi | Kegunaan |
| :--- | :--- | :--- |
| **Timelines & Transitions** | **GSAP 3** | Timeline splash screen, iris reveal pada potret hero, transisi *card-stack* (`Projects`, `About`, `Contact`), dan wordmark footer. |
| **Smooth Scrolling** | **Lenis** | *Smooth wheel/touch scrolling* dengan sinkronisasi *scroll lock* saat overlay atau mode baca aktif. |
| **WebGL Shader** | **Three.js** | `AntigravityHalo` — ribuan partikel *Poisson-disc* dengan custom vertex/fragment shader dan proyeksi kursor analitis. |
| **2D Canvas Engines** | **HTML5 Canvas 2D** | `radialBurst` (warp bintang), `AsciiGlobeSection` + `asciiSweep` (proyeksi bola dunia ke peta Indonesia), dan transisi piksel potret mobile. |
| **Web Audio** | **Web Audio API** | `AmbientToggle` — visualisasi gelombang *real-time* (`AnalyserNode`) dan sintesis efek suara UI pentatonik. |
| **Adaptive Performance** | **`performanceTier.ts`** | Deteksi kapabilitas GPU/CPU/Browser (Chrome, Safari WebKit, Windows) + pemantauan FPS *real-time* untuk menyesuaikan DPR, kepadatan partikel, dan efek *filter/blur*. |

---

## Struktur Direktori

```text
neo-portfolio/
├── docs/
│   ├── MOBILE_GUIDE.md          # Panduan wajib responsive & animasi mobile-first
│   └── TECH_STACK.md            # Dokumen arsitektur & tech stack
├── public/
│   ├── audio/                   # Track audio ambient (ambient.mp3)
│   ├── fonts/                   # Font display wordmark (DRUNKFONTS-Regular.otf)
│   ├── maps/                    # Data poligon bumi ringkas (earth.json)
│   ├── hero-justchaniago.png
│   └── hero-justchaniago-left.png
├── scripts/
│   └── prepare-globe-data.mjs   # Script pemroses GeoJSON ke earth.json
└── src/
    ├── app/
    │   ├── globals.css          # Konfigurasi font, variabel root, dan style dasar
    │   ├── Home.module.css      # Style spesifik halaman utama / Hero
    │   ├── icon.svg             # Favicon aplikasi
    │   ├── layout.tsx           # Root layout (SplashScreen, Header, CustomCursor, CommandPalette, SpatialHud)
    │   ├── opengraph-image.tsx  # Dynamic OpenGraph image generator
    │   └── page.tsx             # Halaman utama & orkestrasi Lenis scroll
    ├── components/
    │   ├── ambient/             # Pemutar audio ambient & visualisasi gelombang SVG
    │   ├── animations/          # AntigravityHalo (Three.js) & InteractionBurst
    │   ├── command/             # Command Palette (Cmd/Ctrl + K)
    │   ├── cursor/              # Custom cursor kontekstual
    │   ├── header/              # Header utama, animasi logo, navigasi desktop & mobile
    │   ├── hero/                # HeroPortrait (iris reveal) & CurvedMobileTagline
    │   ├── hud/                 # SpatialHud (indikator chapter scroll)
    │   ├── layout/              # StackSection (komponen sheet/card-stack)
    │   ├── narrative/           # NarrativeSection, AsciiGlobeSection, TaglineSection, & Footer
    │   ├── pages/               # StaticPagesExperience (About & Contact)
    │   ├── projects/            # ProjectsExperience, ProjectRail, & ProjectDetails
    │   └── splash-screen/       # SplashScreen 3-tahap (glyph reveal, identity shift, portal)
    └── lib/
        └── performanceTier.ts   # Engine deteksi perangkat & adaptasi performa dinamis
```
