# 🚀 Neo-Portfolio: Tech Stack & Architecture Document

Dokumen ini berisi rincian *tech stack*, arsitektur animasi, dan panduan pengembangan portofolio modern berkinerja tinggi (*high-performance & interactive portfolio*).

---

## 🛠️ Core Tech Stack

| Kategori | Teknologi | Deskripsi & Peran |
| :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | React framework modern dengan Server-Side Rendering (SSR) & Static Site Generation (SSG) untuk performa & SEO maksimal. |
| **Language** | **TypeScript** | Memastikan keamanan tipe data (*type safety*), autocompletion yang handal, serta kode yang lebih bersih & mudah di-maintain. |
| **Styling** | **Tailwind CSS** | Utility-first CSS framework untuk pengkodean style yang cepat, konsisten, dan responsif. |
| **UI Components** | **Lucide React / Shadcn UI** | Set ikon modern dan pustaka komponen yang fleksibel & accessible. |

---

## 🎭 Animation & Graphics Stack

| Kategori | Library | Kegunaan |
| :--- | :--- | :--- |
| **UI & Micro-Interactions** | **Framer Motion** | Animasi komponen UI, hover effects, enter/exit transitions, dan gestures (drag/tap). |
| **Complex Scroll & Timelines** | **GSAP (GreenSock) + ScrollTrigger** | Animasi kompleks berbasis scroll, masking effect, pinning section, dan timeline beruntun. |
| **Smooth Scrolling** | **Lenis Scroll (@studio-freight/lenis / lenis)** | Memberikan efek *inertia/smooth scroll* kelas atas layaknya website Apple atau Awwwards. |
| **3D & Graphics (Optional)** | **Three.js / React Three Fiber / Canvas** | Pengolahan objek 3D interaktif, particle background, dan shader effects. |

---

## 📁 Struktur Direktori Proyek

```text
neo-portfolio/
├── docs/
│   └── TECH_STACK.md          # Dokumen Arsitektur & Tech Stack (File Ini)
├── src/
│   ├── app/                   # Next.js App Router (Pages, Layout, API)
│   ├── components/            # Komponen Modular UI
│   │   ├── ui/                # Base UI (Button, Card, Input)
│   │   ├── animations/        # Reusable Animation Wrappers
│   │   ├── loading/           # Loading / Preloader Screen (Part 1)
│   │   ├── header/            # Navbar & Header (Part 2)
│   │   └── sections/          # Hero, About, Projects, Contact
│   ├── hooks/                 # Custom React Hooks (Scroll, Window Size, dll)
│   ├── lib/                   # Utility & Helper Functions (GSAP config, utils)
│   └── styles/                # Global Styles & Custom CSS Variables
├── public/                    # Assets (Gambar, Font, SVG, 3D Models)
├── tailwind.config.ts         # Konfigurasi Tailwind CSS
├── tsconfig.json              # Konfigurasi TypeScript
└── package.json               # Dependensi & Script Proyek
```

---

## 🛣️ Roadmap Pengembangan (Part per Part)

1. **Part 1: Setup & Custom Preloader (Loading Screen)**
   - Animasi angka / logo reveal menggunakan Framer Motion / GSAP.
   - Smooth exit transition setelah ketersediaan halaman terverifikasi.
2. **Part 2: Interactive Header & Navigation Bar**
   - Sticky Glassmorphism Header.
   - Mobile Hamburger Menu dengan Staggered Animation.
   - Dark/Light mode toggle (jika diperlukan).
3. **Part 3: Hero Section & Smooth Scroll Integration**
   - Integrasi Lenis Smooth Scroll.
   - Animasi kemunculan teks hero (Split text effect).
4. **Part 4: Interactive Work/Project Showcase**
   - Cards dengan efek hover 3D / Parallax scroll.
5. **Part 5: Skills, About, & Contact Section**
6. **Part 6: Optimization & Deployment (Vercel)**
